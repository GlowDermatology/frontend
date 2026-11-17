import { calculateCashback } from "@/domain/cashback";
import { orderHistoryCopy, orderLabelsCopy } from "@/domain/copy/orders";
import {
  itemsSubtotal,
  orderActions,
  promoSubtotal,
  type CancellationReason,
  type FulfilmentMethod,
  type ManualRefundReason,
  type Order,
  type OrderEvent,
  type OrderItem,
  type OrderStatus,
  type OrderSummary,
  type PaymentProvider,
  type PaymentStatus,
  type Refund,
  type RefundState,
  type Shipment,
} from "@/domain/order";
import { createFormatter } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import type { DeliveryIssue } from "@/domain/delivery-issue";

import { ACTIVE_POLICY } from "./cashback";
import { PRODUCTS, productByBillzId } from "./catalog";
import {
  btsIncident,
  deliveryView,
  planYandexDeliveries,
  yandexShipment,
  type YandexSeed,
} from "./order-delivery";
import { CUSTOMERS, CUSTOMER_IDS, customerRef } from "./people";
import { createRandom, type Random } from "./random";

/** Facts an order is built from; history and cashback entries are derived. */
export interface OrderSeed {
  id: number;
  customerId: string;
  at: string;
  status: OrderStatus;
  payment: PaymentStatus;
  provider: PaymentProvider;
  fulfilment: FulfilmentMethod;
  items: Array<[billzId: string, quantity: number]>;
  deliveryFee: number;
  cashbackUsed: number;
  shipment: Shipment;
  cancellation?: { reason: CancellationReason; note?: string };
  channel?: Order["channel"];
  address?: string;
  /** Set for the demo's Yandex deliveries (`withYandexDeliveries`). */
  yandex?: YandexSeed;
}

const t = (iso: string) => `${iso}+05:00`;
const bts = (trackingNumber: string, tariff: number, updatedAt: string): Shipment => ({
  state: "created",
  trackingNumber,
  tariff,
  updatedAt: t(updatedAt),
  via: "webhook",
});

const B = {
  hyaluronSerum: "4607012301",
  spf50: "4607012401",
  foam: "4607012388",
  ceramideCream: "4607012345",
  toner: "4607012422",
  retinol: "4607012399",
  balm: "4607012410",
  salicylicGel: "4607012411",
  centella: "4607012412",
  peptideSerum: "4607012415",
  sheetMask: "4607012416",
  lipBalm: "4607012417",
  spf30: "4607012418",
} as const;

