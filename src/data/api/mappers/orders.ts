import {
  DELIVERY_ISSUE_KINDS,
  DELIVERY_METHODS,
  manualRefundReason,
  MANUAL_REFUND_NOTE,
  refundManualReason,
  SHIPMENT_STAGES,
  type CustomerRef,
  type DeliveryIssueRef,
  type DeliveryProvider,
  type ManualRefundReason,
  type Order,
  type OrderActions,
  type OrderCashbackEntry,
  type OrderDelivery,
  type OrderEvent,
  type OrderStatus,
  type OrderSummary,
  type PaymentProvider,
  type Refund,
  type Shipment,
} from "@/domain/order";
import type { DispatchInput } from "@/domain/order-dispatch";
import { formatNumber, formatSom } from "@/lib/format";

import type { OrderFilters, OrderListQuery } from "../../orders";
import type { QueryValue } from "../client";
import type {
  ApiCashbackHold,
  ApiConfirmReturn,
  ApiDeliveryIssueRef,
  ApiDispatchRequest,
  ApiOrderCashback,
  ApiOrderDelivery,
  ApiOrderDetail,
  ApiOrderEvent,
  ApiOrderSummary,
  ApiRefund,
  ApiShipment,
} from "../types";
import { idString, customerContact } from "./common";

/**
 * Orders: API → domain (contract §2.2, §4, §5.1) and the list URL → API
 * query translation (§7.15). Pure functions, unit-tested against the
 * contract's №10248 vector.
 */

/** §7.16: a deleted customer's `name` is `""`. */
export const DELETED_CUSTOMER_NAME = "O‘chirilgan mijoz";

export function mapCustomerRef(ref: {
  id: number;
  name: string;
  phone: string | null;
  email?: string | null;
}): CustomerRef {
  return {
    id: idString(ref.id),
    name: ref.name || DELETED_CUSTOMER_NAME,
    phone: customerContact(ref.phone, ref.email),
  };
}

/* --- query parameters --- */

/** The filters shared by `orders/`, `orders/status-counts/` and the export (§2.2). */
export function orderFilterParams(filters: OrderFilters): Record<string, QueryValue> {
  return {
    search: filters.q?.trim() || undefined,
    fulfilment: filters.fulfilment,
    payment: filters.payment,
    period: filters.period,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    customer: filters.customer,
    provider: filters.provider,
    stage: filters.stage,
    attention: filters.attention,
  };
}

/** `orders/?…` for a list page: the filters plus status, ordering and paging. */
export function orderListParams(query: OrderListQuery): Record<string, QueryValue> {
  return {
    ...orderFilterParams(query),
    status: query.status,
    ordering: query.sort === "date_asc" ? "created_at" : "-created_at",
    page: query.page,
    page_size: query.pageSize,
  };
}

/** Export: the list's filters and ordering; `page`/`page_size` are ignored by the API (§1.8). */
export function orderExportParams(
  query: Omit<OrderListQuery, "page" | "pageSize">,
): Record<string, QueryValue> {
  return {
    ...orderFilterParams(query),
    status: query.status,
    ordering: query.sort === "date_asc" ? "created_at" : "-created_at",
  };
}

/* --- shapes --- */

export function mapShipment(shipment: ApiShipment): Shipment {
  switch (shipment.state) {
    case "not_required":
      return { state: "not_required" };
    case "not_created":
      return { state: "not_created", pending: shipment.pending };
    case "failed":
      return {
        state: "failed",
        lastAttemptAt: shipment.last_attempt_at,
        attempts: shipment.attempts,
        pending: shipment.pending,
      };
    case "created":
      return {
        state: "created",
        trackingNumber: shipment.tracking_number,
        tariff: shipment.tariff,
        updatedAt: shipment.updated_at,
        via: shipment.via,
      };
  }
}

const oneOf = <T extends string>(values: ReadonlyArray<T>, value: unknown): T | null =>
  values.find((v) => v === value) ?? null;

