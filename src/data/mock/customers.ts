import {
  ledgerBalance,
  nextTier,
  rateFor,
  withBalanceAfter,
  type LedgerEntry,
} from "@/domain/cashback";
import {
  DELETED_CUSTOMER_LABEL,
  type Customer,
  type CustomerPurchase,
  type CustomerTier,
} from "@/domain/customer";
import { formatNumber } from "@/lib/format";

import { ACTIVE_POLICY, MALIKA_LEDGER } from "./cashback";
import { buildOrderDetail, ORDER_SEEDS } from "./orders";
import { CUSTOMER_IDS, CUSTOMERS, customerRef } from "./people";
import { createRandom } from "./random";

/**
 * Six accounts deleted by their owners, like the backend seed: generated
 * customers without online orders (so no order screen changes). Their card
 * keeps the phone, ledger and purchases; the name is scrubbed.
 */
const WITH_ORDERS = new Set(ORDER_SEEDS.map((seed) => seed.customerId));
export const DELETED_CUSTOMER_IDS: ReadonlySet<string> = new Set(
  CUSTOMERS.filter((c) => !WITH_ORDERS.has(c.id))
    .slice(-6)
    .map((c) => c.id),
);

/** The card's tier block from the active policy (the backend computes it server-side). */
function tierFor(lifetime: number): CustomerTier {
  const { tiers, version } = ACTIVE_POLICY;
  const next = nextTier(tiers, lifetime);
  return {
    percent: rateFor(tiers, lifetime),
    policyVersion: version,
    next: next && {
      percent: next.tier.percent,
      from: next.tier.from,
      remaining: next.remaining,
      progress: next.progress,
    },
  };
}

/** Balance fields and `balanceAfter` from the fixture ledger (no holds in the demo). */
function withBalances<C extends Omit<Customer, "tier" | "balance" | "held" | "available">>(
  customer: C,
): Customer {
  const balance = ledgerBalance(customer.ledger);
  return {
    ...customer,
    ledger: withBalanceAfter(customer.ledger),
    tier: tierFor(customer.totals.store + customer.totals.online),
    balance,
    held: 0,
    available: balance,
  };
}

const t = (iso: string) => `${iso}+05:00`;

/** Purchases tab rows as drawn, plus the older purchases behind the ledger. */
const MALIKA_PURCHASES: CustomerPurchase[] = [
  {
    id: "p-10248",
    at: t("2026-10-23T14:05:00"),
    source: "online",
    document: "№10248",
    orderId: 10248,
    amount: 808_000,
    promoAmount: 240_000,
    cashback: 5_680,
  },
  {
    id: "p-88213",
    at: t("2026-10-21T11:47:00"),
    source: "store_qr",
    document: "S-88213",
    amount: 231_000,
    promoAmount: 0,
    cashback: 2_310,
  },
  {
    id: "p-10231",
    at: t("2026-10-18T15:25:00"),
    source: "online",
    document: "№10231",
    orderId: 10231,
    amount: 314_000,
    promoAmount: 0,
    cashback: 3_140,
  },
  {
    id: "p-86540",
    at: t("2026-10-09T13:40:00"),
    source: "store_qr",
    document: "S-86540",
    amount: 412_000,
    promoAmount: 0,
    cashback: 4_120,
  },
  {
    id: "p-81377",
    at: t("2026-09-14T12:20:00"),
    source: "store_qr",
    document: "S-81377",
    amount: 864_000,
    promoAmount: 0,
    cashback: 8_640,
  },
  {
    id: "p-76102",
    at: t("2026-08-02T17:05:00"),
    source: "store_qr",
    document: "S-76102",
    amount: 621_000,
    promoAmount: 0,
    cashback: 6_210,
  },
];

function malika(): Customer {
  return withBalances({
    ...customerRef(CUSTOMER_IDS.malika),
    status: "active",
    registeredAt: t("2025-03-12T10:20:00"),
    language: "uz",
    address: "Toshkent, Chilonzor, 9-kvartal",
    totals: { store: 9_940_000, online: 3_640_000 },
    onlineOrders: {
      count: 12,
      lastOrderId: 10248,
      lastOrderAt: t("2026-10-23T14:02:00"),
      allCount: 13,
    },
    upcomingAppointments: 1,
    groups: ["Doimiy mijozlar", "10 mln+ xarid"],
    ledger: [...MALIKA_LEDGER],
    purchases: MALIKA_PURCHASES,
    device: {
      platform: "ios",
      model: "iPhone 14",
      os: "iOS 18.1",
      appVersion: "1.0.0",
      lastActiveAt: t("2026-10-24T09:12:00"),
      pushEnabled: true,
    },
    devices: [
      {
        id: "5",
        platform: "ios",
        model: "iPhone 14",
        os: "iOS 18.1",
        appVersion: "1.0.0",
        pushEnabled: true,
        isActive: true,
        lastActiveAt: t("2026-10-24T09:12:00"),
        createdAt: t("2025-03-12T10:20:00"),
      },
      {
        // B-W1: a website browser is a device too (`platform: "web"`).
        id: "8",
        platform: "web",
        model: "Chrome",
        os: "Windows",
        appVersion: "",
        pushEnabled: false,
        isActive: true,
        lastActiveAt: t("2026-10-23T21:05:00"),
        createdAt: t("2026-09-02T19:30:00"),
      },
      {
        id: "3",
        platform: "android",
        model: "Samsung Galaxy A54",
        os: "Android 14",
        appVersion: "0.9.2",
        pushEnabled: false,
        isActive: false,
        lastActiveAt: t("2025-11-02T18:40:00"),
        createdAt: t("2025-03-01T09:00:00"),
      },
    ],
  });
}