/** The orders drawn on the dashboard, orders list and order detail screens. */
const DESIGN_ORDERS: OrderSeed[] = [
  {
    id: 10252,
    customerId: CUSTOMER_IDS.sherzod,
    at: t("2026-10-24T11:42:00"),
    status: "awaiting_payment",
    payment: "pending",
    provider: "payme",
    fulfilment: "delivery",
    items: [
      [B.ceramideCream, 1],
      [B.retinol, 1],
      [B.centella, 1],
      [B.peptideSerum, 1],
    ],
    deliveryFee: 28_000,
    cashbackUsed: 0,
    shipment: { state: "not_created" },
  },
  {
    id: 10251,
    customerId: CUSTOMER_IDS.aziza,
    at: t("2026-10-24T11:20:00"),
    status: "processing",
    payment: "paid",
    provider: "click",
    fulfilment: "pickup",
    items: [
      [B.retinol, 1],
      [B.balm, 1],
      [B.sheetMask, 1],
      [B.lipBalm, 1],
    ],
    deliveryFee: 0,
    cashbackUsed: 0,
    shipment: { state: "not_required" },
  },
  {
    id: 10250,
    customerId: CUSTOMER_IDS.gulnora,
    at: t("2026-10-24T10:05:00"),
    status: "processing",
    payment: "paid",
    provider: "payme",
    fulfilment: "delivery",
    items: [
      [B.spf50, 1],
      [B.sheetMask, 1],
    ],
    deliveryFee: 27_000,
    cashbackUsed: 0,
    shipment: { state: "failed", lastAttemptAt: t("2026-10-24T10:09:00") },
  },
  {
    id: 10249,
    customerId: CUSTOMER_IDS.bekzod,
    at: t("2026-10-23T18:30:00"),
    status: "cancelled",
    payment: "failed",
    provider: "click",
    fulfilment: "delivery",
    items: [[B.centella, 1]],
    deliveryFee: 26_000,
    cashbackUsed: 0,
    shipment: { state: "not_created" },
    cancellation: { reason: "reservation_expired" },
  },
  {
    id: 10248,
    customerId: CUSTOMER_IDS.malika,
    at: t("2026-10-23T14:02:00"),
    status: "handed_to_courier",
    payment: "paid",
    provider: "click",
    fulfilment: "delivery",
    items: [
      [B.ceramideCream, 1],
      [B.foam, 2],
      [B.spf50, 1],
    ],
    deliveryFee: 25_000,
    cashbackUsed: 48_600,
    shipment: bts("48213907", 25_000, "2026-10-23T16:40:00"),
    channel: "ios",
    address: "Toshkent, Chilonzor tumani, 9-kvartal, 12-uy, 45-xonadon",
  },
  {
    id: 10247,
    customerId: CUSTOMER_IDS.nilufar,
    at: t("2026-10-23T12:15:00"),
    status: "delivered",
    payment: "paid",
    provider: "payme",
    fulfilment: "pickup",
    items: [
      [B.hyaluronSerum, 1],
      [B.ceramideCream, 1],
      [B.toner, 1],
      [B.sheetMask, 1],
    ],
    deliveryFee: 0,
    cashbackUsed: 0,
    shipment: { state: "not_required" },
    // B-W1: placed on the website («Veb-sayt»).
    channel: "web",
  },
  {
    id: 10246,
    customerId: CUSTOMER_IDS.javohir,
    at: t("2026-10-23T09:48:00"),
    status: "delivered",
    payment: "paid",
    provider: "payme",
    fulfilment: "delivery",
    items: [
      [B.peptideSerum, 2],
      [B.ceramideCream, 2],
      [B.retinol, 1],
      [B.lipBalm, 1],
    ],
    deliveryFee: 25_000,
    cashbackUsed: 20_000,
    shipment: bts("48211544", 25_000, "2026-10-24T10:12:00"),
  },
  {
    id: 10245,
    customerId: CUSTOMER_IDS.kamola,
    at: t("2026-10-22T19:02:00"),
    status: "handed_to_courier",
    payment: "paid",
    provider: "click",
    fulfilment: "delivery",
    items: [
      [B.retinol, 1],
      [B.sheetMask, 1],
      [B.lipBalm, 1],
    ],
    deliveryFee: 25_000,
    cashbackUsed: 0,
    shipment: bts("48209981", 25_000, "2026-10-23T11:30:00"),
  },
  {
    id: 10244,
    customerId: CUSTOMER_IDS.dilshod,
    at: t("2026-10-22T16:37:00"),
    status: "cancelled",
    payment: "refunded",
    provider: "click",
    fulfilment: "delivery",
    items: [
      [B.salicylicGel, 1],
      [B.sheetMask, 1],
    ],
    deliveryFee: 25_000,
    cashbackUsed: 0,
    shipment: { state: "not_created" },
    cancellation: { reason: "admin", note: "Mijoz so‘rovi bilan" },
  },
  {
    id: 10243,
    customerId: CUSTOMER_IDS.sevara,
    at: t("2026-10-22T13:10:00"),
    status: "delivered",
    payment: "paid",
    provider: "payme",
    fulfilment: "delivery",
    items: [
      [B.spf50, 1],
      [B.ceramideCream, 1],
      [B.salicylicGel, 1],
      [B.spf30, 1],
    ],
    deliveryFee: 25_000,
    cashbackUsed: 0,
    shipment: bts("48207320", 25_000, "2026-10-23T15:05:00"),
  },
];

