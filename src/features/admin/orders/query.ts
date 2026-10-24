import type { Route } from "next";

import type { OrderListQuery, OrderPeriod, OrderSort } from "@/data/orders";
import { ORDER_STATUSES, type FulfilmentMethod, type PaymentStatus } from "@/domain/order";
import { MONTHS, tashkentParts } from "@/lib/format";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

export const PAGE_SIZES = [10, 25, 50] as const;
const PERIODS: ReadonlyArray<OrderPeriod> = ["today", "week", "month", "all"];
const FULFILMENTS: ReadonlyArray<FulfilmentMethod> = ["delivery", "pickup"];
const PAYMENTS: ReadonlyArray<PaymentStatus> = ["pending", "paid", "failed", "refunded"];
const SORTS: ReadonlyArray<OrderSort> = ["date_desc", "date_asc"];

export const DEFAULT_PERIOD: OrderPeriod = "month";

export function parseOrderQuery(params: SearchParams): OrderListQuery {
  const size = positiveInt(firstParam(params, "size"), 10);
  return {
    status: oneOf(firstParam(params, "status"), ORDER_STATUSES),
    q: firstParam(params, "q")?.slice(0, 64) || undefined,
    period: oneOf(firstParam(params, "period"), PERIODS) ?? DEFAULT_PERIOD,
    fulfilment: oneOf(firstParam(params, "fulfilment"), FULFILMENTS),
    payment: oneOf(firstParam(params, "payment"), PAYMENTS),
    sort: oneOf(firstParam(params, "sort"), SORTS) ?? "date_desc",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: (PAGE_SIZES as ReadonlyArray<number>).includes(size) ? size : 10,
  };
}

/** URL for a query, omitting defaults so links stay short. */
export function orderListHref(query: Partial<OrderListQuery>, base = "/admin/orders"): Route {
  return `${base}${toQueryString({
    status: query.status,
    q: query.q,
    period: query.period && query.period !== DEFAULT_PERIOD ? query.period : undefined,
    fulfilment: query.fulfilment,
    payment: query.payment,
    sort: query.sort && query.sort !== "date_desc" ? query.sort : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
    size: query.pageSize && query.pageSize !== 10 ? query.pageSize : undefined,
  })}` as Route;
}

export function periodLabel(period: OrderPeriod, now: Date): string {
  if (period === "today") return "Bugun";
  if (period === "week") return "Oxirgi 7 kun";
  if (period === "all") return "Barcha sana";
  const p = tashkentParts(now);
  return p.day === 1 ? `1-${MONTHS[p.month]}` : `1–${p.day}-${MONTHS[p.month]}`;
}

export function hasActiveFilters(query: OrderListQuery): boolean {
  return Boolean(
    query.status || query.q || query.fulfilment || query.payment || query.period !== DEFAULT_PERIOD,
  );
}
