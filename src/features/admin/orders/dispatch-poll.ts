import type { ActionResult } from "@/data/types";
import type { Order } from "@/domain/order";
import {
  DISPATCH_POLL_INTERVAL_MS,
  DISPATCH_POLL_WINDOW_MS,
  dispatchPhase,
  type DispatchPhase,
} from "@/domain/order-dispatch";

import { abortableSleep } from "./shipment-poll";

/**
 * The status poll after "Kuryer chaqirish" (plan §4): the API answered 202
 * with the order at `courier_requested` and the outbox talks to Yandex; the
 * order is re-read every 10 s for at most 3 minutes while Yandex is still
 * searching (`dispatchPhase` = `searching`). It stops at once on any other
 * stage (a courier was found, or further) or on a dispatch issue (failed,
 * price review, unknown). A failed read is retried on the next tick; the
 * signal stops it (unmount, a newer poll).
 */

export type DispatchPollOutcome =
  | { kind: "settled"; order: Order; phase: Exclude<DispatchPhase, { kind: "searching" }> }
  | { kind: "timeout"; order: Order | null }
  | { kind: "aborted" };

export interface DispatchProgress {
  /** Reads so far (1-based once the first read answered). */
  attempt: number;
  maxAttempts: number;
  /** Milliseconds the poll has waited of its window. */
  elapsedMs: number;
}

export interface DispatchPollOptions {
  load: () => Promise<ActionResult<Order>>;
  signal: AbortSignal;
  intervalMs?: number;
  windowMs?: number;
  /** Every read that still shows the search, so the page keeps the newest data. */
  onSearching?: (order: Order) => void;
  /** After every read (answered or failed): the page's progress line. */
  onAttempt?: (progress: DispatchProgress) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export function dispatchPollAttempts(
  intervalMs = DISPATCH_POLL_INTERVAL_MS,
  windowMs = DISPATCH_POLL_WINDOW_MS,
): number {
  return Math.max(1, Math.floor(windowMs / intervalMs));
}

export async function pollDispatch({
  load,
  signal,
  intervalMs = DISPATCH_POLL_INTERVAL_MS,
  windowMs = DISPATCH_POLL_WINDOW_MS,
  onSearching,
  onAttempt,
  sleep = abortableSleep,
}: DispatchPollOptions): Promise<DispatchPollOutcome> {
  const maxAttempts = dispatchPollAttempts(intervalMs, windowMs);
  let last: Order | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await sleep(intervalMs, signal);
    if (signal.aborted) return { kind: "aborted" };
    const result = await load();
    if (signal.aborted) return { kind: "aborted" };
    onAttempt?.({ attempt, maxAttempts, elapsedMs: attempt * intervalMs });
    if (!result.ok) continue;
    const phase = dispatchPhase(result.data);
    if (phase.kind !== "searching") return { kind: "settled", order: result.data, phase };
    last = result.data;
    onSearching?.(result.data);
  }
  return { kind: "timeout", order: last };
}

/** The progress before the first read. */
export function initialDispatchProgress(
  intervalMs = DISPATCH_POLL_INTERVAL_MS,
  windowMs = DISPATCH_POLL_WINDOW_MS,
): DispatchProgress {
  return { attempt: 0, maxAttempts: dispatchPollAttempts(intervalMs, windowMs), elapsedMs: 0 };
}
