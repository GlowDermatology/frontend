import { calculateCashback } from "@/domain/cashback";
import {
  itemsSubtotal,
  orderActions,
  promoSubtotal,
  type CancellationReason,
  type FulfilmentMethod,
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
import { formatNumber, formatSom } from "@/lib/format";

import { ACTIVE_POLICY } from "./cashback";
import { PRODUCTS, productByBillzId } from "./catalog";
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
 * detail: three older admin-cancelled orders whose refund did not settle
 * (Click `failed`, Click `unknown`, Payme `manual_required`). Their payment
 * stays `paid` until the refund succeeds (contract §2.2).
 */
const OPEN_REFUNDS = new Map<number, RefundState>();

function withOpenRefunds(seeds: OrderSeed[]): OrderSeed[] {
  const candidates = seeds.filter(
    (s) =>
      s.id < 10_240 &&
      s.status === "cancelled" &&
      s.payment === "refunded" &&
      s.cancellation?.reason === "admin",
  );
  const pick = (provider: PaymentProvider, skip: number) =>
    candidates.filter((s) => s.provider === provider && !OPEN_REFUNDS.has(s.id))[skip];
  const plan: Array<[PaymentProvider, RefundState]> = [
    ["click", "failed"],
    ["click", "unknown"],
    ["payme", "manual_required"],
  ];
  for (const [provider, state] of plan) {
    const seed = pick(provider, 0);
    if (!seed) continue;
    OPEN_REFUNDS.set(seed.id, state);
    seed.payment = "paid";
  }
  return seeds;
}

export const ORDER_SEEDS: ReadonlyArray<OrderSeed> = withOpenRefunds(generateSeeds());

/** Payment id of an order's payment: №10248 → 301, as in the contract's example. */
export const paymentIdOf = (orderId: number) => orderId - 9_947;
/** Refund id of an order's (first) refund. */
const refundIdOf = (orderId: number) => orderId - 10_000;

/** When the order was cancelled (matches the history row below). */
function cancelledAt(seed: OrderSeed): string {
  return plusMinutes(seed.at, seed.cancellation?.reason === "reservation_expired" ? 15 : 60);
}

/** The order's refunds, newest first: a settled one for `refunded`, or the open demo refund. */
export function refundsOf(seed: OrderSeed): Refund[] {
  const open = OPEN_REFUNDS.get(seed.id);
  if (seed.payment !== "refunded" && !open) return [];
  const requestedAt = cancelledAt(seed);
  const state: RefundState = open ?? "succeeded";
  const updatedAt = plusMinutes(requestedAt, state === "manual_required" ? 0 : 4);
  return [
    {
      id: refundIdOf(seed.id),
      state,
      provider: seed.provider,
      amount: totalOf(seed),
      requestedAt,
      updatedAt,
      completedAt: state === "succeeded" ? updatedAt : undefined,
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

/** Payment confirmation time (3 minutes after checkout) for a paid order. */
export function confirmedAtOf(seed: OrderSeed): string | undefined {
  const paid = seed.payment === "paid" || seed.payment === "refunded";
  return paid ? plusMinutes(seed.at, 3) : undefined;
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
}));

const PROVIDER_NAME: Record<PaymentProvider, string> = { click: "Click", payme: "Payme" };

const plusMinutes = (iso: string, minutes: number) =>
  `${new Date(new Date(iso).getTime() + minutes * 60_000).toISOString().slice(0, 19)}Z`;

/** Status history and cashback entries derived from the order's facts. */
export function buildOrderDetail(seed: OrderSeed): Order {
  const items = toItems(seed);
  const subtotal = itemsSubtotal(items);
  const promo = promoSubtotal(items);
  const paid = seed.payment === "paid" || seed.payment === "refunded";
  const confirmedAt = confirmedAtOf(seed);
  const refunds = refundsOf(seed);
  const openRefund = OPEN_REFUNDS.get(seed.id);
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
      title: "To‘lov kutilmoqda",
      source: "system",
      status: "awaiting_payment",
      note: `Qoldiq qayta tekshirildi · ${items.length} ta mahsulot 15 daqiqaga band qilindi`,
    },
  ];
  if (paid && confirmedAt) {
    history.push({
      at: confirmedAt,
      title: "Jarayonda",
      source: "system",
      status: "processing",
      note: `${PROVIDER_NAME[seed.provider]} to‘lovi tasdiqlandi · band qilish savdoga aylantirildi · Billz’ga yozildi · cashback +${formatNumber(creditAmount)}`,
    });
  }
  if (seed.shipment.state === "created") {
    history.push({
      at: plusMinutes(seed.at, 4),
      title: "BTS buyurtmasi yaratildi",
      source: "system",
      note: `Yetkazish raqami ${seed.shipment.trackingNumber}`,
    });
  }
  if (seed.shipment.state === "failed") {
    history.push({
      at: seed.shipment.lastAttemptAt,
      title: "BTS ga yuborilmadi",
      source: "system",
      note: "Avtomatik urinish muvaffaqiyatsiz · administratorga xabar berildi",
    });
  }
  if (seed.status === "handed_to_courier" || seed.status === "delivered") {
    if (seed.fulfilment === "delivery") {
      const handedAt =
        seed.shipment.state === "created" && seed.status === "handed_to_courier"
          ? seed.shipment.updatedAt
          : plusMinutes(seed.at, 158);
      history.push({
        at: handedAt,
        title: "Kuryerga topshirildi",
        source: "bts",
        status: "handed_to_courier",
        note: "Webhook · mijozga push yuborildi",
      });
    }
  }
  if (seed.status === "delivered") {
    history.push({
      at: plusMinutes(seed.at, seed.fulfilment === "delivery" ? 26 * 60 : 5 * 60),
      title: "Yetkazildi",
      source: seed.fulfilment === "delivery" ? "bts" : "admin",
      status: "delivered",
      note:
        seed.fulfilment === "delivery"
          ? "Webhook · mijozga push yuborildi"
          : "Administrator · mijozga topshirildi",
    });
  }
  if (seed.status === "cancelled") {
    const expired = seed.cancellation?.reason === "reservation_expired";
    history.push({
      at: cancelledAt(seed),
      title: "Bekor qilindi",
      source: expired ? "system" : "admin",
      status: "cancelled",
      note: expired
        ? "Band muddati tugadi · mahsulotlar bo‘shatildi"
        : "Administrator · to‘lov qaytarish so‘rovi yuborildi, cashback yozuvlari qaytarildi",
    });
    const refund = refunds[0];
    if (refund && refund.state === "succeeded") {
      history.push({
        at: refund.updatedAt,
        title: "To‘lov qaytarildi",
        source: "system",
        note: `${PROVIDER_NAME[seed.provider]} · ${formatSom(refund.amount)}`,
      });
    } else if (refund && (refund.state === "failed" || refund.state === "unknown")) {
      history.push({
        at: refund.updatedAt,
        title: "To‘lov qaytarilmadi",
        source: "system",
        note:
          refund.state === "unknown"
            ? `${PROVIDER_NAME[seed.provider]} · holat noma’lum, tekshirish kerak`
            : `${PROVIDER_NAME[seed.provider]} · xato, administrator tekshiruvi kerak`,
      });
    }
  }

  const cashback: Order["cashback"] = [];
  if (seed.cashbackUsed > 0) {
    cashback.push({ kind: "debit", amount: -seed.cashbackUsed, label: "Ishlatildi" });
  }
  if (paid && creditAmount > 0) {
    cashback.push({
      kind: "credit",
      amount: creditAmount,
      label: `1% × ${formatNumber(creditBase)}`,
    });
  }
  if (seed.payment === "refunded" || openRefund) {
    for (const entry of [...cashback]) {
      cashback.push({ kind: "reversal", amount: -entry.amount, label: "Qarama-qarshi yozuv" });
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
    availableActions: orderActions(seed),
  };
}

export function orderSeed(id: number): OrderSeed | undefined {
  return ORDER_SEEDS.find((seed) => seed.id === id);
}