/** `DeliveryIssueRef` → domain; a kind this build does not know is dropped (shown in the queue). */
export function mapIssueRef(api: ApiDeliveryIssueRef): DeliveryIssueRef | null {
  const kind = oneOf(DELIVERY_ISSUE_KINDS, api.kind);
  if (!kind) return null;
  return { id: api.id, kind, code: api.code, urgent: api.urgent, openedAt: api.opened_at };
}

/**
 * `OrderDelivery` (plan §3.10) → domain. Money stays the server's integer
 * so‘m; a stage or method this build does not know reads as `null`, a
 * provider other than `yandex` as BTS (the backend default for old rows).
 */
export function mapOrderDelivery(api: ApiOrderDelivery): OrderDelivery {
  const provider: DeliveryProvider = api.provider === "yandex" ? "yandex" : "bts";
  return {
    provider,
    method: oneOf(DELIVERY_METHODS, api.method),
    stage: oneOf(SHIPMENT_STAGES, api.stage),
    promisedFrom: api.promised_from,
    promisedTo: api.promised_to,
    quoteFee: api.quote_fee,
    carrierPrice: api.carrier_price,
    offerPrice: api.offer_price,
    approvedPrice: api.approved_price,
    carrierCostTotal: api.carrier_cost_total,
    costDifference: api.cost_difference,
    parcelWeightG: api.parcel_weight_g,
    preparedAt: api.prepared_at,
    courierName: api.courier_name || null,
    courierVehicle: api.courier_vehicle || null,
    trackingUrl: safeTrackingUrl(api.tracking_url),
    claimStatus: api.claim_status || null,
    claimNumber: api.claim_number,
    failureCode: api.failure_code || null,
    openIssues: (api.open_issues ?? [])
      .map(mapIssueRef)
      .filter((issue): issue is DeliveryIssueRef => issue !== null),
  };
}

/** Only an absolute http(s) link is rendered as the tracking link. */
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** `delivery` of a summary: `undefined` from an API before Yandex Delivery, `null` for pickup. */
function deliveryOf(api: { delivery?: ApiOrderDelivery | null }): OrderDelivery | null | undefined {
  if (api.delivery === undefined) return undefined;
  return api.delivery === null ? null : mapOrderDelivery(api.delivery);
}

export function mapOrderSummary(api: ApiOrderSummary): OrderSummary {
  const summary: OrderSummary = {
    id: api.id,
    customer: mapCustomerRef(api.customer),
    createdAt: api.created_at,
    total: api.total,
    status: api.status,
    payment: { status: api.payment.status, provider: api.payment.provider },
    fulfilment: api.fulfilment,
    shipment: mapShipment(api.shipment),
    cancellation: api.cancellation
      ? { reason: api.cancellation.reason, note: api.cancellation.note ?? undefined }
      : undefined,
  };
  const delivery = deliveryOf(api);
  if (delivery !== undefined) summary.delivery = delivery;
  return summary;
}

/**
 * `available_actions` → domain. `dispatch` / `confirm_return` (Yandex
 * Delivery phase 3) are read when the API sends them and left out otherwise,
 * so the screen can tell "not offered" from "not known yet".
 */
export function mapOrderActions(api: ApiOrderDetail["available_actions"]): OrderActions {
  const extra = api as { dispatch?: unknown; confirm_return?: unknown };
  const actions: OrderActions = {
    transitions: [...api.transitions],
    cancel: api.cancel,
    retryShipment: api.retry_shipment,
  };
  if (typeof extra.dispatch === "boolean") actions.dispatch = extra.dispatch;
  if (typeof extra.confirm_return === "boolean") actions.confirmReturn = extra.confirm_return;
  return actions;
}

/**
 * The body of `POST orders/{id}/dispatch/` (plan §3.6): `method` and
 * `approved_price` only when set (the API reads an absent key as "keep the
 * order's method" / "no approval").
 */