/** Card for any other customer, derived from their online orders. */
function fromOrders(id: string): Customer {
  const ref = customerRef(id);
  const random = createRandom(Number(id) * 97);
  const orders = ORDER_SEEDS.filter((seed) => seed.customerId === id).map(buildOrderDetail);
  const ledger: LedgerEntry[] = [];
  const purchases: CustomerPurchase[] = [];
  let online = 0;

  for (const order of orders) {
    const settled =
      order.status === "delivered" ||
      order.status === "handed_to_courier" ||
      order.status === "processing";
    for (const entry of order.cashback) {
      ledger.push({
        id: `${order.id}-${entry.kind}`,
        at: order.payment.confirmedAt ?? order.createdAt,
        kind: entry.kind === "reversal" ? "reversal" : entry.kind,
        source: `Buyurtma №${order.id}`,
        orderId: order.id,
        note:
          entry.kind === "debit"
            ? "To‘lovning bir qismi"
            : entry.kind === "reversal"
              ? "Buyurtma bekor qilindi · cashback qaytarildi"
              : `${entry.label.replace("1% × ", "")} so‘m · 1%`,
        amount: entry.amount,
      });
    }
    if (!settled) continue;
    const amount = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    online += amount;
    purchases.push({
      id: `p-${order.id}`,
      at: order.payment.confirmedAt ?? order.createdAt,
      source: "online",
      document: `№${order.id}`,
      orderId: order.id,
      amount,
      promoAmount: order.items
        .filter((i) => i.promo)
        .reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      cashback: order.cashback.find((e) => e.kind === "credit")?.amount ?? 0,
    });
  }

  // A plausible in-store history so balances are not only online credits.
  const store = random.int(0, 60) * 50_000;
  if (store > 0) {
    const credit = Math.floor(store / 100);
    ledger.push({
      id: `${id}-store`,
      at: t("2026-09-05T12:00:00"),
      kind: "credit",
      source: `Billz savdo S-${80_000 + Number(id) * 7}`,
      note: `Chek ${formatNumber(store)} so‘m · 1%`,
      amount: credit,
    });
    purchases.push({
      id: `p-store-${id}`,
      at: t("2026-09-05T12:00:00"),
      source: "store_qr",
      document: `S-${80_000 + Number(id) * 7}`,
      amount: store,
      promoAmount: 0,
      cashback: credit,
    });
  }

  ledger.sort((a, b) => b.at.localeCompare(a.at));
  purchases.sort((a, b) => b.at.localeCompare(a.at));
  const last = orders[0];
  const lifetime = store + online;

  const deleted = DELETED_CUSTOMER_IDS.has(id);
  // Drawn in the fixtures' original order (registration, language, device),
  // so every generated customer keeps its values.
  const registeredAt = t(
    `2025-${String(random.int(1, 12)).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}T12:00:00`,
  );
  const language: Customer["language"] = random.chance(0.75) ? "uz" : "ru";
  const phone = random.chance(0.55)
    ? { platform: "ios" as const, model: "iPhone 13", os: "iOS 18.1", appVersion: "1.0.0" }
    : {
        platform: "android" as const,
        model: "Samsung Galaxy A54",
        os: "Android 14",
        appVersion: "1.0.0",
      };
  const pushEnabled = random.chance(0.8);
  const lastActiveAt = t("2026-10-23T20:15:00");
  return withBalances({
    ...ref,
    ...(deleted && { name: DELETED_CUSTOMER_LABEL, deletedAt: t("2026-10-05T18:40:00") }),
    status: deleted ? "deleted" : "active",
    registeredAt,
    language,
    address: deleted ? undefined : orders.find((o) => o.address)?.address,
    totals: { store, online },
    onlineOrders: {
      count: orders.length,
      lastOrderId: last?.id,
      lastOrderAt: last?.createdAt,
      allCount: orders.length,
    },
    upcomingAppointments: 0,
    groups: deleted
      ? []
      : [
          ...(orders.length >= 3 ? ["Doimiy mijozlar"] : []),
          ...(lifetime >= 10_000_000 ? ["10 mln+ xarid"] : []),
        ],
    ledger,
    purchases,
    device: deleted ? undefined : { ...phone, lastActiveAt, pushEnabled },
    // A deleted customer keeps the list, every entry inactive (contract §2.6).
    devices: [
      {
        id: `${id}01`,
        ...phone,
        pushEnabled: deleted ? false : pushEnabled,
        isActive: !deleted,
        lastActiveAt,
        createdAt: t("2025-06-01T12:00:00"),
      },
    ],
  });
}

export function buildCustomer(id: string): Customer | null {
  try {
    return id === CUSTOMER_IDS.malika ? malika() : fromOrders(id);
  } catch {
    return null;
  }
}
