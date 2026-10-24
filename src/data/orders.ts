import "server-only";

import {
  ORDER_STATUSES,
  type FulfilmentMethod,
  type Order,
  type OrderStatus,
  type OrderSummary,
  type PaymentStatus,
} from "@/domain/order";
import { tashkentParts, toLocalIsoDate } from "@/lib/format";

import { referenceNow } from "./config";
import { buildOrderDetail, orderSeed, ORDER_SUMMARIES } from "./mock/orders";
import { paginate, type Page } from "./types";

export type OrderPeriod = "today" | "week" | "month" | "all";
export type OrderSort = "date_desc" | "date_asc";

export interface OrderFilters {
  q?: string;
  fulfilment?: FulfilmentMethod;
  payment?: PaymentStatus;
  period: OrderPeriod;
}

export interface OrderListQuery extends OrderFilters {
  status?: OrderStatus;
  page: number;
  pageSize: number;
  sort: OrderSort;
}

function inPeriod(iso: string, period: OrderPeriod, now: Date): boolean {
  if (period === "all") return true;
  if (period === "today") return toLocalIsoDate(iso) === toLocalIsoDate(now);
  if (period === "week") return now.getTime() - new Date(iso).getTime() < 7 * 86_400_000;
  const a = tashkentParts(iso);
  const b = tashkentParts(now);
  return a.year === b.year && a.month === b.month;
}

function matchesSearch(order: OrderSummary, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const digits = term.replace(/\D/g, "");
  return (
    String(order.id).includes(term.replace(/^№/, "")) ||
    (digits.length >= 3 && order.customer.phone.includes(digits)) ||
    order.customer.name.toLowerCase().includes(term)
  );
}

function applyFilters(filters: OrderFilters): OrderSummary[] {
  const now = referenceNow();
  return ORDER_SUMMARIES.filter(
    (order) =>
      inPeriod(order.createdAt, filters.period, now) &&
      (!filters.fulfilment || order.fulfilment === filters.fulfilment) &&
      (!filters.payment || order.payment.status === filters.payment) &&
      (!filters.q || matchesSearch(order, filters.q)),
  );
}

/** `GET /api/v1/admin/orders/?status=&search=&fulfilment=&payment=&period=&ordering=&page=` */
export async function listOrders(query: OrderListQuery): Promise<Page<OrderSummary>> {
  const filtered = applyFilters(query).filter((o) => !query.status || o.status === query.status);
  const sorted = query.sort === "date_asc" ? [...filtered].reverse() : filtered;
  return paginate(sorted, query.page, query.pageSize);
}

/** Tab counts for the same filters (status excluded). */
export async function getOrderStatusCounts(
  filters: OrderFilters,
): Promise<Record<OrderStatus | "all", number>> {
  const filtered = applyFilters(filters);
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const order of filtered) counts[order.status] += 1;
  return { all: filtered.length, ...counts };
}

/** `GET /api/v1/admin/orders/{id}/` */
export async function getOrder(id: number): Promise<Order | null> {
  const seed = orderSeed(id);
  return seed ? buildOrderDetail(seed) : null;
}

export async function getRecentOrders(limit: number): Promise<OrderSummary[]> {
  return ORDER_SUMMARIES.slice(0, limit);
}

/** Orders whose automatic BTS hand-off failed (dashboard "attention" list). */
export async function countFailedShipments(): Promise<number> {
  return ORDER_SUMMARIES.filter((o) => o.shipment.state === "failed").length;
}

/** All orders matching the filters, for CSV export. */
export async function exportOrders(
  query: Omit<OrderListQuery, "page" | "pageSize">,
): Promise<OrderSummary[]> {
  const filtered = applyFilters(query).filter((o) => !query.status || o.status === query.status);
  return query.sort === "date_asc" ? [...filtered].reverse() : filtered;
}
