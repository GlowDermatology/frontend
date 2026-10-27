import type {
  CartLineStatus,
  InboxTarget,
  ShopAddress,
  ShopAppointment,
  ShopCart,
  ShopCartLine,
  ShopCashback,
  ShopInboxItem,
  ShopLanguage,
  ShopLedgerItem,
  ShopMe,
  ShopOrder,
  ShopOrderSummary,
  ShopPayLink,
  ShopQrToken,
  ShopQuote,
  ShopRegion,
  ShopSession,
  ShopSlots,
  SocialProvider,
} from "@/domain/shop-account";
import type { ShopPage } from "@/domain/shop";

import type {
  ApiAddress,
  ApiAppointment,
  ApiCart,
  ApiCartLine,
  ApiCashbackSummary,
  ApiDeliveryQuote,
  ApiFreeSlots,
  ApiInboxItem,
  ApiLedgerItem,
  ApiMe,
  ApiOrderDetail,
  ApiOrderSummary,
  ApiPayLink,
  ApiQrToken,
  ApiRegionCatalog,
  ApiSession,
} from "./account-types";
import { absoluteUrl, optimizable } from "./mappers";

/**
 * Customer API → private storefront view models (pure; unit-tested). Every
 * reader is defensive: an unknown enum literal, a non-https link or an image
 * from a host `next/image` may not load is dropped, never passed through.
 */

const LANGUAGES: ReadonlyArray<ShopLanguage> = ["uz", "ru", "en"];
const PROVIDERS: ReadonlyArray<SocialProvider> = ["google", "facebook", "apple"];
const LINE_STATUSES: ReadonlyArray<CartLineStatus> = [
  "ok",
  "insufficient",
  "out_of_stock",
  "unavailable",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed.length > 0 ? trimmed : null;
}

function int(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function nonNegative(value: unknown): number {
  return Math.max(0, int(value));
}

function httpsOnly(value: unknown): string | null {
  const url = absoluteUrl(value);
  return url && url.startsWith("https://") ? url : null;
}

export function mapAddress(api: ApiAddress): ShopAddress {
  return {
    id: api.id,
    label: text(api.label),
    text: text(api.text),
    regionCode: text(api.region_code),
    cityCode: text(api.city_code),
    comment: text(api.comment),
    isDefault: Boolean(api.is_default),
  };
}

export function mapMe(api: ApiMe): ShopMe {
  return {
    id: api.id,
    phone: optionalText(api.phone),
    email: optionalText(api.email),
    name: text(api.name),
    language: LANGUAGES.includes(api.language as ShopLanguage)
      ? (api.language as ShopLanguage)
      : "uz",
    hasPassword: Boolean(api.has_password),
    linkedProviders: (api.linked_providers ?? []).filter((provider): provider is SocialProvider =>
      PROVIDERS.includes(provider as SocialProvider),
    ),
    registeredAt: api.registered_at,
    consent: {
      acceptedVersion: optionalText(api.consent?.terms_version),
      currentVersion: optionalText(api.consent?.current_version),
      updateRequired: Boolean(api.consent?.update_required),
    },
    defaultAddress: api.default_address ? mapAddress(api.default_address) : null,
  };
}

export function mapCartLine(api: ApiCartLine, mediaHosts: ReadonlyArray<string>): ShopCartLine {
  const status = LINE_STATUSES.includes(api.status as CartLineStatus)
    ? (api.status as CartLineStatus)
    : "unavailable";
  return {
    productId: api.product_id,
    name: text(api.name),
    volume: text(api.volume),
    image: optimizable(api.main_image_url, mediaHosts),
    unitPrice: nonNegative(api.unit_price),
    promo: Boolean(api.promo),
    quantity: nonNegative(api.quantity),
    lineTotal: nonNegative(api.line_total),
    available: nonNegative(api.available),
    maxQuantity: nonNegative(api.max_quantity),
    maxReached: Boolean(api.max_reached),
    status,
    priceChanged: Boolean(api.price_changed),
    previousPrice: api.previous_price === null ? null : nonNegative(api.previous_price),
  };
}

export function mapCart(api: ApiCart, mediaHosts: ReadonlyArray<string>): ShopCart {
  return {
    lines: (api.items ?? []).map((line) => mapCartLine(line, mediaHosts)),
    itemCount: nonNegative(api.item_count),
    quantityTotal: nonNegative(api.quantity_total),
    itemsSubtotal: nonNegative(api.items_subtotal),
    promoSubtotal: nonNegative(api.promo_subtotal),
    hasProblems: Boolean(api.has_problems),
    cashbackAvailable: int(api.cashback?.available),
    cashbackMaxPickup: nonNegative(api.cashback?.max_usable_pickup),
    lastChange: api.last_change
      ? {
          productId: api.last_change.product_id,
          requested: nonNegative(api.last_change.requested_quantity),
          quantity: nonNegative(api.last_change.quantity),
          maxReached: Boolean(api.last_change.max_reached),
        }
      : null,
  };
}

export function mapRegions(api: ApiRegionCatalog): ShopRegion[] {
  return (api.regions ?? []).map((region) => ({
    code: text(region.code),
    name: text(region.name),
    cities: (region.cities ?? []).map((city) => ({ code: text(city.code), name: text(city.name) })),
  }));
}

export function mapQuote(api: ApiDeliveryQuote): ShopQuote {
  return {
    fulfilment: api.fulfilment === "delivery" ? "delivery" : "pickup",
    deliveryFee: nonNegative(api.delivery_fee),
    itemsSubtotal: nonNegative(api.items_subtotal),
    cashbackMax: nonNegative(api.cashback_max),
    cashbackToUse: nonNegative(api.cashback_to_use),
    expectedTotal: nonNegative(api.expected_total),
    pickupAddress: optionalText(api.pickup_address),
  };
}

function previewImages(urls: unknown, mediaHosts: ReadonlyArray<string>): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((url) => optimizable(url, mediaHosts))
    .filter((url): url is string => url !== null)
    .slice(0, 3);
}

