import { percentString, basisPoints } from "@/domain/cashback";
import {
  lifetimeTotal,
  type Customer,
  type CustomerListItem,
  type CustomerListQuery,
  type CustomerSession,
  type CustomerSort,
} from "@/domain/customer";

import { paginate, type Page } from "../types";
import { buildCustomer } from "./customers";
import { CUSTOMERS } from "./people";
import { MOCK_MEMBERS } from "./segments";
import { mockCustomerSessions } from "./sessions";

/** Mock implementation of `src/data/customers.ts`. */
export async function getCustomer(id: string): Promise<Customer | null> {
  return buildCustomer(id);
}

/** `CustomerListItem` of a card: `percent` is the active-policy rate as the API spells it ("1.00"). */
function listItem(customer: Customer): CustomerListItem {
  const bp = customer.tier.percent === null ? null : basisPoints(customer.tier.percent);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    status: customer.status,
    registeredAt: customer.registeredAt,
    lifetimeTotal: lifetimeTotal(customer),
    percent: bp === null ? null : percentString(bp),
    balance: customer.balance,
    onlineOrdersCount: customer.onlineOrders.count,
  };
}

let rows: CustomerListItem[] | null = null;

/** Every customer as a list row, built once from the same fixtures as the cards. */
function allRows(): CustomerListItem[] {
  rows ??= CUSTOMERS.flatMap((ref) => {
    const customer = buildCustomer(ref.id);
    return customer ? [listItem(customer)] : [];
  });
  return rows;
}

const byId = (a: CustomerListItem, b: CustomerListItem) => Number(a.id) - Number(b.id);

const COMPARE: Record<CustomerSort, (a: CustomerListItem, b: CustomerListItem) => number> = {
  registered_desc: (a, b) => b.registeredAt.localeCompare(a.registeredAt),
  registered_asc: (a, b) => a.registeredAt.localeCompare(b.registeredAt),
  name_asc: (a, b) => a.name.localeCompare(b.name, "uz"),
  name_desc: (a, b) => b.name.localeCompare(a.name, "uz"),
  total_desc: (a, b) => b.lifetimeTotal - a.lifetimeTotal,
  total_asc: (a, b) => a.lifetimeTotal - b.lifetimeTotal,
  balance_desc: (a, b) => b.balance - a.balance,
  balance_asc: (a, b) => a.balance - b.balance,
};

/**
 * The backend's filters (contract §2.6): `search` matches the name, or the
 * phone when the term has at least 3 digits; `segment` is the group's member
 * list; ties are broken by id.
 */
function filtered(query: Omit<CustomerListQuery, "page" | "pageSize">): CustomerListItem[] {
  const term = query.q?.trim().toLowerCase() ?? "";
  const digits = term.replace(/\D/g, "");
  const members = query.group
    ? new Set(MOCK_MEMBERS[query.group]?.members.map((m) => m.id) ?? [])
    : null;
  return allRows()
    .filter((row) => {
      if (query.status && row.status !== query.status) return false;
      if (members && !members.has(row.id)) return false;
      if (!term) return true;
      if (row.name.toLowerCase().includes(term)) return true;
      return digits.length >= 3 && row.phone.includes(digits);
    })
    .sort((a, b) => COMPARE[query.sort](a, b) || byId(a, b));
}

export async function listCustomers(query: CustomerListQuery): Promise<Page<CustomerListItem>> {
  return paginate(filtered(query), query.page, query.pageSize);
}

/** Export rows (contract §1.8 `mijozlar`): the list's filters and order, every page. */
export async function exportCustomers(
  query: Omit<CustomerListQuery, "page" | "pageSize">,
): Promise<ReadonlyArray<CustomerListItem>> {
  return filtered(query);
}

/** `customers/{id}/sessions/` (B-W1); `null` for an unknown customer (404). */
export async function listCustomerSessions(
  id: string,
  page: number,
  pageSize: number,
): Promise<Page<CustomerSession> | null> {
  const customer = buildCustomer(id);
  if (!customer) return null;
  return paginate(mockCustomerSessions(customer), page, pageSize);
}