/** Older orders that Malika's cashback history refers to. */
const MALIKA_HISTORY: OrderSeed[] = [
  {
    id: 10231,
    customerId: CUSTOMER_IDS.malika,
    at: t("2026-10-18T15:20:00"),
    status: "delivered",
    payment: "paid",
    provider: "payme",
    fulfilment: "pickup",
    items: [
      [B.hyaluronSerum, 1],
      [B.salicylicGel, 1],
    ],
    deliveryFee: 0,
    cashbackUsed: 20_000,
    shipment: { state: "not_required" },
  },
  {
    id: 10198,
    customerId: CUSTOMER_IDS.malika,
    at: t("2026-10-02T14:31:00"),
    status: "cancelled",
    payment: "refunded",
    provider: "click",
    fulfilment: "delivery",
    items: [[B.toner, 1]],
    deliveryFee: 25_000,
    cashbackUsed: 0,
    shipment: { state: "not_created" },
    cancellation: { reason: "admin", note: "Mijoz so‘rovi bilan" },
  },
];

/** Tab counts drawn on the orders screen. */
export const ORDER_STATUS_TOTALS: Record<OrderStatus, number> = {
  awaiting_payment: 6,
  processing: 12,
  handed_to_courier: 9,
  delivered: 1198,
  cancelled: 59,
};

const DISTRICTS = [
  "Chilonzor tumani",
  "Yunusobod tumani",
  "Mirzo Ulug‘bek tumani",
  "Yakkasaroy tumani",
  "Shayxontohur tumani",
  "Olmazor tumani",
  "Sergeli tumani",
  "Mirobod tumani",
  "Uchtepa tumani",
  "Yashnobod tumani",
];

function randomAddress(random: Random): string {
  return `Toshkent, ${random.pick(DISTRICTS)}, ${random.int(1, 24)}-kvartal, ${random.int(1, 60)}-uy, ${random.int(1, 90)}-xonadon`;
}

/** Spread generated orders over 1–22 October, 09:00–22:00 Tashkent time. */
function businessTimes(count: number, random: Random): string[] {
  const DAY_START = 9 * 60;
  const DAY_END = 22 * 60;
  const perDay = DAY_END - DAY_START;
  const firstDay = Date.UTC(2026, 9, 1);
  const available = 21 * perDay + (13 * 60 - DAY_START);
  const step = available / count;
  return Array.from({ length: count }, (_, i) => {
    // i = 0 is the most recent order, just before 13:00 on 22 October.
    const offset = Math.max(0, available - (i + 1) * step + (random.next() - 0.5) * step * 0.8);
    const day = Math.floor(offset / perDay);
    const minute = DAY_START + Math.floor(offset % perDay);
    const local = new Date(firstDay + day * 86_400_000 + minute * 60_000);
    return `${local.toISOString().slice(0, 16)}:00+05:00`;
  });
}