export function dispatchBody(input: DispatchInput): ApiDispatchRequest {
  const body: ApiDispatchRequest = {
    contents_verified: input.contentsVerified,
    weight_g: input.weightG,
  };
  if (input.method) body.method = input.method;
  if (input.approvedPrice !== undefined && input.approvedPrice !== null) {
    body.approved_price = input.approvedPrice;
  }
  return body;
}

/** The body of `POST orders/{id}/confirm-return/`: the note trimmed (`""` when none). */
export function confirmReturnBody(note: string | null | undefined): ApiConfirmReturn {
  return { note: (note ?? "").trim() };
}

/** `Refund` (§2.2); `manual_reason` (M3) says why it is (or was) manual. */
export function mapRefund(api: ApiRefund): Refund {
  const refund: Refund = {
    id: api.id,
    state: api.state,
    provider: api.provider,
    amount: api.amount,
    requestedAt: api.requested_at,
    updatedAt: api.updated_at,
    completedAt: api.completed_at ?? undefined,
  };
  const reason = refundManualReason(api.manual_reason);
  if (reason) refund.manualReason = reason;
  return refund;
}

/** `PCT(p)` (§5): `"1.00"` → `1`, `"1.50"` → `1,5`, `"0.57"` → `0,57`. */
export function formatPercent(percent: string | number | null | undefined): string {
  if (percent === null || percent === undefined || percent === "") return "";
  const text = String(percent);
  const trimmed = text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
  return trimmed.replace(".", ",");
}

/** `cashback[]` (+ the active hold) → the card's entries (§5.1 `OrderCashbackEntry`). */
export function mapOrderCashback(
  entries: ReadonlyArray<ApiOrderCashback>,
  hold: ApiCashbackHold | null,
): OrderCashbackEntry[] {
  const mapped = entries.map((entry): OrderCashbackEntry => {
    switch (entry.kind) {
      case "debit":
        return { kind: "debit", amount: entry.amount, label: "Ishlatildi" };
      case "credit":
        return {
          kind: "credit",
          amount: entry.amount,
          label: `${formatPercent(entry.percent)}% × ${formatNumber(entry.base ?? 0)}`,
        };
      case "reversal":
        return { kind: "reversal", amount: entry.amount, label: "Qarama-qarshi yozuv" };
    }
  });
  if (!entries.some((e) => e.kind === "debit") && hold?.state === "active") {
    mapped.unshift({ kind: "debit", amount: -hold.amount, label: "Ishlatildi" });
  }
  return mapped;
}

/* --- history folding (§4, §5.1) --- */

type EventData = Record<string, unknown>;

const dataOf = (event: ApiOrderEvent): EventData =>
  typeof event.data === "object" && event.data !== null ? (event.data as EventData) : {};
const num = (d: EventData, key: string): number | undefined =>
  typeof d[key] === "number" ? (d[key] as number) : undefined;
const str = (d: EventData, key: string): string | undefined =>
  typeof d[key] === "string" ? (d[key] as string) : undefined;
const flag = (d: EventData, key: string): boolean => d[key] === true;

const PROVIDER: Record<PaymentProvider, string> = { click: "Click", payme: "Payme" };
const provider = (d: EventData): string => {
  const value = str(d, "provider");
  return value === "click" || value === "payme" ? PROVIDER[value] : (value ?? "");
};
const VIA: Record<string, string> = { webhook: "Webhook", polling: "Polling" };
const via = (d: EventData): string => {
  const value = str(d, "via") ?? "";
  return VIA[value] ?? value;
};
const pushSuffix = (d: EventData) => (flag(d, "push_sent") ? " · mijozga push yuborildi" : "");
const actorName = (event: ApiOrderEvent) => event.actor?.display_name || "Administrator";

