"use server";

import {
  mapAppointment,
  mapCart,
  mapOrder,
  mapPayLink,
  mapQrToken,
  mapQuote,
  mapSlots,
} from "@/data/api/customer/account-mappers";
import {
  deliveryConflictDetails,
  deliveryMethodOf,
  deliveryProviderOf,
  quoteIdOrNull,
} from "@/data/api/customer/delivery-mappers";
import {
  apiAddCartItem,
  apiBook,
  apiCancelAppointment,
  apiCancelOrder,
  apiCheckout,
  apiDeliveryQuote,
  apiMarkAllRead,
  apiMarkRead,
  apiOrder,
  apiPay,
  apiQr,
  apiRemoveCartItem,
  apiReorder,
  apiSetCartQuantity,
  apiSimulatePayment,
  apiSlots,
} from "@/data/api/customer/commerce";
import { guardCustomerAction } from "@/data/customer-auth/session";
import type { ActionResult } from "@/data/types";
import type { DeliveryChoice } from "@/domain/shop-delivery";
import type {
  Fulfilment,
  PaymentProvider,
  ShopAppointment,
  ShopCart,
  ShopOrder,
  ShopQrToken,
  ShopQuote,
  ShopSlots,
} from "@/domain/shop-account";
import { shopHref } from "@/features/shop/routing/routes";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/locales";

import { paymentSandboxEnabled } from "./payment-sandbox";
import { shopMessage, toShopFailure } from "./private";

/**
 * Cart, checkout, payment, orders, cashback QR, booking and inbox actions
 * (contract §2.5–§2.12). Guarded by `guardCustomerAction`; the **I** routes
 * take the idempotency key of the island that called them (one per intent,
 * reused on retries, `useIdempotencyKey`).
 */

function localeOf(value: unknown): Locale {
  return typeof value === "string" && isLocale(value) ? value : "uz";
}

function positiveInt(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number < 2 ** 31 ? number : null;
}

function invalid(locale: Locale): ActionResult<never> {
  return { ok: false, error: shopMessage(locale, "invalid"), code: "validation_error" };
}

/* --- cart ---------------------------------------------------------------- */