function generateSeeds(): OrderSeed[] {
  const random = createRandom(1284);
  const fixed = [...DESIGN_ORDERS, ...MALIKA_HISTORY];
  const fixedIds = new Set(fixed.map((o) => o.id));
  const total = Object.values(ORDER_STATUS_TOTALS).reduce((a, b) => a + b, 0);
  const remaining = { ...ORDER_STATUS_TOTALS };
  for (const order of fixed) remaining[order.status] -= 1;

  const generatedCount = total - fixed.length;
  // Open orders are recent; the rest are delivered or cancelled.
  const open: OrderStatus[] = random.shuffle([
    ...Array<OrderStatus>(remaining.awaiting_payment).fill("awaiting_payment"),
    ...Array<OrderStatus>(remaining.processing).fill("processing"),
    ...Array<OrderStatus>(remaining.handed_to_courier).fill("handed_to_courier"),
  ]);
  const closed: OrderStatus[] = random.shuffle([
    ...Array<OrderStatus>(remaining.delivered).fill("delivered"),
    ...Array<OrderStatus>(remaining.cancelled).fill("cancelled"),
  ]);
  const statuses = [...open, ...closed];

  const ids: number[] = [];
  for (let id = 10242; ids.length < generatedCount; id--) if (!fixedIds.has(id)) ids.push(id);
  const times = businessTimes(generatedCount, random);
  const shoppers = CUSTOMERS.filter((c) => c.id !== CUSTOMER_IDS.malika);
  const buyable = PRODUCTS.filter((p) => p.status === "active");
  let tracking = 48207000;
  let failedShipmentLeft = 1;

  const generated = ids.map((id, index): OrderSeed => {
    const status = statuses[index] ?? "delivered";
    const fulfilment: FulfilmentMethod = random.chance(0.75) ? "delivery" : "pickup";
    const lines = random.int(1, 4);
    const items = random
      .shuffle(buyable)
      .slice(0, lines)
      .map((p): [string, number] => [p.billzId, random.chance(0.85) ? 1 : 2]);
    const expired = status === "cancelled" && random.chance(0.6);
    const payment: PaymentStatus =
      status === "awaiting_payment"
        ? "pending"
        : status === "cancelled"
          ? expired
            ? "failed"
            : "refunded"
          : "paid";
    const paid = payment === "paid" || payment === "refunded";

    let shipment: Shipment = { state: "not_required" };
    if (fulfilment === "delivery") {
      if (!paid) shipment = { state: "not_created" };
      else if (status === "processing" && failedShipmentLeft > 0) {
        failedShipmentLeft -= 1;
        shipment = { state: "failed", lastAttemptAt: times[index]! };
      } else if (status === "cancelled") shipment = { state: "not_created" };
      else
        shipment = bts(
          String(tracking--),
          random.int(18, 35) * 1000,
          times[index]!.slice(0, 16) + ":00",
        );
    }

    return {
      id,
      customerId: random.pick(shoppers).id,
      at: times[index]!,
      status,
      payment,
      provider: random.chance(0.5) ? "click" : "payme",
      fulfilment,
      items,
      deliveryFee: fulfilment === "delivery" ? random.int(18, 35) * 1000 : 0,
      cashbackUsed: paid && random.chance(0.15) ? random.int(50, 500) * 100 : 0,
      shipment,
      cancellation:
        status === "cancelled"
          ? expired
            ? { reason: "reservation_expired" }
            : { reason: "admin", note: "Mijoz so‘rovi bilan" }
          : undefined,
      channel: random.chance(0.55) ? "ios" : "android",
      address: fulfilment === "delivery" ? randomAddress(random) : undefined,
    };
  });

  return [...fixed, ...generated].sort((a, b) => b.id - a.id);
}

function toItems(seed: OrderSeed): OrderItem[] {
  return seed.items.map(([billzId, quantity]) => {
    const product = productByBillzId(billzId);
    return {
      productId: product.id,
      name: product.texts.uz.name || product.billzName,
      art: product.art,
      billzId,
      quantity,
      unitPrice: product.price,
      promo: product.promo,
    };
  });
}

function totalOf(seed: OrderSeed): number {
  return itemsSubtotal(toItems(seed)) + seed.deliveryFee - seed.cashbackUsed;
}

/**
 * Refunds still open or failed, for the payments screen and the order
 * detail. Four older admin-cancelled orders whose refund did not settle
 * (Click `failed`, Click `unknown`, Payme `manual_required`, and a Click
 * refund created `manual_required` because the payment has no Click payment
 * id — contract §2.2, M2) keep their payment `paid` until the refund
 * succeeds; one older expired reservation was paid late (a Click capture
 * after the expiry, customer contract §2.13.0) and is refunded by hand while
 * Click is in test mode. Together they carry the three `manual_reason`s
 * (§4: `payme`, `no_paydoc`, `fake_mode`).
 */
