import type { ContentLanguage } from "./product";
import type { LedgerEntry } from "./cashback";

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
}

export interface CustomerDevice {
  model: string;
  os: string;
  appVersion: string;
  lastActiveAt: string;
  pushEnabled: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  status: CustomerStatus;
  registeredAt: string;
  language: ContentLanguage;
  address?: string;
  /** Lifetime purchases split by channel, so‘m. */
  totals: { store: number; online: number };
  onlineOrders: { count: number; lastOrderId?: number; lastOrderAt?: string };
  upcomingAppointments: number;
  groups: Array<{ name: string; rule: string }>;
  ledger: LedgerEntry[];
  purchases: CustomerPurchase[];
  device?: CustomerDevice;
}

export function lifetimeTotal(customer: Pick<Customer, "totals">): number {
  return customer.totals.store + customer.totals.online;
}
