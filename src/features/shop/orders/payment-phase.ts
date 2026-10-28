import type { ShopOrderSummary } from "@/domain/shop-account";

/**
 * Where the payment return page stands (contract §2.7.2: poll the order
 * every 2 s for up to 60 s after returning from Click or Payme). Pure;
 * unit-tested.
 *
 * - `paid` — the order left `awaiting_payment` for a paid state, or its
 *   displayed payment is paid;
 * - `failed` — the displayed payment failed and nothing is in flight;
 * - `expired` — the order was cancelled while we waited (reservation over);
 * - `checking` — still waiting, within the polling window;
 * - `pending` — the window is over without an answer (the push or a later
 *   visit will tell).
 */
export type PaymentPhase = "paid" | "failed" | "expired" | "checking" | "pending";

export const POLL_INTERVAL_MS = 2_000;
export const POLL_WINDOW_MS = 60_000;

export function paymentPhase(
  order: Pick<ShopOrderSummary, "status" | "payment">,
  elapsedMs: number,
): PaymentPhase {
  if (
    order.payment.status === "paid" ||
    order.status === "processing" ||
    order.status === "handed_to_courier" ||
    order.status === "delivered"
  ) {
    return "paid";
  }
  if (order.status === "cancelled") return "expired";
  if (order.payment.status === "failed" && !order.payment.inProgress) return "failed";
  return elapsedMs < POLL_WINDOW_MS ? "checking" : "pending";
}

/** Whether the page should keep polling in this phase. */
export function keepPolling(phase: PaymentPhase): boolean {
  return phase === "checking";
}