interface OpenRefund {
  state: RefundState;
  /** `manual_required` refunds: why (the `refund_requested` event's `manual_reason`). */
  reason?: ManualRefundReason;
  /** The payment was captured after the reservation expired; the order stays cancelled. */
  lateCapture?: boolean;
}

const OPEN_REFUNDS = new Map<number, OpenRefund>();

function withOpenRefunds(seeds: OrderSeed[]): OrderSeed[] {
  const cancelledByAdmin = seeds.filter(
    (s) =>
      s.id < 10_240 &&
      s.status === "cancelled" &&
      s.payment === "refunded" &&
      s.cancellation?.reason === "admin",
  );
  const expired = seeds.filter(
    (s) =>
      s.id < 10_240 &&
      s.status === "cancelled" &&
      s.payment === "failed" &&
      s.cancellation?.reason === "reservation_expired",
  );
  const plan: Array<[PaymentProvider, OpenRefund]> = [
    ["click", { state: "failed" }],
    ["click", { state: "unknown" }],
    ["payme", { state: "manual_required", reason: "payme" }],
    ["click", { state: "manual_required", reason: "no_paydoc" }],
    ["click", { state: "manual_required", reason: "fake_mode", lateCapture: true }],
  ];
  for (const [provider, refund] of plan) {
    const pool = refund.lateCapture ? expired : cancelledByAdmin;
    const seed = pool.find((s) => s.provider === provider && !OPEN_REFUNDS.has(s.id));
    if (!seed) continue;
    OPEN_REFUNDS.set(seed.id, refund);
    seed.payment = "paid";
  }
  return seeds;
}

/** Whether the order's payment was captured after its reservation expired (always refunded). */
export function isLateCapture(seed: Pick<OrderSeed, "id">): boolean {
  return OPEN_REFUNDS.get(seed.id)?.lateCapture === true;
}

/** The demo's exception queue (Yandex Delivery plan §3.9), filled by `withYandexDeliveries`. */
const ISSUES: DeliveryIssue[] = [];

/**
 * Yandex Delivery demo (plan §3.10): ten generated paid delivery orders
 * (not the design's, nor one with an open refund) go with a Yandex courier
 * at every interesting stage, with the queue's issues; one delivered BTS
 * order carries a resolved staff incident.
 */
function withYandexDeliveries(seeds: OrderSeed[]): OrderSeed[] {
  const candidates = seeds.filter(
    (s) =>
      s.id < 10_243 &&
      s.customerId !== CUSTOMER_IDS.malika &&
      s.fulfilment === "delivery" &&
      s.payment === "paid" &&
      s.shipment.state !== "failed" &&
      !OPEN_REFUNDS.has(s.id),
  );
  const plan = planYandexDeliveries(candidates);
  for (const seed of seeds) {
    const yandex = plan.deliveries.get(seed.id);
    if (!yandex) continue;
    seed.yandex = yandex;
    seed.shipment = yandexShipment(yandex, seed);
  }
  ISSUES.push(...plan.issues);
  const bts = candidates.find((s) => s.status === "delivered" && !plan.deliveries.has(s.id));
  if (bts) ISSUES.push(btsIncident(bts, 500));
  return seeds;
}

export const ORDER_SEEDS: ReadonlyArray<OrderSeed> = withYandexDeliveries(
  withOpenRefunds(generateSeeds()),
);

/** Every demo delivery issue, open and resolved (`delivery/issues/`). */
export const DELIVERY_ISSUES: ReadonlyArray<DeliveryIssue> = ISSUES;

/** The carrier view of a seed (`delivery`), with its open issues. */
export function deliveryOfSeed(seed: OrderSeed): Order["delivery"] {
  return deliveryView(
    seed.fulfilment,
    seed.yandex,
    ISSUES.filter((issue) => issue.orderId === seed.id),
  );
}

