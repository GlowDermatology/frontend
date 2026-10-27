import type { ActionResult } from "@/data/types";

/**
 * Sends an ordered list's new order (`PUT …/order/` with the exact set) one
 * request at a time. Moves made while a request is in flight are coalesced:
 * only the latest order is sent next, and `onConfirmed` reports the server's
 * list once nothing newer is waiting. A failure drops the waiting order and
 * reports the message (the list rolls back to the last confirmed order).
 * Framework-free so the sequencing can be unit-tested.
 */

export interface OrderSyncOptions<T> {
  send: (keys: string[]) => Promise<ActionResult<T[]>>;
  onConfirmed: (items: T[]) => void;
  onFailed: (message: string) => void;
}

export interface OrderSync {
  /** The complete wanted order (every key once). */
  push: (keys: string[]) => void;
  readonly busy: boolean;
}

export function createOrderSync<T>(options: OrderSyncOptions<T>): OrderSync {
  let waiting: string[] | null = null;
  let busy = false;

  const flush = async () => {
    busy = true;
    while (waiting) {
      const keys = waiting;
      waiting = null;
      const result = await options.send(keys);
      if (!result.ok) {
        waiting = null;
        busy = false;
        options.onFailed(result.error);
        return;
      }
      if (!waiting) {
        busy = false;
        options.onConfirmed(result.data);
        return;
      }
    }
    busy = false;
  };

  return {
    push(keys) {
      waiting = keys;
      if (!busy) void flush();
    },
    get busy() {
      return busy;
    },
  };
}
