import type { Route } from "next";

import type { OrderListQuery, OrderPeriod, OrderSort } from "@/data/orders";
import { ORDER_STATUSES, type FulfilmentMethod, type PaymentStatus } from "@/domain/order";
import { MONTHS, tashkentParts } from "@/lib/format";

import {
  firstParam,
  isoDateParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
  parseSearchParam,
} from "../shared/url-state";

export const PAGE_SIZES = [6, 10, 25, 50] as const;
const PERIODS: ReadonlyArray<OrderPeriod> = ["today", "week", "month", "all"];
const FULFILMENTS: ReadonlyArray<FulfilmentMethod> = ["delivery", "pickup"];
const PAYMENTS: ReadonlyArray<PaymentStatus> = ["pending", "paid", "failed", "refunded"];
const SORTS: ReadonlyArray<OrderSort> = ["date_desc", "date_asc"];

export const DEFAULT_PERIOD: OrderPeriod = "month";

/**
 * `/admin/orders?status=&q=&period=&fulfilment=&payment=&date_from=&date_to=
 * &customer=&sort=&page=&size=`, validated: a malformed value is dropped
 * (and an inverted date range swapped) rather than sent to the API.
 */
export function parseOrderQuery(params: SearchParams): OrderListQuery {
  const size = positiveInt(firstParam(params, "size"), 10);
  const customer = firstParam(params, "customer");
  let dateFrom = isoDateParam(firstParam(params, "date_from"));
  let dateTo = isoDateParam(firstParam(params, "date_to"));
  if (dateFrom && dateTo && dateFrom > dateTo) [dateFrom, dateTo] = [dateTo, dateFrom];
  return {
    dateFrom,
    dateTo,
    customer:
      customer && /^\d{1,12}$/.test(customer) && Number(customer) > 0 ? customer : undefined,
    status: oneOf(firstParam(params, "status"), ORDER_STATUSES),
    q: parseSearchParam(firstParam(params, "q")),
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
    date_from: query.dateFrom,
    date_to: query.dateTo,
    customer: query.customer,
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
    query.status ||
    query.q ||
    query.fulfilment ||
    query.payment ||
    query.dateFrom ||
    query.dateTo ||
    query.customer ||
    query.period !== DEFAULT_PERIOD,
  );
}