export function mapOrderSummary(
  api: ApiOrderSummary | ApiOrderDetail,
  mediaHosts: ReadonlyArray<string>,
): ShopOrderSummary {
  return {
    id: api.id,
    createdAt: api.created_at,
    status: api.status,
    statusLabel: text(api.status_label),
    fulfilment: api.fulfilment === "delivery" ? "delivery" : "pickup",
    total: nonNegative(api.total),
    itemCount: nonNegative(api.item_count),
    previewImages: previewImages(api.preview_images, mediaHosts),
    payment: {
      status: api.payment.status,
      statusLabel: text(api.payment.status_label),
      provider: api.payment.provider,
      inProgress: Boolean(api.payment.in_progress),
    },
    payBy: api.pay_by ?? null,
    trackingNumber: optionalText(api.tracking_number),
  };
}

export function mapOrder(api: ApiOrderDetail, mediaHosts: ReadonlyArray<string>): ShopOrder {
  return {
    ...mapOrderSummary(api, mediaHosts),
    fulfilmentLabel: text(api.fulfilment_label),
    items: (api.items ?? []).map((item) => ({
      productId: item.product_id,
      name: text(item.name),
      image: optimizable(item.image_url, mediaHosts),
      quantity: nonNegative(item.quantity),
      unitPrice: nonNegative(item.unit_price),
      promo: Boolean(item.promo),
      lineTotal: nonNegative(item.line_total),
    })),
    itemsSubtotal: nonNegative(api.items_subtotal),
    promoSubtotal: nonNegative(api.promo_subtotal),
    deliveryFee: nonNegative(api.delivery_fee),
    cashbackUsed: nonNegative(api.cashback_used),
    address: optionalText(api.address),
    addressComment: optionalText(api.address_comment),
    pickupAddress: optionalText(api.pickup_address),
    customerNote: optionalText(api.customer_note),
    paymentDetail: {
      amount: nonNegative(api.payment.amount),
      confirmedAt: api.payment.confirmed_at ?? null,
      inProgressLabel: optionalText(api.payment.in_progress_label),
    },
    refund: api.refund
      ? {
          stateLabel: text(api.refund.state_label),
          amount: nonNegative(api.refund.amount),
          completed: api.refund.state === "completed",
        }
      : null,
    shipment: api.shipment
      ? {
          carrier: text(api.shipment.carrier),
          trackingNumber: text(api.shipment.tracking_number),
          trackingUrl: httpsOnly(api.shipment.tracking_url),
        }
      : null,
    cashback: {
      used: nonNegative(api.cashback?.used),
      earned: nonNegative(api.cashback?.earned),
      earnedState: api.cashback?.earned_state ?? "none",
    },
    cancellation: api.cancellation
      ? { reason: api.cancellation.reason, label: text(api.cancellation.label) }
      : null,
    progress: (api.progress ?? []).map((step) => ({
      step: step.step,
      label: text(step.label),
      state: step.state,
      at: step.at ?? null,
    })),
    timeline: (api.timeline ?? []).map((entry) => ({
      type: entry.type,
      at: entry.at,
      title: text(entry.title),
      subtitle: optionalText(entry.subtitle),
    })),
    actions: {
      pay: Boolean(api.actions?.pay),
      cancel: Boolean(api.actions?.cancel),
      reorder: Boolean(api.actions?.reorder),
    },
  };
}

/**
 * The provider page to send the browser to. Only an absolute https URL is
 * followed (contract §2.7.2: Click/Payme pages); anything else is refused so
 * a malformed answer can never become an open redirect.
 */
export function mapPayLink(api: ApiPayLink): ShopPayLink | null {
  const webUrl = httpsOnly(api.web_url);
  if (!webUrl) return null;
  return { orderId: api.order_id, provider: api.provider, amount: nonNegative(api.amount), webUrl };
}