/** When the order was delivered (matches the history row below); `null` while it is not. */
export function deliveredAtOf(seed: OrderSeed): string | null {
  if (seed.status !== "delivered") return null;
  if (seed.yandex) return plusMinutes(seed.at, seed.yandex.method === "express" ? 80 : 140);
  return plusMinutes(seed.at, seed.fulfilment === "delivery" ? 26 * 60 : 5 * 60);
}

/** Payment id of an order's payment: №10248 → 301, as in the contract's example. */
export const paymentIdOf = (orderId: number) => orderId - 9_947;
/** Refund id of an order's (first) refund. */
const refundIdOf = (orderId: number) => orderId - 10_000;

/** When the order was cancelled (matches the history row below). */
function cancelledAt(seed: OrderSeed): string {
  return plusMinutes(seed.at, seed.cancellation?.reason === "reservation_expired" ? 15 : 60);
}

/**
 * The order's refunds, newest first: a settled one for `refunded`, or the
 * open demo refund. Like the API's `Refund.manual_reason` (M3), every Payme
 * refund says `payme` (a cabinet refund, also once settled) and a manual
 * Click refund says why.
 */
export function refundsOf(seed: OrderSeed): Refund[] {
  const open = OPEN_REFUNDS.get(seed.id);
  if (seed.payment !== "refunded" && !open) return [];
  const requestedAt = open?.lateCapture ? confirmedAtOf(seed)! : cancelledAt(seed);
  const state: RefundState = open?.state ?? "succeeded";
  const updatedAt = plusMinutes(requestedAt, state === "manual_required" ? 0 : 4);
  const manualReason = open?.reason ?? (seed.provider === "payme" ? "payme" : undefined);
  return [
    {
      id: refundIdOf(seed.id),
      state,
      provider: seed.provider,
      amount: totalOf(seed),
      requestedAt,
      updatedAt,
      completedAt: state === "succeeded" ? updatedAt : undefined,
      ...(manualReason ? { manualReason } : {}),
    },
  ];
}

/** Provider transaction id of a paid order (№10248 keeps the contract's value). */
export function transactionIdOf(seed: OrderSeed): string | undefined {
  const paid = seed.payment === "paid" || seed.payment === "refunded";
  if (!paid) return undefined;
  if (seed.id === 10248) return "CLK-7741920385";
  return `${seed.provider === "click" ? "CLK" : "PME"}-${String(7_741_000_000 + seed.id * 37).slice(0, 10)}`;
}

/**
 * Payment confirmation time for a paid order: 3 minutes after checkout, or
 * 20 minutes for a capture that arrived after the 15-minute reservation.
 */
export function confirmedAtOf(seed: OrderSeed): string | undefined {
  const paid = seed.payment === "paid" || seed.payment === "refunded";
  if (!paid) return undefined;
  return plusMinutes(seed.at, isLateCapture(seed) ? 20 : 3);
}

export function orderTotalOf(seed: OrderSeed): number {
  return totalOf(seed);
}

export const ORDER_SUMMARIES: ReadonlyArray<OrderSummary> = ORDER_SEEDS.map((seed) => ({
  id: seed.id,
  customer: customerRef(seed.customerId),
  createdAt: seed.at,
  total: totalOf(seed),
  status: seed.status,
  payment: { status: seed.payment, provider: seed.provider },
  fulfilment: seed.fulfilment,
  shipment: seed.shipment,
  cancellation: seed.cancellation,
  delivery: deliveryOfSeed(seed),
}));

const PROVIDER_NAME: Record<PaymentProvider, string> = { click: "Click", payme: "Payme" };

const plusMinutes = (iso: string, minutes: number) =>
  `${new Date(new Date(iso).getTime() + minutes * 60_000).toISOString().slice(0, 19)}Z`;

/**
 * Status history and cashback entries derived from the order's facts, worded in `locale` like the
 * API mapper words the backend's events (`foldOrderHistory`).
 */
