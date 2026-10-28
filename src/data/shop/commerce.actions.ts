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

/** `POST delivery/calculate/`: the fee, the cashback cap and the total to send to checkout. */
export async function quoteCheckout(input: {
  locale: string;
  selection: CheckoutSelection;
  csrf: string;
}): Promise<ActionResult<ShopQuote>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const fulfilment = input.selection?.fulfilment === "delivery" ? "delivery" : "pickup";
  try {
    const { data } = await apiDeliveryQuote(locale, {
      fulfilment,
      address_id: fulfilment === "delivery" ? positiveInt(input.selection.addressId) : null,
      cashback_to_use: Math.max(0, Math.trunc(Number(input.selection.cashbackToUse) || 0)),
    });
    return { ok: true, data: mapQuote(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/** `POST orders/checkout/` → the new order (`awaiting_payment`). */
export async function placeOrder(input: {
  locale: string;
  selection: CheckoutSelection;
  provider: PaymentProvider;
  expectedTotal: number;
  note: string;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<{ orderId: number }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const fulfilment = input.selection?.fulfilment === "delivery" ? "delivery" : "pickup";
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
      },
      String(input.idempotencyKey),
    );
    return { ok: true, data: { orderId: data.id } };
  } catch (error) {
    return toShopFailure(error, locale);
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
}): Promise<ActionResult<ShopCart>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const orderId = positiveInt(input.orderId);
  if (!orderId) return invalid(locale);
  try {
    const { data } = await apiReorder(locale, orderId, String(input.idempotencyKey));
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
  date: string;
}): Promise<ActionResult<ShopSlots>> {
  const locale = localeOf(input.locale);
  const specialistId = positiveInt(input.specialistId);
  const serviceId = positiveInt(input.serviceId);
  const date =
    typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  if (!specialistId || !serviceId || !date) return invalid(locale);
  try {
    return {
      ok: true,
      data: mapSlots((await apiSlots(locale, specialistId, serviceId, date)).data),
    };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

export async function bookAppointment(input: {
  locale: string;
  specialistId: number;
  serviceId: number;
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
  if (
    !specialistId ||
    !serviceId ||
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