export function mapCashback(api: ApiCashbackSummary): ShopCashback {
  return {
    balance: int(api.balance),
    held: nonNegative(api.held),
    available: int(api.available),
    negative: Boolean(api.negative),
    lifetimeTotal: nonNegative(api.lifetime_total),
    tier: api.tier ? { from: api.tier.from, to: api.tier.to, percent: api.tier.percent } : null,
    nextTier: api.next_tier
      ? {
          percent: api.next_tier.percent,
          from: nonNegative(api.next_tier.from),
          remaining: nonNegative(api.next_tier.remaining),
          progress: Math.min(1, Math.max(0, Number(api.next_tier.progress) || 0)),
        }
      : null,
    tiers: (api.tiers ?? []).map((band) => ({
      from: band.from,
      to: band.to,
      percent: band.percent,
    })),
    holds: (api.holds ?? []).map((hold) => ({
      orderId: hold.order_id,
      amount: nonNegative(hold.amount),
      expiresAt: hold.expires_at,
    })),
  };
}

export function mapLedgerItem(api: ApiLedgerItem): ShopLedgerItem {
  return {
    id: api.id,
    at: api.at,
    kind: api.kind,
    amount: int(api.amount),
    balanceAfter: int(api.balance_after),
    title: text(api.title),
    subtitle: optionalText(api.subtitle),
    orderId: api.order_id ?? null,
  };
}

/** `GD1:` + 22 base64url characters (contract §2.9.3); anything else is not shown. */
const QR_TOKEN = /^GD1:[A-Za-z0-9_-]{22}$/;

export function mapQrToken(api: ApiQrToken): ShopQrToken | null {
  if (!QR_TOKEN.test(api.token)) return null;
  return {
    token: api.token,
    expiresAt: api.expires_at,
    ttlSeconds: Math.max(1, int(api.ttl_seconds) || 60),
    refreshInSeconds: Math.max(1, int(api.refresh_in_seconds) || 50),
  };
}

export function mapSession(api: ApiSession): ShopSession {
  const platform = api.platform;
  return {
    id: api.id,
    device: text(api.device) || "—",
    platform: platform === "ios" || platform === "android" || platform === "web" ? platform : null,
    location: text(api.location) || "—",
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    current: Boolean(api.current),
  };
}

/** The caller's own session first, then the API's order (most recently active first). */
export function orderSessions(sessions: ReadonlyArray<ShopSession>): ShopSession[] {
  return [...sessions].sort((a, b) => Number(b.current) - Number(a.current));
}

export function mapAppointment(
  api: ApiAppointment,
  mediaHosts: ReadonlyArray<string>,
): ShopAppointment {
  return {
    id: api.id,
    status: api.status,
    statusLabel: text(api.status_label),
    specialist: {
      id: api.specialist.id,
      name: text(api.specialist.name),
      roleLabel: text(api.specialist.role_label),
      photo: optimizable(api.specialist.photo_url, mediaHosts),
    },
    service: {
      id: api.service.id,
      name: text(api.service.short_name) || text(api.service.name),
    },
    location: {
      name: text(api.location?.name),
      address: text(api.location?.address),
      phone: optionalText(api.location?.phone),
    },
    start: api.start,
    end: api.end,
    durationMin: nonNegative(api.duration_min),
    price: nonNegative(api.price),
    note: optionalText(api.note),
    canCancel: Boolean(api.can_cancel),
    cancelledBy: api.cancelled_by ?? null,
  };
}

export function mapSlots(api: ApiFreeSlots): ShopSlots {
  return {
    date: api.date,
    durationMin: nonNegative(api.duration_min),
    price: nonNegative(api.price),
    workingHours: api.working_hours
      ? { start: api.working_hours.start, end: api.working_hours.end }
      : null,
    slots: (api.slots ?? []).map((slot) => ({
      start: slot.start,
      end: slot.end,
      startAt: slot.start_at,
    })),
  };
}

export function inboxTarget(link: ApiInboxItem["link"] | null | undefined): InboxTarget {
  if (!link) return { kind: "none" };
  if (link.kind === "order" && typeof link.order_id === "number") {
    return { kind: "order", orderId: link.order_id };
  }
  if (link.kind === "appointment" && typeof link.appointment_id === "number") {
    return { kind: "appointment", appointmentId: link.appointment_id };
  }
  if (link.kind === "product" && typeof link.product_id === "number") {
    return { kind: "product", productId: link.product_id };
  }
  if (link.kind === "url") {
    const url = httpsOnly(link.url);
    if (url) return { kind: "url", url };
  }
  return { kind: "none" };
}

export function mapInboxItem(api: ApiInboxItem, mediaHosts: ReadonlyArray<string>): ShopInboxItem {
  return {
    id: api.id,
    kind: api.kind,
    title: text(api.title),
    body: text(api.body),
    image: optimizable(api.image_url, mediaHosts),
    target: inboxTarget(api.link),
    createdAt: api.created_at,
    read: api.read_at !== null && api.read_at !== undefined,
  };
}

/** Any DRF page envelope → the storefront page shape. */
export function mapPage<A, T>(
  api: { results: A[]; count: number; page: number; page_count: number; page_size: number },
  map: (item: A) => T,
): ShopPage<T> {
  return {
    items: api.results.map(map),
    total: nonNegative(api.count),
    page: Math.max(1, int(api.page)),
    pageCount: Math.max(1, int(api.page_count)),
    pageSize: Math.max(1, int(api.page_size)),
  };
}
