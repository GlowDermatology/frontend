import { describe, expect, it, vi } from "vitest";

import type { IssueAlerts } from "@/domain/delivery-issue";

import {
  ALERTS_PATH,
  backoff,
  fetchIssueAlerts,
  MAX_BACKOFF_MS,
  parseAlerts,
  POLL_INTERVAL_MS,
  startIssuePoll,
  type PollEnv,
  type PollOutcome,
} from "./issue-poll";

/** A hand-driven clock: `advance(ms)` runs the timers that fall due, in order. */
function fakeEnv() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const visibleListeners = new Set<() => void>();
  let hidden = false;
  const env: PollEnv = {
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (handle) => void timers.delete(handle as number),
    now: () => now,
    hidden: () => hidden,
    onVisible: (fn) => {
      visibleListeners.add(fn);
      return () => visibleListeners.delete(fn);
    },
  };
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  return {
    env,
    timers,
    async advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= until)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
        await flush();
      }
      now = until;
      await flush();
    },
    setHidden(value: boolean) {
      hidden = value;
      if (!value) for (const fn of visibleListeners) fn();
    },
    listeners: visibleListeners,
  };
}

const ALERTS: IssueAlerts = { open: 2, urgent: [] };
const ok = (): PollOutcome => ({ kind: "ok", alerts: ALERTS });

