import type { Route } from "next";

import { REFUND_STATES, type PaymentProvider, type PaymentStatus } from "@/domain/order";
import {
  PAYMENT_PAGE_SIZES,
  type PaymentListQuery,
  type PaymentPeriod,
  type PaymentSort,
  type RefundFilter,
} from "@/domain/payment";

import {
  firstParam,
  isoDateParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
  parseSearchParam,
} from "../shared/url-state";

const STATUSES: ReadonlyArray<PaymentStatus> = ["pending", "paid", "failed", "refunded"];
const PROVIDERS: ReadonlyArray<PaymentProvider> = ["click", "payme"];
const REFUND_FILTERS: ReadonlyArray<RefundFilter> = [...REFUND_STATES, "needs_action"];
const PERIODS: ReadonlyArray<PaymentPeriod> = ["today", "week", "month", "all"];
const SORTS: ReadonlyArray<PaymentSort> = ["date_desc", "date_asc"];

/** Payments default to every date: a refund that needs action may be old. */
export const DEFAULT_PAYMENT_PERIOD: PaymentPeriod = "all";
export const DEFAULT_PAYMENT_PAGE_SIZE = 20;

/**
 * `/admin/payments?q=&status=&provider=&refund=&period=&date_from=&date_to=
 * &sort=&page=&size=`, validated: a malformed value is dropped (and an
 * inverted date range swapped) rather than sent to the API.
 */
export function parsePaymentQuery(params: SearchParams): PaymentListQuery {
  const size = positiveInt(firstParam(params, "size"), DEFAULT_PAYMENT_PAGE_SIZE);
  let dateFrom = isoDateParam(firstParam(params, "date_from"));
  let dateTo = isoDateParam(firstParam(params, "date_to"));
  if (dateFrom && dateTo && dateFrom > dateTo) [dateFrom, dateTo] = [dateTo, dateFrom];
  return {
    q: parseSearchParam(firstParam(params, "q")),
    status: oneOf(firstParam(params, "status"), STATUSES),
    provider: oneOf(firstParam(params, "provider"), PROVIDERS),
    refund: oneOf(firstParam(params, "refund"), REFUND_FILTERS),
    period: oneOf(firstParam(params, "period"), PERIODS) ?? DEFAULT_PAYMENT_PERIOD,
    dateFrom,
    dateTo,
    sort: oneOf(firstParam(params, "sort"), SORTS) ?? "date_desc",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: (PAYMENT_PAGE_SIZES as ReadonlyArray<number>).includes(size)
      ? size
      : DEFAULT_PAYMENT_PAGE_SIZE,
  };
}

/** The query string of a filter set, defaults omitted so the bare URL is the default view. */
export function paymentQueryString(query: Partial<PaymentListQuery>): string {
  return toQueryString({
    q: query.q,
    status: query.status,
    provider: query.provider,
    refund: query.refund,
    period: query.period && query.period !== DEFAULT_PAYMENT_PERIOD ? query.period : undefined,
    date_from: query.dateFrom,
    date_to: query.dateTo,
    sort: query.sort && query.sort !== "date_desc" ? query.sort : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
    size:
      query.pageSize && query.pageSize !== DEFAULT_PAYMENT_PAGE_SIZE ? query.pageSize : undefined,
  });
}

export function paymentListHref(query: Partial<PaymentListQuery>): Route {
  return `/admin/payments${paymentQueryString(query)}` as Route;
}

export function hasActivePaymentFilters(query: PaymentListQuery): boolean {
  return Boolean(
    query.q ||
    query.status ||
    query.provider ||
    query.refund ||
    query.dateFrom ||
    query.dateTo ||
    query.period !== DEFAULT_PAYMENT_PERIOD,
  );
}
