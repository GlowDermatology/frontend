import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Job } from "@/domain/job";

import {
  createJobPoller,
  isTransientPollFailure,
  JOB_POLL_MAX_RETRIES,
  JOB_POLL_TIMEOUT_MESSAGE,
  retryDelayMs,
} from "./job-poller";

/**
 * The import poller: 1.5 s cadence, one request in flight, stops on
 * done/stop/error, retries transport failures with backoff.
 */

function job(state: Job["state"], extra: Partial<Job> = {}): Job {
  return {
    id: "12",
    kind: "billz_import",
    state,
    progress: null,
    result: null,
    error: null,
    createdAt: "2026-10-24T12:03:00+05:00",
    startedAt: null,
    finishedAt: null,
    ...extra,
  };
}

const ok = (value: Job): ActionResult<Job> => ({ ok: true, data: value });
const NETWORK_FAILURE: ActionResult<Job> = {
  ok: false,
  error: "API bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",
  code: "network_error",
};

describe("createJobPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reports the starting job, polls every 1.5 s and stops when the job is done", async () => {
    const answers = [
      ok(job("running", { progress: { done: 100, total: 248 } })),
      ok(job("succeeded", { result: { created: 3, updated: 245, unchanged: 0, newFromBillz: 3 } })),
    ];
    const fetchJob = vi.fn(async () => answers.shift()!);
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate, onError });

    poller.start(job("queued"));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ state: "queued" });
    expect(poller.active).toBe(true);
    expect(fetchJob).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchJob).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    expect(fetchJob).toHaveBeenCalledWith("12");
    expect(onUpdate.mock.calls[1]![0]).toMatchObject({ state: "running", progress: { done: 100 } });
    expect(poller.active).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[2]![0]).toMatchObject({
      state: "succeeded",
      result: { created: 3 },
    });
    expect(poller.active).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not poll a job that is already finished", async () => {
    const fetchJob = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError: vi.fn() });
    poller.start(job("failed", { error: { code: "worker_lost", message: "Uzildi." } }));
    expect(poller.active).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchJob).not.toHaveBeenCalled();
  });

  it("never overlaps requests: the next tick is scheduled after the answer arrives", async () => {
    let resolve: ((value: ActionResult<Job>) => void) | undefined;
    const fetchJob = vi.fn(
      () =>
        new Promise<ActionResult<Job>>((r) => {
          resolve = r;
        }),
    );
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError: vi.fn() });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6000); // the answer is still pending
    expect(fetchJob).toHaveBeenCalledTimes(1);
    resolve!(ok(job("running")));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("stops at once on a non-transient failure (404, session) and reports the message", async () => {
    for (const code of ["not_found", "session_expired", "server_error", undefined]) {
      const fetchJob = vi.fn(async (): Promise<ActionResult<Job>> => ({
        ok: false,
        error: `Jarayon topilmadi (${code}).`,
        ...(code === undefined ? {} : { code }),
      }));
      const onError = vi.fn();
      const onRetry = vi.fn();
      const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError, onRetry });
      poller.start(job("running"));
      await vi.advanceTimersByTimeAsync(1500);
      expect(onError).toHaveBeenCalledWith(`Jarayon topilmadi (${code}).`);
      expect(onRetry).not.toHaveBeenCalled();
      expect(poller.active).toBe(false);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchJob).toHaveBeenCalledTimes(1);
    }
  });

  it("retries a transport failure with exponential backoff and keeps tracking the job", async () => {
    const answers: ActionResult<Job>[] = [
      NETWORK_FAILURE,
      NETWORK_FAILURE,
      ok(job("running", { progress: { done: 200, total: 248 } })),
      { ok: false, error: NETWORK_FAILURE.error, code: "timeout" },
      ok(job("succeeded", { result: { created: 0, updated: 0, unchanged: 248, newFromBillz: 0 } })),
    ];
    const fetchJob = vi.fn(async () => answers.shift()!);
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const onRetry = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate, onError, onRetry });
    poller.start(job("running"));

    await vi.advanceTimersByTimeAsync(1500); // poll 1 fails → retry 1 in 1.5 s
    expect(fetchJob).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenLastCalledWith({
      attempt: 1,
      delayMs: 1500,
      message: NETWORK_FAILURE.error,
    });
    expect(poller.active).toBe(true);

    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // retry 1 fails → retry 2 in 3 s
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ attempt: 2, delayMs: 3000 }),
    );

    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // retry 2 succeeds → regular cadence again
    expect(fetchJob).toHaveBeenCalledTimes(3);
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ progress: { done: 200, total: 248 } }),
    );

    await vi.advanceTimersByTimeAsync(1500); // poll 4: a timeout → the retry counter restarted at 1 (1.5 s)
    expect(fetchJob).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ attempt: 1, delayMs: 1500 }),
    );
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(5);
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ state: "succeeded" }));
    expect(poller.active).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it("gives up after maxRetries consecutive transport failures", async () => {
    const fetchJob = vi.fn(async () => NETWORK_FAILURE);
    const onError = vi.fn();
    const onRetry = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError, onRetry });
    poller.start(job("running"));
    // 1.5 s first poll, then backoff 1.5 + 3 + 6 + 12 s for the four retries.
    for (const delay of [1500, 1500, 3000, 6000, 12_000]) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(onError).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
    }
    expect(fetchJob).toHaveBeenCalledTimes(1 + JOB_POLL_MAX_RETRIES);
    expect(onRetry).toHaveBeenCalledTimes(JOB_POLL_MAX_RETRIES);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(NETWORK_FAILURE.error);
    expect(poller.active).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchJob).toHaveBeenCalledTimes(1 + JOB_POLL_MAX_RETRIES);
  });

  it("counts retries against the overall attempt cap", async () => {
    const fetchJob = vi.fn(async () => NETWORK_FAILURE);
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError, maxAttempts: 2 });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500 + 1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(JOB_POLL_TIMEOUT_MESSAGE);
    expect(poller.active).toBe(false);
  });

  it("computes the backoff as the interval doubled per retry", () => {
    expect([1, 2, 3, 4].map((n) => retryDelayMs(n))).toEqual([1500, 3000, 6000, 12_000]);
    expect(retryDelayMs(2, 1000)).toBe(2000);
    expect(isTransientPollFailure({ ok: false, error: "x", code: "network_error" })).toBe(true);
    expect(isTransientPollFailure({ ok: false, error: "x", code: "timeout" })).toBe(true);
    expect(isTransientPollFailure({ ok: false, error: "x", code: "not_found" })).toBe(false);
    expect(isTransientPollFailure({ ok: false, error: "x" })).toBe(false);
    expect(isTransientPollFailure(ok(job("running")))).toBe(false);
  });

  it("ignores an answer that arrives after stop() (unmount) and gives up after maxAttempts", async () => {
    const fetchJob = vi.fn(async () => ok(job("running")));
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate, onError, maxAttempts: 2 });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1500);
    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(JOB_POLL_TIMEOUT_MESSAGE);
    expect(poller.active).toBe(false);

    const second = createJobPoller({ fetchJob, onUpdate, onError });
    second.start(job("running"));
    second.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchJob).toHaveBeenCalledTimes(2); // nothing after stop()
  });
});
