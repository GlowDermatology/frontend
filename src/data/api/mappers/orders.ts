import type {
  CustomerRef,
  Order,
  OrderCashbackEntry,
  OrderEvent,
  OrderStatus,
  OrderSummary,
  PaymentProvider,
  Refund,
  Shipment,
} from "@/domain/order";
import { formatNumber, formatSom } from "@/lib/format";

import type { OrderFilters, OrderListQuery } from "../../orders";
import type { QueryValue } from "../client";
import type {
  ApiCashbackHold,
  ApiOrderCashback,
  ApiOrderDetail,
  ApiOrderEvent,
  ApiOrderSummary,
  ApiRefund,
  ApiShipment,
} from "../types";
import { idString } from "./common";

/**
 * Orders: API → domain (contract §2.2, §4, §5.1) and the list URL → API
 * query translation (§7.15). Pure functions, unit-tested against the
 * contract's №10248 vector.
 */

/** §7.16: a deleted customer's `name` is `""`. */
export const DELETED_CUSTOMER_NAME = "O‘chirilgan mijoz";

export function mapCustomerRef(ref: { id: number; name: string; phone: string }): CustomerRef {
  return { id: idString(ref.id), name: ref.name || DELETED_CUSTOMER_NAME, phone: ref.phone };
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

export function mapOrderSummary(api: ApiOrderSummary): OrderSummary {
  return {
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
}

export function mapRefund(api: ApiRefund): Refund {
  return {
    id: api.id,
    state: api.state,
    provider: api.provider,
    amount: api.amount,
    requestedAt: api.requested_at,
    updatedAt: api.updated_at,
    completedAt: api.completed_at ?? undefined,
  };
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
    const row = describeEvent(event, d, { reservation, billz, credit, fulfilment });
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
}

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
      return {
        title: "BTS buyurtmasi yaratildi",
        note: flag(d, "manual")
          ? `Qo‘lda yuborildi · yetkazish raqami ${tn}`
          : `Yetkazish raqami ${tn}`,
      };
    }
    case "shipment_failed":
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
        flag(d, "bts_cancelled") ? "BTS buyurtmasi bekor qilindi" : null,
        str(d, "note") || null,
      ].filter((v): v is string => v !== null);
      return { title: "Bekor qilindi", note: parts.join(" · ") };
    }
    case "reservation_expired":
      return { title: "Bekor qilindi", note: "Band muddati tugadi · mahsulotlar bo‘shatildi" };
    case "refund_requested":
      return {
        title: "To‘lov qaytarish so‘raldi",
        note:
          `${provider(d)} · ${formatSom(num(d, "amount") ?? 0)}` +
          (flag(d, "manual") ? " · Payme kabinetida qo‘lda qaytariladi" : ""),
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

export function mapOrder(api: ApiOrderDetail, options: MapOrderOptions = {}): Order {
  const imageUrl = options.imageUrl ?? ((url: string) => url);
  return {
    ...mapOrderSummary(api),
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
      imageUrl: item.image_url ? imageUrl(item.image_url) : undefined,
      billzId: item.billz_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      promo: item.promo,
    })),
    deliveryFee: api.delivery_fee,
    cashbackUsed: api.cashback_used,
    refunds: api.refunds.map(mapRefund),
    cashbackHold: api.cashback_hold
      ? {
          amount: api.cashback_hold.amount,
          state: api.cashback_hold.state,
          expiresAt: api.cashback_hold.expires_at,
        }
      : undefined,
    history: foldOrderHistory(api.history, api.fulfilment),
    cashback: mapOrderCashback(api.cashback, api.cashback_hold),
    availableActions: {
      transitions: [...api.available_actions.transitions],
      cancel: api.available_actions.cancel,
      retryShipment: api.available_actions.retry_shipment,
    },
  };
}
