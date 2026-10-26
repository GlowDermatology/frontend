/**
 * Payments and their refunds, as listed on the "To‘lovlar" screen (contract
 * §2.12). A payment belongs to one order; refunds are created by an order
 * cancellation and settled by the provider (Click) or by hand (Payme).
 */
import {
  REFUND_STATES_NEEDING_ACTION,
  type CustomerRef,
  type PaymentProvider,
  type PaymentStatus,
  type Refund,
  type RefundState,
} from "./order";

export interface PaymentRecord {
  id: number;
  orderId: number;
  customer: CustomerRef;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  createdAt: string;
  confirmedAt?: string;
  /** Newest first. */
  refunds: Refund[];
}

export type PaymentPeriod = "today" | "week" | "month" | "all";
export type PaymentSort = "date_desc" | "date_asc";

/**
 * `needs_action` is a screen-level shortcut for "any refund in failed,
 * unknown or manual_required" (the dashboard's `refunds_needing_action`);
 * the API filters one state at a time, so the data layer merges the three.
 */
export type RefundFilter = RefundState | "needs_action";

export interface PaymentListQuery {
  q?: string;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  refund?: RefundFilter;
  period: PaymentPeriod;
  dateFrom?: string;
  dateTo?: string;
  sort: PaymentSort;
  page: number;
  pageSize: number;
}

export const PAYMENT_PAGE_SIZES = [20, 50] as const;

/** Refund states that keep a new refund of the same order from starting. */
export const OPEN_REFUND_STATES: ReadonlyArray<RefundState> = [
  "requested",
  "submitting",
  "manual_required",
  "unknown",
];

/** Whether one of the payment's refunds is still open (a retry would get 409 `conflict`). */
export function hasOpenRefund(payment: Pick<PaymentRecord, "refunds">): boolean {
  return payment.refunds.some((refund) => OPEN_REFUND_STATES.includes(refund.state));
}

/**
 * Whether a refund still needs staff (contract §2.10
 * `attention.refunds_needing_action`, M2): `unknown` and `manual_required`
 * always; a `failed` one unless a later refund of the same payment
 * succeeded (a staff retry returned the money) or the payment is
 * `refunded`. `payments/?refund_state=failed` (§2.12) applies the same rule,
 * so the mock filters and counters use it too.
 */
export function refundNeedsAction(
  refund: Pick<Refund, "id" | "state">,
  payment: { status: PaymentStatus; refunds: ReadonlyArray<Pick<Refund, "id" | "state">> },
): boolean {
  if (!REFUND_STATES_NEEDING_ACTION.includes(refund.state)) return false;
  if (refund.state !== "failed") return true;
  if (payment.status === "refunded") return false;
  return !payment.refunds.some((other) => other.id > refund.id && other.state === "succeeded");
}

/** The admin operations a refund offers (contract §2.12, §7 item 18). */
export interface RefundOperations {
  /**
   * `failed` → a new refund of the payment, while the payment is still `paid`
   * and no other refund of it is open (the API refuses that with 409 `conflict`).
   */
  retry: boolean;
  /** `unknown` / `manual_required` → closed by hand as succeeded or failed. */
  resolve: boolean;
  /**
   * A `failed` **Click** refund → closed as succeeded after a fresh Click
   * status check (M2): Click reversed the payment, or staff paid the customer
   * outside Click (`manual_payout`). Only the payment's newest refund, while
   * the payment is `paid` and no other refund of it is open or succeeded (the
   * API's guard, so a retried refund is never paid out twice).
   */
  close: boolean;
}

/**
 * The 409 `invalid_transition` of closing a failed Click refund while Click
 * still reports the payment paid (§7 item 18): staff pay the customer outside
 * Click, then close it again with `manual_payout`. The backend's own text;
 * the board recognises the answer by it.
 */
export const CLICK_STILL_PAID_MESSAGE =
  "Click to‘lovni qaytarmagan. Avval mijozga qo‘lda to‘lang, so‘ng «qo‘lda to‘landi» belgisi bilan yakunlang yoki qaytarishni qayta urinib ko‘ring.";

/** Whether `refund` may be closed as a failed Click refund (the guard of `…/resolve/`, M2). */
export function canCloseFailedRefund(
  refund: Pick<Refund, "id" | "state" | "provider">,
  payment: Pick<PaymentRecord, "status" | "refunds">,
): boolean {
  if (refund.state !== "failed" || refund.provider !== "click" || payment.status !== "paid") {
    return false;
  }
  if (payment.refunds.some((other) => other.id > refund.id)) return false;
  return !payment.refunds.some(
    (other) =>
      other.id !== refund.id &&
      (OPEN_REFUND_STATES.includes(other.state) || other.state === "succeeded"),
  );
}

export function refundOperations(
  refund: Pick<Refund, "id" | "state" | "provider">,
  payment: Pick<PaymentRecord, "status" | "refunds">,
): RefundOperations {
  return {
    retry: refund.state === "failed" && payment.status === "paid" && !hasOpenRefund(payment),
    resolve: refund.state === "unknown" || refund.state === "manual_required",
    close: canCloseFailedRefund(refund, payment),
  };
}
