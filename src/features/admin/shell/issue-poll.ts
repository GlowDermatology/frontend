import type { IssueAlert, IssueAlerts } from "@/domain/delivery-issue";
import { DELIVERY_ISSUE_KINDS } from "@/domain/order";

import { isLoginPage } from "../shared/export-download";

/**
 * The shell's 30 s poll of `/admin/delivery-issues/alerts` (Yandex Delivery
 * plan §4): one request per interval while the tab is visible; a failed
 * read keeps the last values and backs off (×2 up to 5 minutes, back to 30 s
 * after a success); an ended session (401, or the login page a redirect
 * chain ends on) stops the poll — the next page load signs in again.
 * Pure: the fetch, the timers and the visibility source are injected.
 */

export const POLL_INTERVAL_MS = 30_000;
export const MAX_BACKOFF_MS = 5 * 60_000;
export const ALERTS_PATH = "/admin/delivery-issues/alerts";

export type PollOutcome =
  { kind: "ok"; alerts: IssueAlerts } | { kind: "expired" } | { kind: "failed" };

const isKind = (value: unknown): value is IssueAlert["kind"] =>
  DELIVERY_ISSUE_KINDS.some((kind) => kind === value);

/** The route's JSON, checked field by field (a stray answer never reaches the UI). */
export function parseAlerts(body: unknown): IssueAlerts | null {
  if (typeof body !== "object" || body === null) return null;
  const { open, urgent } = body as { open?: unknown; urgent?: unknown };
  if (typeof open !== "number" || !Number.isFinite(open) || open < 0) return null;
  if (!Array.isArray(urgent)) return null;
  const alerts: IssueAlert[] = [];
  for (const row of urgent as unknown[]) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== "number" ||
      typeof r.orderId !== "number" ||
      !isKind(r.kind) ||
      typeof r.code !== "string" ||
      typeof r.openedAt !== "string"
    ) {
      continue;
    }
    alerts.push({ id: r.id, orderId: r.orderId, kind: r.kind, code: r.code, openedAt: r.openedAt });
  }
  return { open: Math.floor(open), urgent: alerts };
}

export async function fetchIssueAlerts(
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): Promise<PollOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(ALERTS_PATH, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    return { kind: "failed" };
  }
  if (response.status === 401 || (response.ok && isLoginPage(response))) return { kind: "expired" };
  if (!response.ok) return { kind: "failed" };
  try {
    const alerts = parseAlerts(await response.json());
    return alerts ? { kind: "ok", alerts } : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

/** The next wait after `failures` failures in a row: 30 s → 60 s → 120 s → … → 5 min. */
export function backoff(failures: number, interval: number = POLL_INTERVAL_MS): number {
  if (failures <= 0) return interval;
  return Math.min(MAX_BACKOFF_MS, interval * 2 ** failures);
}

export interface PollEnv {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  now: () => number;
  /** Whether the tab is hidden (no requests then). */
  hidden: () => boolean;
  /** Calls `fn` when the tab becomes visible again; returns the unsubscribe. */
  onVisible: (fn: () => void) => () => void;
}

export interface PollOptions {
  load: () => Promise<PollOutcome>;
  onAlerts: (alerts: IssueAlerts) => void;
  /** The session ended: the poll has stopped. */
  onExpired?: () => void;
  env: PollEnv;
  /** Wait before the first request (a recent poll of an earlier page counts). */
  firstDelayMs?: number;
  intervalMs?: number;
}

/**
 * Starts the loop; returns `stop()`. One request at a time; a hidden tab
 * defers the request until it is visible again (then polls at once if the
 * interval has passed). Every scheduled wait is cleared by `stop()`.
 */
export function startIssuePoll(options: PollOptions): () => void {
  const { env, load } = options;
  const interval = options.intervalMs ?? POLL_INTERVAL_MS;
  let stopped = false;
  let timer: unknown = null;
  let failures = 0;
  let inFlight = false;
  let deferred = false;
  let unsubscribe: (() => void) | null = null;

  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer !== null) env.clearTimeout(timer);
    timer = env.setTimeout(() => {
      timer = null;
      void tick();
    }, ms);
  };

  const tick = async () => {
    if (stopped || inFlight) return;
    if (env.hidden()) {
      deferred = true;
      return;
    }
    inFlight = true;
    const outcome = await load().catch((): PollOutcome => ({ kind: "failed" }));
    inFlight = false;
    if (stopped) return;
    if (outcome.kind === "expired") {
      stop();
      options.onExpired?.();
      return;
    }
    if (outcome.kind === "ok") {
      failures = 0;
      options.onAlerts(outcome.alerts);
      schedule(interval);
      return;
    }
    failures += 1;
    schedule(backoff(failures, interval));
  };

  unsubscribe = env.onVisible(() => {
    if (deferred && !stopped) {
      deferred = false;
      void tick();
    }
  });

  function stop() {
    stopped = true;
    if (timer !== null) env.clearTimeout(timer);
    timer = null;
    unsubscribe?.();
    unsubscribe = null;
  }

  schedule(Math.max(0, options.firstDelayMs ?? 0));
  return stop;
}
