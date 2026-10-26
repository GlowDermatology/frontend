import type { Route } from "next";

import {
  CUSTOMER_PAGE_SIZES,
  CUSTOMER_SORTS,
  type CustomerListQuery,
  type CustomerPageSize,
  type CustomerStatus,
} from "@/domain/customer";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

/**
 * URL state of the customers list (`/admin/customers`). The URL keeps the
 * board's own names (`q`, `status`, `group`, `sort`, `size`, `page`); the API
 * names (`search`, `segment`, `ordering`, `page_size`) are applied by the
 * mapper (`customerListParams`), never here.
 */

const STATUSES: ReadonlyArray<CustomerStatus> = ["active", "deleted"];
const SIZES = CUSTOMER_PAGE_SIZES.map(String) as ReadonlyArray<`${CustomerPageSize}`>;

/** A group (segment) id as the API takes it: a positive integer. Anything else is ignored. */
export function parseGroupParam(value: string | undefined): string | undefined {
  return value && /^[1-9]\d{0,11}$/.test(value) ? value : undefined;
}

/**
 * The search text as the API takes it: control characters (U+0000 is a 400
 * `null_characters_not_allowed` in Django) are removed before trimming, and
 * the result is cut to 64 characters. Nothing left → no search.
 */
export function parseSearchParam(value: string | undefined): string | undefined {
  return (
    value
      ?.replace(/\p{Cc}/gu, "")
      .trim()
      .slice(0, 64) || undefined
  );
}

export function parseCustomerQuery(params: SearchParams): CustomerListQuery {
  const size = oneOf(firstParam(params, "size"), SIZES);
  return {
    q: parseSearchParam(firstParam(params, "q")),
    status: oneOf(firstParam(params, "status"), STATUSES),
    group: parseGroupParam(firstParam(params, "group")),
    sort: oneOf(firstParam(params, "sort"), CUSTOMER_SORTS) ?? "registered_desc",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: size ? (Number(size) as CustomerPageSize) : 20,
  };
}

/** URL for a query, omitting defaults so links stay short. */
export function customerListHref(
  query: Partial<CustomerListQuery>,
  base = "/admin/customers",
): Route {
  return `${base}${toQueryString({
    q: query.q,
    status: query.status,
    group: query.group,
    sort: query.sort && query.sort !== "registered_desc" ? query.sort : undefined,
    size: query.pageSize && query.pageSize !== 20 ? query.pageSize : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  })}` as Route;
}

export function hasActiveCustomerFilters(query: CustomerListQuery): boolean {
  return Boolean(query.q || query.status || query.group);
}
