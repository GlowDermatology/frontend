import {
  ledgerNoteText,
  ledgerSourceText,
  type LedgerEntry,
  type LedgerOrigin,
} from "@/domain/cashback";
import type {
  Customer,
  CustomerListQuery,
  CustomerPurchase,
  CustomerSession,
  CustomerSort,
  CustomerTier,
} from "@/domain/customer";

import type { QueryValue } from "../client";
import type {
  ApiCustomerCard,
  ApiCustomerOrdering,
  ApiCustomerSession,
  ApiCustomerTier,
  ApiLedgerEntry,
  ApiPurchase,
} from "../types";
import { DELETED_CUSTOMER_NAME } from "./appointments";
import { idString, nullToUndefined, customerContact } from "./common";

/**
 * Customers (contract §2.6) → the FE domain types, per the §5.3 display
 * rules: the ledger's `source`/`note` strings, `balance_after` as the BALANS
 * column, purchases' document labels, the server tier and balances.
 */

/** The structured source of a ledger row (§5.3), worded per language by the card. */
export function ledgerOrigin(api: ApiLedgerEntry): LedgerOrigin {
  return {
    type: api.source_type,
    ref: api.source_ref ?? (api.order_id === null ? "" : String(api.order_id)),
    actor: api.actor?.display_name || null,
    base: api.base,
    percent: api.percent,
    reason: api.reason,
  };
}

/** `LedgerEntry.source` in Uzbek: "Buyurtma №10231", "Billz savdo S-88213" or the staff member. */
export function ledgerSource(api: ApiLedgerEntry): string {
  return ledgerSourceText({ source: "", origin: ledgerOrigin(api) });
}

/** `LedgerEntry.note` in Uzbek (§5.3): the credit base and rate, the fixed text, or the reason. */
export function ledgerNote(api: ApiLedgerEntry): string {
  return ledgerNoteText({
    kind: api.kind,
    note: "",
    origin: ledgerOrigin(api),
    promoExcluded: api.promo_excluded,
  });
}

export function mapLedgerEntry(api: ApiLedgerEntry): LedgerEntry {
  return {
    id: idString(api.id),
    at: api.at,
    kind: api.kind,
    source: ledgerSource(api),
    note: ledgerNote(api),
    amount: api.amount,
    balanceAfter: api.balance_after,
    orderId: nullToUndefined(api.order_id),
    policyVersion: nullToUndefined(api.policy_version),
    promoExcluded: api.promo_excluded,
    origin: ledgerOrigin(api),
  };
}

export function mapPurchase(api: ApiPurchase): CustomerPurchase {
  return {
    id: idString(api.id),
    at: api.at,
    source: api.source,
    document:
      api.source === "online"
        ? `№${api.order_id ?? ""}`
        : (api.billz_sale_ref ?? (api.order_id === null ? "" : `№${api.order_id}`)),
    amount: api.amount,
    promoAmount: api.promo_amount,
    cashback: api.cashback,
    orderId: nullToUndefined(api.order_id),
    reversed: api.reversed,
  };
}

/** `TierInfo` (§5.3): percents as numbers; no covering tier → `percent: null`. */
export function mapCustomerTier(api: ApiCustomerTier | null): CustomerTier {
  if (!api) return { percent: null, next: null };
  return {
    percent: Number(api.percent),
    policyVersion: api.policy_version,
    next: api.next && {
      percent: Number(api.next.percent),
      from: api.next.from,
      remaining: api.next.remaining,
      progress: api.next.progress,
    },
  };
}

/** `CustomerCard` → `Customer`; a scrubbed name (deleted account) shows as "O‘chirilgan mijoz". */
export function mapCustomerCard(api: ApiCustomerCard): Customer {
  return {
    id: idString(api.id),
    name: api.name || DELETED_CUSTOMER_NAME,
    phone: customerContact(api.phone, api.email),
    status: api.status,
    registeredAt: api.registered_at,
    deletedAt: nullToUndefined(api.deleted_at),
    language: api.language,
    address: api.address || undefined,
    totals: { store: api.totals.store, online: api.totals.online, lifetime: api.totals.lifetime },
    onlineOrders: {
      count: api.online_orders.count,
      lastOrderId: nullToUndefined(api.online_orders.last_order_id),
      lastOrderAt: nullToUndefined(api.online_orders.last_order_at),
      allCount: api.online_orders.all_count ?? undefined,
    },
    tier: mapCustomerTier(api.tier),
    balance: api.balance,
    held: api.held,
    available: api.available,
    upcomingAppointments: api.upcoming_appointments,
    groups: api.groups.map((group) => group.name),
    ledger: api.ledger.map(mapLedgerEntry),
    purchases: api.purchases.map(mapPurchase),
    device: api.device
      ? {
          platform: api.device.platform,
          model: api.device.model,
          os: api.device.os,
          appVersion: api.device.app_version,
          lastActiveAt: api.device.last_active_at,
          pushEnabled: api.device.push_enabled,
        }
      : undefined,
    devices: (api.devices ?? []).map((row) => ({
      id: idString(row.id),
      platform: row.platform,
      model: row.model,
      os: row.os,
      appVersion: row.app_version,
      pushEnabled: row.push_enabled,
      isActive: row.is_active,
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at,
    })),
  };
}

/** `AdminCustomerSession` (§2.6, B-W1) → `CustomerSession`; an empty location reads "—". */
export function mapCustomerSession(api: ApiCustomerSession): CustomerSession {
  return {
    id: api.id,
    device: api.device,
    platform: api.platform ?? null,
    location: api.location || "—",
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/** The list's sort keys (URL) → `ordering` (§2.6); `-registered_at` is the server default. */
export const CUSTOMER_ORDERING: Record<CustomerSort, ApiCustomerOrdering> = {
  registered_desc: "-registered_at",
  registered_asc: "registered_at",
  name_asc: "name",
  name_desc: "-name",
  total_desc: "-lifetime_total",
  total_asc: "lifetime_total",
  balance_desc: "-balance",
  balance_asc: "balance",
};

/**
 * The URL filters → `customers/` query parameters, renamed here and not in
 * the URL: `q` → `search`, `group` → `segment`, `sort` → `ordering`
 * (`page`/`page_size` excluded, so the export reuses it).
 */
export function customerFilterParams(
  query: Omit<CustomerListQuery, "page" | "pageSize">,
): Record<string, QueryValue> {
  const ordering = CUSTOMER_ORDERING[query.sort];
  return {
    search: query.q,
    status: query.status,
    segment: query.group,
    ordering: ordering === "-registered_at" ? undefined : ordering,
  };
}

/** `customerFilterParams` plus the page and its size (20 or 50, §1.5). */
export function customerListParams(query: CustomerListQuery): Record<string, QueryValue> {
  return { ...customerFilterParams(query), page: query.page, page_size: query.pageSize };
}
