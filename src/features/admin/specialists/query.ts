import type { Route } from "next";

import {
  DIRECTORY_ORDERINGS,
  DIRECTORY_PAGE_SIZES,
  SERVICE_CATEGORIES,
  SPECIALIST_ROLES,
  type DirectoryPageSize,
  type ServiceListQuery,
  type SpecialistListQuery,
} from "@/domain/clinic";

import {
  firstParam,
  oneOf,
  parseSearchParam,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

/**
 * URL state of `/admin/specialists` and `/admin/services` (contract §2.17):
 * `q`, `status` (`active` | `inactive`), `role` / `category`, `sort`
 * (DirectoryOrdering, default `position`), `page`, `size` (20, 50). The
 * mappers rename them for the API.
 */

const STATUSES = ["active", "inactive"] as const;
const SIZES = DIRECTORY_PAGE_SIZES.map(String) as ReadonlyArray<`${DirectoryPageSize}`>;

function common(params: SearchParams) {
  const size = oneOf(firstParam(params, "size"), SIZES);
  return {
    q: parseSearchParam(firstParam(params, "q")),
    status: oneOf(firstParam(params, "status"), STATUSES),
    sort: oneOf(firstParam(params, "sort"), DIRECTORY_ORDERINGS) ?? "position",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: size ? (Number(size) as DirectoryPageSize) : 20,
  };
}

export function parseSpecialistQuery(params: SearchParams): SpecialistListQuery {
  return { ...common(params), role: oneOf(firstParam(params, "role"), SPECIALIST_ROLES) };
}

export function parseServiceQuery(params: SearchParams): ServiceListQuery {
  return { ...common(params), category: oneOf(firstParam(params, "category"), SERVICE_CATEGORIES) };
}

type Query = Partial<SpecialistListQuery & ServiceListQuery>;

function href(base: string, query: Query): Route {
  return `${base}${toQueryString({
    q: query.q,
    status: query.status,
    role: query.role,
    category: query.category,
    sort: query.sort && query.sort !== "position" ? query.sort : undefined,
    size: query.pageSize && query.pageSize !== 20 ? query.pageSize : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  })}` as Route;
}

export const specialistListHref = (
  query: Partial<SpecialistListQuery>,
  base = "/admin/specialists",
) => href(base, query);
export const serviceListHref = (query: Partial<ServiceListQuery>, base = "/admin/services") =>
  href(base, query);

export function hasDirectoryFilters(query: Query): boolean {
  return Boolean(query.q || query.status || query.role || query.category);
}
