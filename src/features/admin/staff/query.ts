import type { Route } from "next";

import {
  STAFF_PAGE_SIZES,
  type StaffListQuery,
  type StaffPageSize,
  type StaffStatus,
} from "@/domain/staff";

import {
  firstParam,
  oneOf,
  parseSearchParam,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

/** URL state of `/admin/staff`: `q`, `status` (`inactive`), `page`, `size` (20, 50, 100). */

const STATUSES: ReadonlyArray<StaffStatus> = ["active", "inactive"];
const SIZES = STAFF_PAGE_SIZES.map(String) as ReadonlyArray<`${StaffPageSize}`>;

export function parseStaffQuery(params: SearchParams): StaffListQuery {
  const size = oneOf(firstParam(params, "size"), SIZES);
  return {
    q: parseSearchParam(firstParam(params, "q")),
    status: oneOf(firstParam(params, "status"), STATUSES) ?? "active",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: size ? (Number(size) as StaffPageSize) : 20,
  };
}

export function staffListHref(query: Partial<StaffListQuery>): Route {
  return `/admin/staff${toQueryString({
    q: query.q,
    status: query.status === "inactive" ? "inactive" : undefined,
    size: query.pageSize && query.pageSize !== 20 ? query.pageSize : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  })}` as Route;
}
