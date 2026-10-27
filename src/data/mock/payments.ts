import type { PaymentRecord } from "@/domain/payment";

import {
  confirmedAtOf,
  ORDER_SEEDS,
  orderTotalOf,
  paymentIdOf,
  refundsOf,
  transactionIdOf,
} from "./orders";
import { customerRef } from "./people";

/**
 * One payment per fixture order (contract §2.12): pending while the order
 * awaits payment, failed for an expired reservation, paid, or refunded once
 * the refund succeeded. Three cancelled orders keep an open or failed refund
 * (see `OPEN_REFUNDS` in `./orders.ts`), so the refund operations have rows.
 * Newest first, like the API's default ordering.
 */
export const PAYMENTS: ReadonlyArray<PaymentRecord> = ORDER_SEEDS.map((seed) => ({
  id: paymentIdOf(seed.id),
  orderId: seed.id,
  customer: customerRef(seed.customerId),
  provider: seed.provider,
  status: seed.payment,
  amount: orderTotalOf(seed),
  transactionId: transactionIdOf(seed),
  createdAt: `${new Date(new Date(seed.at).getTime() + 30_000).toISOString().slice(0, 19)}Z`,
  confirmedAt: confirmedAtOf(seed),
  refunds: refundsOf(seed),
}));

export function paymentById(id: number): PaymentRecord | undefined {
  return PAYMENTS.find((payment) => payment.id === id);
}
