import type { ActionResult } from "@/data/types";

/**
 * Refusals that mean the order changed under the screen (another admin, BTS,
 * the payment provider): 409 `invalid_transition` / `not_cancellable` and a
 * 404. The view re-reads the order so its buttons follow the server's
 * `available_actions` again. Transient refusals (the busy-order `conflict`,
 * 409 `request_in_progress`, 503 `provider_unavailable`, a network error)
 * keep the dialog and its idempotency key for a retry instead.
 */
const STALE_CODES = new Set(["invalid_transition", "not_cancellable", "not_found"]);

export function isStaleRefusal(result: ActionResult<unknown>): boolean {
  return !result.ok && result.code !== undefined && STALE_CODES.has(result.code);
}
