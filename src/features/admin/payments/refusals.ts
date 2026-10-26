import type { ActionResult } from "@/data/types";

/** §2.2 busy-order outcome, shared by the refund operations: nothing was written. */
const BUSY_ORDER_PREFIX = "Buyurtma boshqa amal bilan band";

/**
 * Refund refusals that mean the row changed under the board (another admin,
 * the provider's outbox): a 404, 409 `invalid_transition`, and a 409
 * `conflict` other than the busy order ("Bu to‘lov uchun qaytarish allaqachon
 * jarayonda." — a sibling refund opened meanwhile). The board closes the
 * dialog and re-reads the rows so the menu follows the server again. The
 * busy order, 409 `request_in_progress`, a 503 and a network error are
 * transient: the dialog stays open with its idempotency key for a retry.
 */
export function isStaleRefundRefusal(result: ActionResult<unknown>): boolean {
  if (result.ok) return false;
  if (result.code === "not_found" || result.code === "invalid_transition") return true;
  return result.code === "conflict" && !result.error.startsWith(BUSY_ORDER_PREFIX);
}
