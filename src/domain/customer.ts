import type { ContentLanguage } from "./product";
import type { LedgerEntry } from "./cashback";
import type { SegmentMember } from "./segment";

export type CustomerStatus = "active" | "deleted";

export interface CustomerPurchase {
  id: string;
  at: string;
  source: "online" | "store_qr";
  /** "№10248" for orders, "S-88213" for Billz sales. */
  document: string;
  amount: number;
  promoAmount: number;
  cashback: number;
  /** Online purchases: the order number (links to the order). */
  orderId?: number;
  /** The order was cancelled or refunded afterwards (contract §2.6 `reversed`). */
  reversed?: boolean;
}

/** The app installation's platform (contract §2.6, `OrderChannel`). */
export type DevicePlatform = "ios" | "android";

export const DEVICE_PLATFORM_LABEL: Record<DevicePlatform, string> = {
  ios: "iOS",
  android: "Android",
};

export interface CustomerDevice {
  platform?: DevicePlatform;
  model: string;
  os: string;
  appVersion: string;
  lastActiveAt: string;
  pushEnabled: boolean;
}

/**
 * One app installation of the customer (contract §2.6 `devices[]`, gap
 * ADM-8.1): active ones first, then by last activity; at most 20.
 */
export interface CustomerDeviceRow {
  id: string;
  platform: DevicePlatform;
  model: string;
  os: string;
  appVersion: string;
  pushEnabled: boolean;
  /** `false` after a logout, a sign-in on another phone or the account deletion. */
  isActive: boolean;
  lastActiveAt: string;
  /** The installation's first sign-in. */
  createdAt: string;
}

/** The card's tier block (contract §2.6 `tier`, §5.3 `TierInfo`). */
export interface CustomerTier {
  /** Percent of the tier covering the lifetime total; `null` when no tier covers it. */
  percent: number | null;
  /** Active policy version the tier comes from. */
  policyVersion?: number;
  next: { percent: number; from?: number; remaining: number; progress: number } | null;
}

export interface Customer {
  id: string;
  /** "O‘chirilgan mijoz" once the account is deleted (the backend scrubs the name). */
  name: string;
  phone: string;
  status: CustomerStatus;
  registeredAt: string;
  /** When the account was deleted (status `deleted`). */
  deletedAt?: string;
  language: ContentLanguage;
  address?: string;
  /**
   * Lifetime purchases split by channel, so‘m (non-reversed purchases).
   * `lifetime` is the server's total when it sent one.
   */
  totals: { store: number; online: number; lifetime?: number };
  /**
   * `count` = paid, non-reversed online purchases; `allCount` = every order of
   * any status (the rows `orders/?customer=` lists; gap ADM-8.1).
   */
  onlineOrders: { count: number; lastOrderId?: number; lastOrderAt?: string; allCount?: number };
  /** Current rate and the next tier. */
  tier: CustomerTier;
  /** Cashback balance (the server's, never the sum of the rows the page shows). */
  balance: number;
  /** Amount held by unfinished orders. */
  held: number;
  /** `balance − held`: what can be spent or subtracted now (may be negative). */
  available: number;
  upcomingAppointments: number;
  /** Audience segments the customer belongs to (used for notifications). */
  groups: string[];
  /** Full history, newest first, each row with its `balanceAfter`. */
  ledger: LedgerEntry[];
  purchases: CustomerPurchase[];
  device?: CustomerDevice;
  /** Every app installation (≤ 20), active first. */
  devices: CustomerDeviceRow[];
}

export function lifetimeTotal(customer: Pick<Customer, "totals">): number {
  return customer.totals.lifetime ?? customer.totals.store + customer.totals.online;
}

/**
 * Whether the card offers the cashback adjustment. Contract §2.6 accepts an
 * adjustment for a deleted customer too (the balance is kept for
 * reactivation), so every card offers it; the deleted state stays visible and
 * only the notification button is hidden (`canNotify`).
 */
export function canAdjustCashback(customer: Pick<Customer, "status">): boolean {
  return customer.status === "active" || customer.status === "deleted";
}

/** A deleted account has no devices or language left to push to: no "Bildirishnoma yuborish". */
export function canNotify(customer: Pick<Customer, "status">): boolean {
  return customer.status !== "deleted";
}

/** A row of the customers list (contract §2.6 `CustomerListItem`), shared with the group members. */
export type CustomerListItem = SegmentMember;

/** Shown instead of the scrubbed name of a deleted customer (contract §7.16). */
export const DELETED_CUSTOMER_LABEL = "O‘chirilgan mijoz";

export type CustomerSort =
  | "registered_desc"
  | "registered_asc"
  | "name_asc"
  | "name_desc"
  | "total_desc"
  | "total_asc"
  | "balance_desc"
  | "balance_asc";

export const CUSTOMER_SORTS: ReadonlyArray<CustomerSort> = [
  "registered_desc",
  "registered_asc",
  "name_asc",
  "name_desc",
  "total_desc",
  "total_asc",
  "balance_desc",
  "balance_asc",
];

export const CUSTOMER_SORT_LABEL: Record<CustomerSort, string> = {
  registered_desc: "Avval yangilari",
  registered_asc: "Avval eskilari",
  name_asc: "Ism: A–Z",
  name_desc: "Ism: Z–A",
  total_desc: "Xaridlar: ko‘pdan",
  total_asc: "Xaridlar: kamdan",
  balance_desc: "Balans: ko‘pdan",
  balance_asc: "Balans: kamdan",
};

/** Page sizes of the customers list (contract §1.5: 20, 50). */
export const CUSTOMER_PAGE_SIZES = [20, 50] as const;
export type CustomerPageSize = (typeof CUSTOMER_PAGE_SIZES)[number];

/** Filters, ordering and page of the customers list as the URL carries them. */
export interface CustomerListQuery {
  /** Name, or ≥ 3 digits of the phone. */
  q?: string;
  status?: CustomerStatus;
  /** Segment (group) id. */
  group?: string;
  sort: CustomerSort;
  page: number;
  pageSize: CustomerPageSize;
}
