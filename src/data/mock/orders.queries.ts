import { ORDER_STATUSES, type Order, type OrderStatus, type OrderSummary } from "@/domain/order";
import { tashkentParts, toLocalIsoDate } from "@/lib/format";

import { referenceNow } from "../config";
import type { OrderFilters, OrderListQuery, OrderPeriod } from "../orders";
import { paginate, type Page } from "../types";
import { buildOrderDetail, orderSeed, ORDER_SUMMARIES } from "./orders";

/**
 * Mock implementation of `src/data/orders.ts` over the in-memory fixtures.
 * "Now" is the fixed demo instant (`DEMO_NOW`) so the period filters and the
 * design's tab counts stay reproducible.
 */

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
      (!filters.dateFrom || toLocalIsoDate(order.createdAt) >= filters.dateFrom) &&
      (!filters.dateTo || toLocalIsoDate(order.createdAt) <= filters.dateTo) &&
      (!filters.customer || order.customer.id === filters.customer) &&
      (!filters.q || matchesSearch(order, filters.q)),
  );
}

export async function listOrders(query: OrderListQuery): Promise<Page<OrderSummary>> {
  const filtered = applyFilters(query).filter((o) => !query.status || o.status === query.status);
  const sorted = query.sort === "date_asc" ? [...filtered].reverse() : filtered;
  return paginate(sorted, query.page, query.pageSize);
}

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

export async function getOrder(id: number): Promise<Order | null> {
  const seed = orderSeed(id);
  return seed ? buildOrderDetail(seed) : null;
}

export async function getRecentOrders(limit: number): Promise<OrderSummary[]> {
  return ORDER_SUMMARIES.slice(0, limit);
}

/** Dashboard `attention.bts_failed` (§2.10): processing orders whose BTS create failed. */
export async function countFailedShipments(): Promise<number> {
  return ORDER_SUMMARIES.filter((o) => o.status === "processing" && o.shipment.state === "failed")
    .length;
}

export async function exportOrders(
  query: Omit<OrderListQuery, "page" | "pageSize">,
): Promise<OrderSummary[]> {
  const filtered = applyFilters(query).filter((o) => !query.status || o.status === query.status);
  return query.sort === "date_asc" ? [...filtered].reverse() : filtered;
}