describe("startIssuePoll", () => {
  it("polls at once, then every 30 s", async () => {
    const clock = fakeEnv();
    const load = vi.fn(async () => ok());
    const onAlerts = vi.fn();
    const stop = startIssuePoll({ load, onAlerts, env: clock.env });
    await clock.advance(0);
    expect(load).toHaveBeenCalledTimes(1);
    expect(onAlerts).toHaveBeenCalledWith(ALERTS);
    await clock.advance(POLL_INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(1);
    await clock.advance(1);
    expect(load).toHaveBeenCalledTimes(2);
    await clock.advance(POLL_INTERVAL_MS * 3);
    expect(load).toHaveBeenCalledTimes(5);
    stop();
    await clock.advance(POLL_INTERVAL_MS * 3);
    expect(load).toHaveBeenCalledTimes(5);
    expect(clock.timers.size).toBe(0);
    expect(clock.listeners.size).toBe(0);
  });

  it("waits out the rest of the interval after a recent poll (a client navigation)", async () => {
    const clock = fakeEnv();
    const load = vi.fn(async () => ok());
    startIssuePoll({ load, onAlerts: vi.fn(), env: clock.env, firstDelayMs: 20_000 });
    await clock.advance(19_999);
    expect(load).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("backs off after failures, keeps the last values, and returns to 30 s after a success", async () => {
    const clock = fakeEnv();
    const outcomes: PollOutcome[] = [{ kind: "failed" }, { kind: "failed" }, ok(), ok()];
    const load = vi.fn(async () => outcomes.shift() ?? ok());
    const onAlerts = vi.fn();
    startIssuePoll({ load, onAlerts, env: clock.env });
    await clock.advance(0); // fail 1 → wait 60 s
    expect(onAlerts).not.toHaveBeenCalled();
    await clock.advance(59_999);
    expect(load).toHaveBeenCalledTimes(1);
    await clock.advance(1); // fail 2 → wait 120 s
    expect(load).toHaveBeenCalledTimes(2);
    await clock.advance(120_000); // ok → 30 s
    expect(load).toHaveBeenCalledTimes(3);
    expect(onAlerts).toHaveBeenCalledTimes(1);
    await clock.advance(30_000);
    expect(load).toHaveBeenCalledTimes(4);
    expect(backoff(0)).toBe(30_000);
    expect(backoff(1)).toBe(60_000);
    expect(backoff(10)).toBe(MAX_BACKOFF_MS);
  });

  it("treats a rejected load like a failed one", async () => {
    const clock = fakeEnv();
    const load = vi.fn(async (): Promise<PollOutcome> => {
      throw new Error("boom");
    });
    startIssuePoll({ load, onAlerts: vi.fn(), env: clock.env });
    await clock.advance(0);
    await clock.advance(60_000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("stops for good when the session ended", async () => {
    const clock = fakeEnv();
    const load = vi.fn(async (): Promise<PollOutcome> => ({ kind: "expired" }));
    const onExpired = vi.fn();
    startIssuePoll({ load, onAlerts: vi.fn(), onExpired, env: clock.env });
    await clock.advance(0);
    expect(onExpired).toHaveBeenCalledTimes(1);
    await clock.advance(MAX_BACKOFF_MS * 2);
    expect(load).toHaveBeenCalledTimes(1);
    expect(clock.timers.size).toBe(0);
  });

  it("sends nothing while the tab is hidden and polls once it is visible again", async () => {
    const clock = fakeEnv();
    const load = vi.fn(async () => ok());
    startIssuePoll({ load, onAlerts: vi.fn(), env: clock.env });
    await clock.advance(0);
    clock.setHidden(true);
    await clock.advance(POLL_INTERVAL_MS * 4);
    expect(load).toHaveBeenCalledTimes(1);
    clock.setHidden(false);
    await clock.advance(0);
    expect(load).toHaveBeenCalledTimes(2);
    await clock.advance(POLL_INTERVAL_MS);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("never overlaps two requests", async () => {
    const clock = fakeEnv();
    let release: (() => void) | null = null;
    const load = vi.fn(
      () =>
        new Promise<PollOutcome>((resolve) => {
          release = () => resolve(ok());
        }),
    );
    startIssuePoll({ load, onAlerts: vi.fn(), env: clock.env });
    await clock.advance(0);
    clock.setHidden(true);
    clock.setHidden(false); // a visibility flip while the request runs
    await clock.advance(POLL_INTERVAL_MS * 2);
    expect(load).toHaveBeenCalledTimes(1);
    release!();
    await clock.advance(0);
    await clock.advance(POLL_INTERVAL_MS);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("fetchIssueAlerts", () => {
  const json = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      ...init,
    });

  it("reads the route's JSON with the session cookie, uncached", async () => {
    const fetchImpl = vi.fn(async () =>
      json({
        open: 3,
        urgent: [
          {
            id: 5,
            orderId: 10240,
            kind: "incident",
            code: "staff_report",
            openedAt: "2026-11-15T10:00:00+05:00",
          },
          { id: 6, orderId: 10241, kind: "brand_new", code: "x", openedAt: "" },
          "junk",
        ],
      }),
    );
    expect(await fetchIssueAlerts(fetchImpl as unknown as typeof fetch)).toEqual({
      kind: "ok",
      alerts: {
        open: 3,
        urgent: [
          {
            id: 5,
            orderId: 10240,
            kind: "incident",
            code: "staff_report",
            openedAt: "2026-11-15T10:00:00+05:00",
          },
        ],
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      ALERTS_PATH,
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("stops on a 401 or the login page a redirect chain ends on", async () => {
    expect(await fetchIssueAlerts((async () => json({}, { status: 401 })) as never)).toEqual({
      kind: "expired",
    });
    const login = new Response("<html></html>", { headers: { "content-type": "text/html" } });
    expect(await fetchIssueAlerts((async () => login) as never)).toEqual({ kind: "expired" });
  });

  it("reports a failure for a 502, a network error or an unexpected body", async () => {
    expect(await fetchIssueAlerts((async () => json({}, { status: 502 })) as never)).toEqual({
      kind: "failed",
    });
    expect(
      await fetchIssueAlerts((async () => {
        throw new TypeError("offline");
      }) as never),
    ).toEqual({ kind: "failed" });
    expect(await fetchIssueAlerts((async () => json({ open: "3" })) as never)).toEqual({
      kind: "failed",
    });
    expect(parseAlerts({ open: -1, urgent: [] })).toBeNull();
    expect(parseAlerts({ open: 1, urgent: {} })).toBeNull();
    expect(parseAlerts(null)).toBeNull();
  });
});
