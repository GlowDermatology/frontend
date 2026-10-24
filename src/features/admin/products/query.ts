import type { Route } from "next";

import type { ProductListQuery } from "@/data/products";
import { CATEGORY_IDS, type ProductStatus } from "@/domain/product";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

export const PRODUCTS_PAGE_SIZE = 8;

const CATEGORIES = [...CATEGORY_IDS, "none"] as const;
const STATUSES: ReadonlyArray<ProductStatus> = ["active", "hidden"];
const PROMOS = ["yes", "no"] as const;
const SORTS = ["default", "name_asc", "name_desc"] as const;

export function parseProductQuery(params: SearchParams): ProductListQuery {
  return {
    q: firstParam(params, "q")?.slice(0, 64) || undefined,
    category: oneOf(firstParam(params, "category"), CATEGORIES),
    status: oneOf(firstParam(params, "status"), STATUSES),
    promo: oneOf(firstParam(params, "promo"), PROMOS),
    outOfStock: firstParam(params, "out") === "1",
    onlyNew: firstParam(params, "new") === "1",
    sort: oneOf(firstParam(params, "sort"), SORTS) ?? "default",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: PRODUCTS_PAGE_SIZE,
  };
}

export function productListHref(query: Partial<ProductListQuery>): Route {
  return `/admin/products${toQueryString({
    q: query.q,
    category: query.category,
    status: query.status,
    promo: query.promo,
    out: query.outOfStock,
    new: query.onlyNew,
    sort: query.sort && query.sort !== "default" ? query.sort : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  })}` as Route;
}

export function hasActiveProductFilters(query: ProductListQuery): boolean {
  return Boolean(
    query.q || query.category || query.status || query.promo || query.outOfStock || query.onlyNew,
  );
}
