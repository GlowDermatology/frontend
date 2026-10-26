/**
 * Payments and their refunds, as listed on the "To‘lovlar" screen (contract
 * §2.12). A payment belongs to one order; refunds are created by an order
 * cancellation and settled by the provider (Click) or by hand (Payme).
 */
import type { CustomerRef, PaymentProvider, PaymentStatus, Refund, RefundState } from "./order";

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

/** The admin operations a refund offers (contract §2.12). */
export interface RefundOperations {
  /**
   * `failed` → a new refund of the payment, while the payment is still `paid`
   * and no other refund of it is open (the API refuses that with 409 `conflict`).
   */
  retry: boolean;
  /** `unknown` / `manual_required` → closed by hand as succeeded or failed. */
  resolve: boolean;
}

export function refundOperations(
  refund: Pick<Refund, "state">,
  payment: Pick<PaymentRecord, "status" | "refunds">,
): RefundOperations {
  return {
    retry: refund.state === "failed" && payment.status === "paid" && !hasOpenRefund(payment),
    resolve: refund.state === "unknown" || refund.state === "manual_required",
  };
}
