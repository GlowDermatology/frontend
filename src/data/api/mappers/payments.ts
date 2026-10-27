import type { PaymentListQuery, PaymentRecord } from "@/domain/payment";

import type { QueryValue } from "../client";
import type { ApiPayment } from "../types";
import { mapCustomerRef, mapRefund } from "./orders";

/**
 * Payments: API → domain (contract §2.12) and the board's URL → API query.
 * The screen-level `needs_action` refund filter is not an API value; the
 * data layer expands it (see `src/data/payments.ts`).
 */

export function mapPayment(api: ApiPayment): PaymentRecord {
  return {
    id: api.id,
    orderId: api.order_id,
    customer: mapCustomerRef(api.customer),
    provider: api.provider,
    status: api.status,
    amount: api.amount,
    transactionId: api.transaction_id ?? undefined,
    createdAt: api.created_at,
    confirmedAt: api.confirmed_at ?? undefined,
    refunds: api.refunds.map(mapRefund),
  };
}

/** Filters + ordering shared by the list and the export (`refund_state` only for a real state). */
export function paymentFilterParams(
  query: Omit<PaymentListQuery, "page" | "pageSize">,
): Record<string, QueryValue> {
  return {
    search: query.q?.trim() || undefined,
    status: query.status,
    provider: query.provider,
    refund_state: query.refund && query.refund !== "needs_action" ? query.refund : undefined,
    period: query.period,
    date_from: query.dateFrom,
    date_to: query.dateTo,
    ordering: query.sort === "date_asc" ? "created_at" : "-created_at",
  };
}

export function paymentListParams(query: PaymentListQuery): Record<string, QueryValue> {
  return { ...paymentFilterParams(query), page: query.page, page_size: query.pageSize };
}