export async function addCartItem(input: {
  locale: string;
  productId: number;
  quantity: number;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopCart>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const productId = positiveInt(input.productId);
  const quantity = Math.min(99, positiveInt(input.quantity) ?? 1);
  if (!productId) return invalid(locale);
  try {
    const { data } = await apiAddCartItem(
      locale,
      productId,
      quantity,
      String(input.idempotencyKey),
    );
    return { ok: true, data: mapCart(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function setCartQuantity(input: {
  locale: string;
  productId: number;
  quantity: number;
  csrf: string;
}): Promise<ActionResult<ShopCart>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const productId = positiveInt(input.productId);
  const quantity = positiveInt(input.quantity);
  if (!productId || !quantity) return invalid(locale);
  try {
    const { data } = await apiSetCartQuantity(locale, productId, Math.min(99, quantity));
    return { ok: true, data: mapCart(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function removeCartItem(input: {
  locale: string;
  productId: number;
  csrf: string;
}): Promise<ActionResult<ShopCart>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const productId = positiveInt(input.productId);
  if (!productId) return invalid(locale);
  try {
    const { data } = await apiRemoveCartItem(locale, productId);
    return { ok: true, data: mapCart(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- checkout ------------------------------------------------------------ */

export interface CheckoutSelection {
  fulfilment: Fulfilment;
  addressId: number | null;
  cashbackToUse: number;
}

/** A delivery choice from the browser, checked: a known carrier, a Yandex method or none. */
function deliveryChoiceOf(value: unknown): DeliveryChoice | null {
  if (typeof value !== "object" || value === null) return null;
  const choice = value as { provider?: unknown; method?: unknown };
  const provider = deliveryProviderOf(choice.provider);
  if (provider === "bts") return { provider, method: null };
  if (provider === "yandex") return { provider, method: deliveryMethodOf(choice.method) };
  return null;
}

/**
 * The delivery refusals of `delivery/calculate/` and `orders/checkout/`
 * carry their options mapped for the page (`DeliveryConflict`); any other
 * failure keeps the API's `details` as sent.
 */
function checkoutFailure(error: unknown, locale: Locale): ActionResult<never> {
  const failure = toShopFailure(error, locale);
  const conflict = deliveryConflictDetails(failure.code, failure.details);
  return conflict ? { ...failure, details: conflict } : failure;
}

/**
 * `POST delivery/calculate/`: the fee, the cashback cap and the total to send
 * to checkout. A delivery quote always asks for every option (`with_options`,
 * plan §3.4) and names the customer's choice (`delivery_provider` /
 * `delivery_method`) when they made one; the server answers with that option
 * when it is available, else with its default (Yandex Standard → Express →
 * BTS). 409 `delivery_unavailable` carries the options and their reasons.
 */
export async function quoteCheckout(input: {
  locale: string;
  selection: CheckoutSelection;
  delivery?: DeliveryChoice | null;
  csrf: string;
}): Promise<ActionResult<ShopQuote>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const fulfilment = input.selection?.fulfilment === "delivery" ? "delivery" : "pickup";
  const choice = fulfilment === "delivery" ? deliveryChoiceOf(input.delivery) : null;
  try {
    const { data } = await apiDeliveryQuote(locale, {
      fulfilment,
      address_id: fulfilment === "delivery" ? positiveInt(input.selection.addressId) : null,
      cashback_to_use: Math.max(0, Math.trunc(Number(input.selection.cashbackToUse) || 0)),
      ...(fulfilment === "delivery"
        ? {
            with_options: true,
            delivery_provider: choice?.provider ?? null,
            delivery_method: choice?.provider === "yandex" ? choice.method : null,
          }
        : {}),
    });
    return { ok: true, data: mapQuote(data) };
  } catch (error) {
    return checkoutFailure(error, locale);
  }
}

/**
 * `POST orders/checkout/` → the new order (`awaiting_payment`). A Yandex
 * option is placed with its `delivery_quote_id` (the server re-checks it and
 * answers 409 `price_changed` with fresh options or `quote_expired`); BTS and
 * pickup send the released request without it.
 */
export async function placeOrder(input: {
  locale: string;
  selection: CheckoutSelection;
  provider: PaymentProvider;
  expectedTotal: number;
  deliveryQuoteId?: string | null;
  note: string;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<{ orderId: number }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const fulfilment = input.selection?.fulfilment === "delivery" ? "delivery" : "pickup";
  const quoteId = fulfilment === "delivery" ? quoteIdOrNull(input.deliveryQuoteId) : null;
  if (input.deliveryQuoteId && !quoteId && fulfilment === "delivery") return invalid(locale);
  try {
    const { data } = await apiCheckout(
      locale,
      {
        fulfilment,
        address_id: fulfilment === "delivery" ? positiveInt(input.selection.addressId) : null,
        payment_provider: input.provider === "payme" ? "payme" : "click",
        cashback_to_use: Math.max(0, Math.trunc(Number(input.selection.cashbackToUse) || 0)),
        expected_total: Math.max(0, Math.trunc(Number(input.expectedTotal) || 0)),
        customer_note: String(input.note ?? "")
          .trim()
          .slice(0, 300),
        ...(quoteId ? { delivery_quote_id: quoteId } : {}),
      },
      String(input.idempotencyKey),
    );
    return { ok: true, data: { orderId: data.id } };
  } catch (error) {
    return checkoutFailure(error, locale);
  }
}

/**
 * `POST orders/{id}/pay/` → where the browser goes to pay: the provider's
 * https page (Click or Payme), which returns to this site's order page
 * (`PAYMENT_WEB_RETURN_URL`). With the local payment sandbox on, the order
 * page itself (`?sandbox=1`) stands in for the provider.
 */
export async function startPayment(input: {
  locale: string;
  orderId: number;
  provider: PaymentProvider | null;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<{ url: string }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId) return invalid(locale);
  try {
    const provider =
      input.provider === "click" || input.provider === "payme" ? input.provider : null;
    const { data } = await apiPay(locale, orderId, provider, String(input.idempotencyKey));
    if (paymentSandboxEnabled()) {
      const url = shopHref(locale, { kind: "order", slug: String(orderId) }, { sandbox: 1 });
      return { ok: true, data: { url } };
    }
    const link = mapPayLink(data);
    if (!link) return { ok: false, error: shopMessage(locale, "unexpected"), code: "unexpected" };
    return { ok: true, data: { url: link.webUrl } };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/** The local payment sandbox: runs the dev simulate endpoint (contract §2.15). */
export async function simulatePayment(input: {
  locale: string;
  orderId: number;
  outcome: "success" | "fail";
  csrf: string;
}): Promise<ActionResult<null>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId || !paymentSandboxEnabled()) return invalid(locale);
  try {
    await apiSimulatePayment(locale, orderId, input.outcome === "fail" ? "fail" : "success");
    return { ok: true, data: null };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/** The return page's poll (every 2 s, contract §2.7.2). */
export async function orderStatus(input: {
  locale: string;
  orderId: number;
  csrf: string;
}): Promise<ActionResult<ShopOrder>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId) return invalid(locale);
  try {
    return {
      ok: true,
      data: mapOrder((await apiOrder(locale, orderId)).data, serverEnv.mediaHosts()),
    };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function cancelOrder(input: {
  locale: string;
  orderId: number;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopOrder>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId) return invalid(locale);
  try {
    const { data } = await apiCancelOrder(locale, orderId, String(input.idempotencyKey));
    return { ok: true, data: mapOrder(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function reorder(input: {
  locale: string;
  orderId: number;
  idempotencyKey: string;
  csrf: string;
  cancelUnpaid?: boolean;
}): Promise<ActionResult<ShopCart>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId) return invalid(locale);
  try {
    const { data } = await apiReorder(
      locale,
      orderId,
      String(input.idempotencyKey),
      input.cancelUnpaid === true,
    );
    return { ok: true, data: mapCart(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- cashback QR --------------------------------------------------------- */

export async function qrToken(input: {
  locale: string;
  csrf: string;
}): Promise<ActionResult<ShopQrToken>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const token = mapQrToken((await apiQr(locale)).data);
    if (!token) return { ok: false, error: shopMessage(locale, "unexpected"), code: "unexpected" };
    return { ok: true, data: token };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- booking ------------------------------------------------------------- */

/** Free start times of one day (public, **O**: no session needed). */
export async function freeSlots(input: {
  locale: string;
  specialistId: number;
  serviceId: number;
  locationId: number;
  date: string;
}): Promise<ActionResult<ShopSlots>> {
  const locale = localeOf(input.locale);
  const specialistId = positiveInt(input.specialistId);
  const serviceId = positiveInt(input.serviceId);
  const locationId = positiveInt(input.locationId);
  const date =
    typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  if (!specialistId || !serviceId || !locationId || !date) return invalid(locale);
  try {
    return {
      ok: true,
      data: mapSlots((await apiSlots(locale, specialistId, serviceId, locationId, date)).data),
    };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

export async function bookAppointment(input: {
  locale: string;
  specialistId: number;
  serviceId: number;
  locationId: number;
  start: string;
  note: string;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopAppointment>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const specialistId = positiveInt(input.specialistId);
  const serviceId = positiveInt(input.serviceId);
  const locationId = positiveInt(input.locationId);
  if (
    !specialistId ||
    !serviceId ||
    !locationId ||
    typeof input.start !== "string" ||
    Number.isNaN(Date.parse(input.start))
  ) {
    return invalid(locale);
  }
  try {
    const { data } = await apiBook(
      locale,
      {
        specialist_id: specialistId,
        service_id: serviceId,
        location_id: locationId,
        start: input.start,
        note:
          String(input.note ?? "")
            .trim()
            .slice(0, 300) || null,
      },
      String(input.idempotencyKey),
    );
    return { ok: true, data: mapAppointment(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function cancelAppointment(input: {
  locale: string;
  id: number;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopAppointment>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const id = positiveInt(input.id);
  if (!id) return invalid(locale);
  try {
    const { data } = await apiCancelAppointment(locale, id, String(input.idempotencyKey));
    return { ok: true, data: mapAppointment(data, serverEnv.mediaHosts()) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- inbox --------------------------------------------------------------- */

export async function markNotificationRead(input: {
  locale: string;
  id: number;
  csrf: string;
}): Promise<ActionResult<{ unread: number }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const id = positiveInt(input.id);
  if (!id) return invalid(locale);
  try {
    return { ok: true, data: { unread: (await apiMarkRead(locale, id)).data.unread_count } };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function markAllNotificationsRead(input: {
  locale: string;
  csrf: string;
}): Promise<ActionResult<{ unread: number }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    return { ok: true, data: { unread: (await apiMarkAllRead(locale)).data.unread_count } };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}