export function orderDetailIn(seed: OrderSeed, locale: Locale): Order {
  const h = orderHistoryCopy[locale];
  const labels = orderLabelsCopy[locale];
  const fmt = createFormatter(locale);
  const items = toItems(seed);
  const subtotal = itemsSubtotal(items);
  const promo = promoSubtotal(items);
  const openRefund = OPEN_REFUNDS.get(seed.id);
  const lateCapture = openRefund?.lateCapture === true;
  // A late capture never confirms the order: no "Jarayonda" row, no cashback.
  const paid = (seed.payment === "paid" || seed.payment === "refunded") && !lateCapture;
  const confirmedAt = confirmedAtOf(seed);
  const refunds = refundsOf(seed);
  const delivery = deliveryOfSeed(seed);
  const credit = calculateCashback(
    {
      amount: subtotal,
      promoAmount: promo,
      paidWithCashback: seed.cashbackUsed,
      lifetimeBefore: 0,
    },
    ACTIVE_POLICY,
  );
  // The detail screen's sample order shows the credit computed on the whole
  // non-promotional amount; keep that record as drawn.
  const creditBase = seed.id === 10248 ? subtotal - promo : credit.eligible;
  const creditAmount = seed.id === 10248 ? Math.floor(creditBase / 100) : credit.amount;

  const history: OrderEvent[] = [
    {
      at: seed.at,
      title: labels.status.awaiting_payment,
      source: "system",
      status: "awaiting_payment",
      note: h.reserved(items.length, 15),
    },
  ];
  if (paid && confirmedAt) {
    history.push({
      at: confirmedAt,
      title: labels.status.processing,
      source: "system",
      status: "processing",
      note: [
        h.paymentConfirmed(PROVIDER_NAME[seed.provider]),
        h.reservationConverted,
        h.billzRecorded,
        h.cashbackCredited(fmt.number(creditAmount)),
      ].join(" · "),
    });
  }
  const yandex = seed.yandex;
  if (yandex) {
    // Staff called the courier after packing (plan §3.6); the claim id is the tracking number.
    // A claim parked for price review writes no order event (only the review issue).
    if (yandex.claimNumber !== null && yandex.claimStatus !== "ready_for_approval") {
      history.push({
        at: plusMinutes(seed.at, 41),
        title: yandex.claimId ? h.courierCalled : h.courierNotCalled,
        source: yandex.claimId ? "admin" : "yandex",
        note: yandex.claimId
          ? `Yandex · ${h.claim(yandex.claimId)}`
          : `Yandex · ${yandex.failureCode ?? h.error}`,
      });
    }
  } else if (seed.shipment.state === "created") {
    history.push({
      at: plusMinutes(seed.at, 4),
      title: h.btsCreated,
      source: "system",
      note: h.trackingNumber(seed.shipment.trackingNumber),
    });
  }
  if (seed.shipment.state === "failed") {
    history.push({
      at: seed.shipment.lastAttemptAt,
      title: h.btsFailed,
      source: "system",
      note: h.autoAttemptFailed,
    });
  }
  if (seed.status === "handed_to_courier" || seed.status === "delivered") {
    if (yandex) {
      history.push({
        at: plusMinutes(seed.at, 60),
        title: labels.status.handed_to_courier,
        source: "yandex",
        status: "handed_to_courier",
        note: `Polling · ${h.pushSent}`,
      });
      if (yandex.stage === "returning") {
        history.push({
          at: plusMinutes(seed.at, 150),
          title: h.deliveryFailed,
          source: "yandex",
          note: "Yandex · returning · recipient_unreachable",
        });
      }
    } else if (seed.fulfilment === "delivery") {
      const handedAt =
        seed.shipment.state === "created" && seed.status === "handed_to_courier"
          ? seed.shipment.updatedAt
          : plusMinutes(seed.at, 158);
      history.push({
        at: handedAt,
        title: labels.status.handed_to_courier,
        source: "bts",
        status: "handed_to_courier",
        note: `Webhook · ${h.pushSent}`,
      });
    }
  }
  const deliveredAt = deliveredAtOf(seed);
  if (deliveredAt) {
    const carrier = yandex ? "yandex" : seed.fulfilment === "delivery" ? "bts" : null;
    history.push({
      at: deliveredAt,
      title: labels.status.delivered,
      source: carrier ?? "admin",
      status: "delivered",
      note: carrier
        ? `${carrier === "yandex" ? "Polling" : "Webhook"} · ${h.pushSent}`
        : `${h.admin} · ${h.handedToCustomer}`,
    });
  }
  if (seed.status === "cancelled") {
    const expired = seed.cancellation?.reason === "reservation_expired";
    history.push({
      at: cancelledAt(seed),
      title: labels.status.cancelled,
      source: expired ? "system" : "admin",
      status: "cancelled",
      note: expired
        ? h.reservationExpired
        : `${h.admin} · ${h.refundRequestSent}, ${h.cashbackReversed}`,
    });
    const refund = refunds[0];
    if (refund && lateCapture) {
      // Not folded: no `cancelled` event names this refund (§4).
      history.push({
        at: refund.requestedAt,
        title: h.refundRequested,
        source: "system",
        note: `${PROVIDER_NAME[seed.provider]} · ${fmt.som(refund.amount)}${
          openRefund?.reason ? ` · ${labels.manualRefundNote[openRefund.reason]}` : ""
        }`,
      });
    } else if (refund && refund.state === "succeeded") {
      history.push({
        at: refund.updatedAt,
        title: h.refundSucceeded,
        source: "system",
        note: `${PROVIDER_NAME[seed.provider]} · ${fmt.som(refund.amount)}`,
      });
    } else if (refund && (refund.state === "failed" || refund.state === "unknown")) {
      history.push({
        at: refund.updatedAt,
        title: h.refundFailed,
        source: "system",
        note: `${PROVIDER_NAME[seed.provider]} · ${
          refund.state === "unknown" ? h.refundUnknown : h.refundError
        }`,
      });
    }
  }

  const cashback: Order["cashback"] = [];
  if (seed.cashbackUsed > 0) {
    cashback.push({ kind: "debit", amount: -seed.cashbackUsed, label: h.cashbackUsed });
  }
  if (paid && creditAmount > 0) {
    cashback.push({
      kind: "credit",
      amount: creditAmount,
      label: `1% × ${fmt.number(creditBase)}`,
    });
  }
  if (seed.payment === "refunded" || (openRefund && !lateCapture)) {
    for (const entry of [...cashback]) {
      cashback.push({ kind: "reversal", amount: -entry.amount, label: h.cashbackReversal });
    }
  }

  return {
    id: seed.id,
    customer: customerRef(seed.customerId),
    createdAt: seed.at,
    total: totalOf(seed),
    status: seed.status,
    payment: {
      status: seed.payment,
      provider: seed.provider,
      transactionId: transactionIdOf(seed),
      confirmedAt,
      amount: totalOf(seed),
    },
    fulfilment: seed.fulfilment,
    shipment: seed.shipment,
    cancellation: seed.cancellation,
    channel: seed.channel ?? "ios",
    address: seed.address ?? (seed.fulfilment === "delivery" ? "Toshkent" : undefined),
    items,
    deliveryFee: seed.deliveryFee,
    cashbackUsed: seed.cashbackUsed,
    refunds,
    history: history.reverse(),
    cashback,
    delivery,
    availableActions: orderActions({ ...seed, delivery }),
  };
}

/** The order detail in Uzbek (one argument, so it also works as a `map` callback). */
export function buildOrderDetail(seed: OrderSeed): Order {
  return orderDetailIn(seed, "uz");
}

export function orderSeed(id: number): OrderSeed | undefined {
  return ORDER_SEEDS.find((seed) => seed.id === id);
}
