import type { ActionResult } from "@/data/types";
import { shipmentPending, type Order } from "@/domain/order";

/**
 * Bounded poll after a BTS retry (contract §2.2: `retry-shipment` answers 202
 * with `shipment.pending = true` and the outcome arrives later as
 * `shipment_created` or `shipment_failed`). The order is re-read every
 * `intervalMs` until its shipment is no longer pending, at most
 * `maxAttempts` times; `signal` stops it (the view aborts on unmount or when
 * a newer poll starts). A failed read is retried on the next tick: one blip
 * does not end the wait.
 */

export const POLL_INTERVAL_MS = 2_000;
export const POLL_MAX_ATTEMPTS = 15;

export type PollOutcome =
  | { kind: "settled"; order: Order }
  | { kind: "timeout"; order: Order | null }
  | { kind: "aborted" };

export interface PollOptions {
  load: () => Promise<ActionResult<Order>>;
  signal: AbortSignal;
  intervalMs?: number;
  maxAttempts?: number;
  /** Called with every pending answer, so the screen keeps the newest data. */
  onPending?: (order: Order) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

export async function pollShipment({
  load,
  signal,
  intervalMs = POLL_INTERVAL_MS,
  maxAttempts = POLL_MAX_ATTEMPTS,
  onPending,
  sleep = abortableSleep,
}: PollOptions): Promise<PollOutcome> {
  let last: Order | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs, signal);
    if (signal.aborted) return { kind: "aborted" };
    const result = await load();
    if (signal.aborted) return { kind: "aborted" };
    if (!result.ok) continue;
    if (!shipmentPending(result.data.shipment)) return { kind: "settled", order: result.data };
    last = result.data;
    onPending?.(result.data);
  }
  return { kind: "timeout", order: last };
}
