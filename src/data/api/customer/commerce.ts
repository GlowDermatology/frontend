import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import type {
  ApiAppointment,
  ApiAppointmentPage,
  ApiBookingRequest,
  ApiCart,
  ApiCashbackSummary,
  ApiCheckoutRequest,
  ApiDeliveryCalculate,
  ApiDeliveryQuote,
  ApiFreeSlots,
  ApiInboxPage,
  ApiLedgerPage,
  ApiOrderDetail,
  ApiOrderPage,
  ApiPayLink,
  ApiQrToken,
  ApiRead,
  ApiReadAll,
  ApiRegionCatalog,
  ApiUnreadCount,
} from "./account-types";
import { customerFetch } from "./client";

/**
 * Cart, delivery, checkout and orders (contract §2.5–§2.8), loyalty (§2.9),
 * slots and appointments (§2.11) and the inbox (§2.12). Every **C** call
 * carries the customer's bearer and this browser's device headers; the **I**
 * routes take the caller's idempotency key (one per user intent, §1.7).
 * Every function throws `ApiError`.
 */

const V1 = "/api/v1";

/* --- cart ---------------------------------------------------------------- */

export function apiCart(locale: Locale) {
  return customerFetch<ApiCart>(`${V1}/cart/`, { locale, auth: "session" });
}

export function apiAddCartItem(
  locale: Locale,
  productId: number,
  quantity: number,
  idempotencyKey: string,
) {
  return customerFetch<ApiCart>(`${V1}/cart/items/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { product_id: productId, quantity },
    idempotencyKey,
  });
}

export function apiSetCartQuantity(locale: Locale, productId: number, quantity: number) {
  return customerFetch<ApiCart>(`${V1}/cart/items/${productId}/`, {
    method: "PATCH",
    locale,
    auth: "session",
    body: { quantity },
  });
}

export function apiRemoveCartItem(locale: Locale, productId: number) {
  return customerFetch<ApiCart>(`${V1}/cart/items/${productId}/`, {
    method: "DELETE",
    locale,
    auth: "session",
  });
}

/* --- delivery and checkout ----------------------------------------------- */

export function apiRegions(locale: Locale) {
  return customerFetch<ApiRegionCatalog>(`${V1}/delivery/regions/`, { locale, auth: "session" });
}

export function apiDeliveryQuote(locale: Locale, body: ApiDeliveryCalculate) {
  return customerFetch<ApiDeliveryQuote>(`${V1}/delivery/calculate/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
  });
}

export function apiCheckout(locale: Locale, body: ApiCheckoutRequest, idempotencyKey: string) {
  return customerFetch<ApiOrderDetail>(`${V1}/orders/checkout/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
    idempotencyKey,
    timeoutMs: 15_000,
  });
}

export function apiPay(
  locale: Locale,
  orderId: number,
  provider: "click" | "payme" | null,
  idempotencyKey: string,
) {
  return customerFetch<ApiPayLink>(`${V1}/orders/${orderId}/pay/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { provider },
    idempotencyKey,
  });
}

export function apiCancelOrder(locale: Locale, orderId: number, idempotencyKey: string) {
  return customerFetch<ApiOrderDetail>(`${V1}/orders/${orderId}/cancel/`, {
    method: "POST",
    locale,
    auth: "session",
    idempotencyKey,
  });
}

export function apiReorder(locale: Locale, orderId: number, idempotencyKey: string) {
  return customerFetch<ApiCart>(`${V1}/orders/${orderId}/reorder/`, {
    method: "POST",
    locale,
    auth: "session",
    idempotencyKey,
  });
}

export function apiOrders(
  locale: Locale,
  query: { page: number; scope: "active" | "completed" | "cancelled" | "all" },
) {
  return customerFetch<ApiOrderPage>(`${V1}/me/orders/`, {
    locale,
    auth: "session",
    query: { page: query.page, page_size: 10, scope: query.scope },
  });
}

export function apiOrder(locale: Locale, orderId: number) {
  return customerFetch<ApiOrderDetail>(`${V1}/me/orders/${orderId}/`, { locale, auth: "session" });
}

/** `POST dev/payments/{id}/simulate/` — local/test backends only (contract §2.15). */
export function apiSimulatePayment(locale: Locale, orderId: number, outcome: "success" | "fail") {
  return customerFetch<unknown>(`${V1}/dev/payments/${orderId}/simulate/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { outcome, provider: null },
    timeoutMs: 15_000,
  });
}

/* --- loyalty ------------------------------------------------------------- */

export function apiCashback(locale: Locale) {
  return customerFetch<ApiCashbackSummary>(`${V1}/me/cashback/`, { locale, auth: "session" });
}

export function apiLedger(locale: Locale, page: number) {
  return customerFetch<ApiLedgerPage>(`${V1}/me/cashback/ledger/`, {
    locale,
    auth: "session",
    query: { page, page_size: 20 },
  });
}

export function apiQr(locale: Locale) {
  return customerFetch<ApiQrToken>(`${V1}/me/qr/`, { locale, auth: "session" });
}

/* --- appointments -------------------------------------------------------- */

/** Free start times (**O**): anonymous, but forwarded per visitor so the API throttles them. */
export function apiSlots(locale: Locale, specialistId: number, serviceId: number, date: string) {
  return customerFetch<ApiFreeSlots>(`${V1}/specialists/${specialistId}/slots/`, {
    locale,
    query: { date, service_id: serviceId },
  });
}

export function apiBook(locale: Locale, body: ApiBookingRequest, idempotencyKey: string) {
  return customerFetch<ApiAppointment>(`${V1}/appointments/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
    idempotencyKey,
  });
}

export function apiAppointments(locale: Locale, scope: "upcoming" | "past", page: number) {
  return customerFetch<ApiAppointmentPage>(`${V1}/me/appointments/`, {
    locale,
    auth: "session",
    query: { scope, page, page_size: 20 },
  });
}

export function apiCancelAppointment(locale: Locale, id: number, idempotencyKey: string) {
  return customerFetch<ApiAppointment>(`${V1}/appointments/${id}/cancel/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { reason: null },
    idempotencyKey,
  });
}

/* --- inbox --------------------------------------------------------------- */

export function apiInbox(locale: Locale, page: number) {
  return customerFetch<ApiInboxPage>(`${V1}/me/notifications/`, {
    locale,
    auth: "session",
    query: { page, page_size: 20 },
  });
}

export function apiUnreadCount(locale: Locale) {
  return customerFetch<ApiUnreadCount>(`${V1}/me/notifications/unread-count/`, {
    locale,
    auth: "session",
  });
}

export function apiMarkRead(locale: Locale, id: number) {
  return customerFetch<ApiRead>(`${V1}/me/notifications/${id}/read/`, {
    method: "POST",
    locale,
    auth: "session",
  });
}

export function apiMarkAllRead(locale: Locale) {
  return customerFetch<ApiReadAll>(`${V1}/me/notifications/read-all/`, {
    method: "POST",
    locale,
    auth: "session",
  });
}
