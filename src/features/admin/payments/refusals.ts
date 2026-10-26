import type { ActionResult } from "@/data/types";
import { CLICK_STILL_PAID_MESSAGE } from "@/domain/payment";

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
  if (isClickStillPaidRefusal(result)) return false;
  if (result.code === "not_found" || result.code === "invalid_transition") return true;
  return result.code === "conflict" && !result.error.startsWith(BUSY_ORDER_PREFIX);
}

/** The first sentence of `CLICK_STILL_PAID_MESSAGE`, enough to recognise the answer. */
const STILL_PAID_PREFIX = CLICK_STILL_PAID_MESSAGE.slice(0, CLICK_STILL_PAID_MESSAGE.indexOf("."));

/**
 * Closing a failed Click refund answered that Click still reports the
 * payment paid (§7 item 18, M2): not a stale row but the next step — staff
 * pay the customer outside Click and close it with "Qo‘lda to‘landi"
 * (`manual_payout`). The other 409 `invalid_transition` answers (the refund
 * changed, Click in test mode) stay stale refusals.
 */
export function isClickStillPaidRefusal(result: ActionResult<unknown>): boolean {
  return (
    !result.ok && result.code === "invalid_transition" && result.error.startsWith(STILL_PAID_PREFIX)
  );
}

/** What the dialog says when Click did not answer the status check (503, §7 item 18). */
export const CLICK_UNAVAILABLE_MESSAGE =
  "Click javob bermadi: to‘lov holatini tekshirib bo‘lmadi. Qaytarish o‘zgarmadi — birozdan so‘ng qayta urinib ko‘ring.";

/**
 * The message of a refusal that keeps the dialog open: Click's 503 on a
 * close reads as `CLICK_UNAVAILABLE_MESSAGE`, everything else (the busy
 * order, a network error) keeps the action's own message.
 */
export function refundRefusalMessage(
  kind: "retry" | "resolve" | "close",
  result: Extract<ActionResult<unknown>, { ok: false }>,
): string {
  return kind === "close" && result.code === "provider_unavailable"
    ? CLICK_UNAVAILABLE_MESSAGE
    : result.error;
}
