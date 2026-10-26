import "server-only";

import { apiFetch, cachedGet, type QueryValue } from "./client";
import type {
  ApiCancelOrder,
  ApiDashboard,
  ApiOrderDetail,
  ApiPaginatedOrders,
  ApiPaginatedPayments,
  ApiPayment,
  ApiResolveRefund,
  ApiStatusCounts,
  ApiTransition,
} from "./types";

/**
 * Typed calls to the M1c commerce endpoints (contract §2.2, §2.10, §2.12):
 * orders, their status counts and actions, payments and the refund
 * operations, and the dashboard. Reads go through `cachedGet` (deduplicated
 * per render: `generateMetadata` and the page body share one detail request);
 * the reads a client re-runs through a Server Action (the BTS retry poll) and
 * every write go through `apiFetch`. Every function throws `ApiError` for a
 * non-2xx answer.
 */

const BASE = "/api/v1/admin";
const id = (value: number) => encodeURIComponent(String(value));

/* --- Orders --- */

export function apiListOrders(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedOrders>(`${BASE}/orders/`, params, token);
}

export function apiOrderStatusCounts(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiStatusCounts>(`${BASE}/orders/status-counts/`, params, token);
}

export function apiGetOrder(token: string, orderId: number) {
  return cachedGet<ApiOrderDetail>(`${BASE}/orders/${id(orderId)}/`, undefined, token);
}

/** Uncached: the detail view polls the order after a BTS retry. */
export function apiGetOrderFresh(token: string, orderId: number) {
  return apiFetch<ApiOrderDetail>(`${BASE}/orders/${id(orderId)}/`, { token });
}

/**
 * `cancel` runs the BTS cancel synchronously when a parcel exists (§2.2) and
 * may wait up to `ADMIN_LOCK_WAIT` (5 s) for a busy order row, so it gets a
 * longer deadline than the default 10 s.
 */
export function apiCancelOrder(
  token: string,
  orderId: number,
  body: ApiCancelOrder,
  idempotencyKey: string,
) {
  return apiFetch<ApiOrderDetail>(`${BASE}/orders/${id(orderId)}/cancel/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
    timeoutMs: 30_000,
  });
}

export function apiTransitionOrder(
  token: string,
  orderId: number,
  body: ApiTransition,
  idempotencyKey: string,
) {
  return apiFetch<ApiOrderDetail>(`${BASE}/orders/${id(orderId)}/transition/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
    timeoutMs: 20_000,
  });
}

/** 202 with `shipment.pending = true`; the outcome arrives later (§2.2). */
export function apiRetryShipment(token: string, orderId: number, idempotencyKey: string) {
  return apiFetch<ApiOrderDetail>(`${BASE}/orders/${id(orderId)}/retry-shipment/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
    timeoutMs: 20_000,
  });
}

/* --- Payments and refund operations --- */

export function apiListPayments(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedPayments>(`${BASE}/payments/`, params, token);
}

/** `Idempotency-Key` is optional here (§2.12) but sent, one per confirmation dialog. */
export function apiRetryRefund(
  token: string,
  paymentId: number,
  refundId: number,
  idempotencyKey: string,
) {
  return apiFetch<ApiPayment>(`${BASE}/payments/${id(paymentId)}/refunds/${id(refundId)}/retry/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
    timeoutMs: 20_000,
  });
}

export function apiResolveRefund(
  token: string,
  paymentId: number,
  refundId: number,
  body: ApiResolveRefund,
  idempotencyKey: string,
) {
  return apiFetch<ApiPayment>(
    `${BASE}/payments/${id(paymentId)}/refunds/${id(refundId)}/resolve/`,
    { method: "POST", body, token, idempotencyKey, timeoutMs: 20_000 },
  );
}

/* --- Dashboard --- */

export function apiDashboard(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiDashboard>(`${BASE}/dashboard/`, params, token);
}