/** A manual refund's reason (§4: absent on M1 rows → `payme`); `null` for an automatic one. */
const manualReasonOf = (d: EventData): ManualRefundReason | "unknown" | null =>
  flag(d, "manual") ? (manualRefundReason(d.manual_reason) ?? "unknown") : null;

/** §5.1 note of `refund_requested`: by `manual_reason`, a reason added later reads as "manual". */
const manualSuffix = (d: EventData): string => {
  const reason = manualReasonOf(d);
  if (reason === null) return "";
  return reason === "unknown" ? " · qo‘lda qaytariladi" : ` · ${MANUAL_REFUND_NOTE[reason]}`;
};

/** Refund id → the reason its manual `refund_requested` event names (folded rows included). */
export function manualRefundReasons(
  history: ReadonlyArray<ApiOrderEvent>,
): Map<number, ManualRefundReason> {
  const reasons = new Map<number, ManualRefundReason>();
  for (const event of history) {
    if (event.type !== "refund_requested") continue;
    const d = dataOf(event);
    const refundId = num(d, "refund_id");
    const reason = manualReasonOf(d);
    if (refundId !== undefined && reason !== null && reason !== "unknown") {
      reasons.set(refundId, reason);
    }
  }
  return reasons;
}

export const STATUS_TITLE: Record<OrderStatus, string> = {
  awaiting_payment: "To‘lov kutilmoqda",
  processing: "Jarayonda",
  handed_to_courier: "Kuryerga topshirildi",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

const isStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && value in STATUS_TITLE;

const FOLDED_TYPES = new Set(["reservation_created", "billz_sale_recorded", "cashback_credited"]);

/**
 * The API history (newest first) → the screen's rows: the "folded into"
 * events disappear and feed their host row's note; a `refund_requested`
 * whose `refund_id` a `cancelled` event names is folded into that row.
 * The API order is kept.
 */
export function foldOrderHistory(
  history: ReadonlyArray<ApiOrderEvent>,
  fulfilment: Order["fulfilment"],
  provider: DeliveryProvider | null = null,
): OrderEvent[] {
  const firstOf = (type: string) => history.find((e) => e.type === type);
  const reservation = firstOf("reservation_created");
  const billz = firstOf("billz_sale_recorded");
  const credit = firstOf("cashback_credited");
  const cancelledRefundIds = new Set(
    history
      .filter((e) => e.type === "cancelled")
      .map((e) => num(dataOf(e), "refund_id"))
      .filter((v): v is number => v !== undefined),
  );

  const rows: OrderEvent[] = [];
  for (const event of history) {
    if (FOLDED_TYPES.has(event.type)) continue;
    const d = dataOf(event);
    if (event.type === "refund_requested") {
      const refundId = num(d, "refund_id");
      if (refundId !== undefined && cancelledRefundIds.has(refundId)) continue;
    }
    const row = describeEvent(event, d, { reservation, billz, credit, fulfilment, provider });
    rows.push({
      id: event.id,
      at: event.at,
      source: event.source,
      status: event.status_after ?? undefined,
      ...row,
    });
  }
  return rows;
}

interface FoldContext {
  reservation?: ApiOrderEvent;
  billz?: ApiOrderEvent;
  credit?: ApiOrderEvent;
  fulfilment: Order["fulfilment"];
  /** The order's carrier (`null`: pickup, or an API before Yandex Delivery). */
  provider: DeliveryProvider | null;
}

/** A carrier event of a Yandex order: its shipment is Yandex's or Yandex wrote it. */
const isYandexEvent = (event: ApiOrderEvent, d: EventData, ctx: FoldContext) =>
  ctx.provider === "yandex" || event.source === "yandex" || str(d, "provider") === "yandex";

const joinNote = (...parts: Array<string | null | undefined>) =>
  parts.filter((part): part is string => Boolean(part)).join(" · ");

function describeEvent(
  event: ApiOrderEvent,
  d: EventData,
  ctx: FoldContext,
): { title: string; note: string } {
  switch (event.type) {
    case "order_created": {
      if (ctx.reservation) {
        const r = dataOf(ctx.reservation);
        return {
          title: "To‘lov kutilmoqda",
          note: `Qoldiq qayta tekshirildi · ${num(r, "item_count") ?? 0} ta mahsulot ${num(r, "minutes") ?? 0} daqiqaga band qilindi`,
        };
      }
      return {
        title: "To‘lov kutilmoqda",
        note: `Buyurtma yaratildi · ${num(d, "item_count") ?? 0} ta mahsulot`,
      };
    }
    case "payment_confirmed": {
      const parts = [`${provider(d)} to‘lovi tasdiqlandi`];
      if (flag(d, "reservation_converted")) parts.push("band qilish savdoga aylantirildi");
      if (ctx.billz) parts.push("Billz’ga yozildi");
      if (ctx.credit)
        parts.push(`cashback +${formatNumber(num(dataOf(ctx.credit), "amount") ?? 0)}`);
      return { title: "Jarayonda", note: parts.join(" · ") };
    }
    case "payment_failed":
      return { title: "To‘lov o‘tmadi", note: `${provider(d)} · to‘lov rad etildi` };
    case "shipment_created": {
      const tn = str(d, "tracking_number") ?? "";
      if (isYandexEvent(event, d, ctx)) {
        // Plan §3.1: for Yandex the tracking number is the courier claim's id.
        return { title: "Kuryer chaqirildi", note: joinNote("Yandex", tn && `buyurtma ${tn}`) };
      }
      return {
        title: "BTS buyurtmasi yaratildi",
        note: flag(d, "manual")
          ? `Qo‘lda yuborildi · yetkazish raqami ${tn}`
          : `Yetkazish raqami ${tn}`,
      };
    }
    case "shipment_failed":
      if (isYandexEvent(event, d, ctx)) {
        return { title: "Kuryer chaqirilmadi", note: joinNote("Yandex", str(d, "error_code")) };
      }
      return {
        title: "BTS ga yuborilmadi",
        note: flag(d, "manual")
          ? "Qo‘lda urinish muvaffaqiyatsiz"
          : "Avtomatik urinish muvaffaqiyatsiz · administratorga xabar berildi",
      };
    case "status_changed": {
      const to = d.to;
      const title = isStatus(to) ? STATUS_TITLE[to] : String(to ?? "");
      if (to === "delivered" && ctx.fulfilment === "pickup") {
        return { title, note: `${actorName(event)} · mijozga topshirildi` };
      }
      return { title, note: `${actorName(event)} · holat qo‘lda o‘zgartirildi${pushSuffix(d)}` };
    }
    case "handed_to_courier":
      return { title: "Kuryerga topshirildi", note: `${via(d)}${pushSuffix(d)}` };
    case "delivered":
      return { title: "Yetkazildi", note: `${via(d)}${pushSuffix(d)}` };
    case "cancelled": {
      const head = str(d, "reason") === "customer_request" ? "Mijoz" : actorName(event);
      const effects = [
        num(d, "refund_id") !== undefined ? "to‘lov qaytarish so‘rovi yuborildi" : null,
        flag(d, "cashback_reversed") ? "cashback yozuvlari qaytarildi" : null,
      ].filter((v): v is string => v !== null);
      const parts = [
        head,
        effects.length > 0 ? effects.join(", ") : null,
        flag(d, "bts_cancelled")
          ? isYandexEvent(event, d, ctx)
            ? "Yandex buyurtmasi bekor qilindi"
            : "BTS buyurtmasi bekor qilindi"
          : null,
        str(d, "note") || null,
      ].filter((v): v is string => v !== null);
      return { title: "Bekor qilindi", note: parts.join(" · ") };
    }
    case "reservation_expired":
      return { title: "Bekor qilindi", note: "Band muddati tugadi · mahsulotlar bo‘shatildi" };
    case "refund_requested":
      return {
        title: "To‘lov qaytarish so‘raldi",
        note: `${provider(d)} · ${formatSom(num(d, "amount") ?? 0)}${manualSuffix(d)}`,
      };
    case "refund_succeeded":
      return {
        title: "To‘lov qaytarildi",
        note: `${provider(d)} · ${formatSom(num(d, "amount") ?? 0)}`,
      };
    case "refund_failed":
      return {
        title: "To‘lov qaytarilmadi",
        note:
          str(d, "state") === "unknown"
            ? `${provider(d)} · holat noma’lum, tekshirish kerak`
            : `${provider(d)} · xato, administrator tekshiruvi kerak`,
      };
    case "delivery_failed":
      // The courier could not hand the parcel over; it is on its way back (plan §3.7).
      return {
        title: "Yetkazib bo‘lmadi",
        note: joinNote(
          str(d, "provider") === "bts" ? "BTS" : "Yandex",
          str(d, "carrier_status"),
          str(d, "reason"),
        ),
      };
    case "shipment_returned": {
      const status = str(d, "carrier_status");
      return {
        title: "Jo‘natma omborga qaytdi",
        // `carrier_status` is "" when staff confirmed the return by hand (§3.8).
        note: status ? joinNote("Yandex", status) : "Qaytish qo‘lda tasdiqlandi",
      };
    }
    default:
      // A type added after M1: show it rather than drop it.
      return { title: String(event.type), note: "" };
  }
}

/* --- detail --- */

export interface MapOrderOptions {
  /**
   * Keeps or drops an item photo URL. The server passes a filter that drops
   * hosts `next/image` may not load (`src/data/api/media.ts`); by default
   * every URL is kept.
   */
  imageUrl?: (url: string) => string | undefined;
}

/** A 40 px row photo: the 400 px variant when the API sends one (spec 2026-11-13-image-variants). */
function itemPhoto(
  item: ApiOrderDetail["items"][number],
  keep: (url: string) => string | undefined,
): string | undefined {
  const url = item.image_thumbnail_url ?? item.image_url;
  return url ? keep(url) : undefined;
}

export function mapOrder(api: ApiOrderDetail, options: MapOrderOptions = {}): Order {
  const imageUrl = options.imageUrl ?? ((url: string) => url);
  const reasons = manualRefundReasons(api.history);
  const summary = mapOrderSummary(api);
  return {
    ...summary,
    payment: {
      status: api.payment.status,
      provider: api.payment.provider,
      transactionId: api.payment.transaction_id ?? undefined,
      confirmedAt: api.payment.confirmed_at ?? undefined,
      amount: api.payment.amount,
    },
    channel: api.channel,
    address: api.address ?? undefined,
    items: api.items.map((item) => ({
      productId: idString(item.product_id),
      name: item.name,
      art: null,
      imageUrl: itemPhoto(item, imageUrl),
      billzId: item.billz_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      promo: item.promo,
    })),
    deliveryFee: api.delivery_fee,
    cashbackUsed: api.cashback_used,
    refunds: api.refunds.map((refund) => {
      const mapped = mapRefund(refund);
      // The refund's own reason (M3) wins; a refund answered without one
      // (written before the field) falls back to its `refund_requested` event.
      const reason = mapped.manualReason ?? reasons.get(refund.id);
      return reason ? { ...mapped, manualReason: reason } : mapped;
    }),
    cashbackHold: api.cashback_hold
      ? {
          amount: api.cashback_hold.amount,
          state: api.cashback_hold.state,
          expiresAt: api.cashback_hold.expires_at,
        }
      : undefined,
    history: foldOrderHistory(api.history, api.fulfilment, summary.delivery?.provider ?? null),
    cashback: mapOrderCashback(api.cashback, api.cashback_hold),
    availableActions: mapOrderActions(api.available_actions),
  };
}
