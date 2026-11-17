import type { ActionResult } from "@/data/types";

/**
 * The backend's refund refusals, recognised by their error code only. The API answers in the
 * admin language (`Accept-Language`), so the message is shown as it is and never matched: every
 * refusal the board treats specially carries its own code (admin contract §1.6):
 *
 * | code                 | HTTP | backend text (uz source)                     | board                 |
 * | -------------------- | ---- | -------------------------------------------- | --------------------- |
 * | `order_busy`         | 409  | `MESSAGE_ORDER_BUSY` (order row locked)      | transient, retry      |
 * | `click_not_reversed` | 409  | `MESSAGE_REFUND_STILL_PAID`                  | payout step           |
 * | `click_no_paydoc`    | 409  | `MESSAGE_REFUND_NO_PAYDOC`                   | payout step           |
 * | `click_fake_mode`    | 409  | `MESSAGE_REFUND_CLICK_FAKE`                  | dialog stays open     |
 *
 * Generic codes keep their generic meaning: 404 `not_found`, 409 `invalid_transition` and
 * `conflict` → the row changed (stale); 409 `request_in_progress`, 503, network → transient.
 */

export const ORDER_BUSY_CODE = "order_busy";
/** The error code of Click's "still paid" 409 (§7 item 18). */
export const CLICK_NOT_REVERSED_CODE = "click_not_reversed";
export const CLICK_NO_PAYDOC_CODE = "click_no_paydoc";
export const CLICK_FAKE_MODE_CODE = "click_fake_mode";

const hasCode = (result: ActionResult<unknown>, code: string) => !result.ok && result.code === code;

/** Whether `result` is the §2.2 busy order (transient: retry with the same key). */
export function isOrderBusyRefusal(result: ActionResult<unknown>): boolean {
  return hasCode(result, ORDER_BUSY_CODE);
}

/**
 * Refund refusals that mean the row changed under the board (another admin,
 * the provider's outbox): a 404, 409 `invalid_transition`, and a 409
 * `conflict` other than the busy order ("Bu to‘lov uchun qaytarish allaqachon
 * jarayonda." — a sibling refund opened meanwhile). The board closes the
 * dialog and re-reads the rows so the menu follows the server again. The
 * busy order, 409 `request_in_progress`, a 503 and a network error are
 * transient: the dialog stays open with its idempotency key for a retry.
 * So does Click's test mode (`isClickFakeModeRefusal`): the row did not
 * change, the dialog keeps Click's message. Click's "still paid" answer and
 * the missing Click payment id (`isClickNoPaydocRefusal`, M3) lead to the
 * payout step instead.
 */
export function isStaleRefundRefusal(result: ActionResult<unknown>): boolean {
  if (result.ok) return false;
  if (
    isClickStillPaidRefusal(result) ||
    isClickNoPaydocRefusal(result) ||
    isClickFakeModeRefusal(result) ||
    isOrderBusyRefusal(result)
  ) {
    return false;
  }
  return (
    result.code === "not_found" ||
    result.code === "invalid_transition" ||
    result.code === "conflict"
  );
}

/**
 * Closing a failed Click refund answered that Click still reports the
 * payment paid (§7 item 18, M2): not a stale row but the next step — staff
 * pay the customer outside Click and close it with "Qo‘lda to‘landi"
 * (`manual_payout`). Code `click_not_reversed`.
 */
export function isClickStillPaidRefusal(result: ActionResult<unknown>): boolean {
  return hasCode(result, CLICK_NOT_REVERSED_CODE);
}

/**
 * Closing a failed Click refund whose payment has no Click payment id (409
 * `click_no_paydoc`, M3): Click was not asked, nothing changed. Like Click's "still
 * paid" answer it leads to the payout step, with its own message (never
 * "Click to‘lovni qaytarmagan").
 */
export function isClickNoPaydocRefusal(result: ActionResult<unknown>): boolean {
  return hasCode(result, CLICK_NO_PAYDOC_CODE);
}

/**
 * Closing a failed Click refund while Click runs in test mode (409
 * `click_fake_mode`, "Click sinov rejimida: …"): Click's status cannot be
 * checked, nothing changed. Not a stale row — the dialog stays open with
 * the message.
 */
export function isClickFakeModeRefusal(result: ActionResult<unknown>): boolean {
  return hasCode(result, CLICK_FAKE_MODE_CODE);
}

/**
 * The message of a refusal that keeps the dialog open: Click's 503 on a
 * close reads as `unavailable` (the board's copy, in the admin language),
 * everything else (the busy order, a network error) keeps the action's own
 * message.
 */
export function refundRefusalMessage(
  kind: "retry" | "resolve" | "close",
  result: Extract<ActionResult<unknown>, { ok: false }>,
  unavailable: string,
): string {
  return kind === "close" && result.code === "provider_unavailable" ? unavailable : result.error;
}
