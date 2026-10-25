import "server-only";

import {
  ORDER_STATUSES,
  type FulfilmentMethod,
  type Order,
  type OrderStatus,
  type OrderSummary,
  type PaymentStatus,
} from "@/domain/order";

import * as mock from "./mock/orders.queries";
import { dataSource, notWiredYet } from "./source";
import { emptyPage, type Page } from "./types";

/**
 * Orders read seam. Every function dispatches on `dataSource()`: the mock
 * branch lives in `./mock/orders.queries.ts`; the api branch is not wired yet
 * (F2) and returns the documented empty shape via `notWiredYet`.
 */

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

const RESOURCE = "orders";

/** `GET /api/v1/admin/orders/?status=&search=&fulfilment=&payment=&period=&ordering=&page=` */
export async function listOrders(query: OrderListQuery): Promise<Page<OrderSummary>> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, emptyPage(query.pageSize));
  return mock.listOrders(query);
}

/** Tab counts for the same filters (status excluded). */
export async function getOrderStatusCounts(
  filters: OrderFilters,
): Promise<Record<OrderStatus | "all", number>> {
  if ((await dataSource()) === "api") {
    const zero = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
      OrderStatus,
      number
    >;
    return notWiredYet(RESOURCE, { all: 0, ...zero });
  }
  return mock.getOrderStatusCounts(filters);
}

/** `GET /api/v1/admin/orders/{id}/` — `null` for an unknown id (404). */
export async function getOrder(id: number): Promise<Order | null> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, null);
  return mock.getOrder(id);
}

/** Newest orders for the dashboard (`orders/?page_size=6`). */
export async function getRecentOrders(limit: number): Promise<OrderSummary[]> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, []);
  return mock.getRecentOrders(limit);
}

/** Orders whose automatic BTS hand-off failed (dashboard "attention" list). */
export async function countFailedShipments(): Promise<number> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, 0);
  return mock.countFailedShipments();
}

/** All orders matching the filters, for CSV export. */
export async function exportOrders(
  query: Omit<OrderListQuery, "page" | "pageSize">,
): Promise<OrderSummary[]> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, []);
  return mock.exportOrders(query);
}
