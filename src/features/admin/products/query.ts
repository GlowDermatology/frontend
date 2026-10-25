import type { Route } from "next";

import type { ProductListQuery } from "@/data/products";
import { CATEGORY_SLUG_PATTERN } from "@/domain/category";
import type { ProductStatus } from "@/domain/product";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

export const PRODUCTS_PAGE_SIZE = 8;

const STATUSES: ReadonlyArray<ProductStatus> = ["active", "hidden"];
const PROMOS = ["yes", "no"] as const;
const SORTS = ["default", "name_asc", "name_desc"] as const;

/** A category slug (`^[a-z0-9-]{2,40}$`) or `none`; anything else is ignored. */
export function parseCategoryParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value === "none" || CATEGORY_SLUG_PATTERN.test(value) ? value : undefined;
}

/**
 * Drops a category slug that is not among `categories` (a bookmarked filter
 * for a deleted or renamed category): the API answers 400 `invalid_choice`
 * for it, so both modes show the unfiltered board instead. `none` is kept.
 */
export function withKnownCategory<Q extends { category?: string }>(
  query: Q,
  categories: ReadonlyArray<{ slug: string }>,
): Q {
  if (!query.category || query.category === "none") return query;
  if (categories.some((category) => category.slug === query.category)) return query;
  return { ...query, category: undefined };
}

export function parseProductQuery(params: SearchParams): ProductListQuery {
  return {
    q: firstParam(params, "q")?.slice(0, 64) || undefined,
    category: parseCategoryParam(firstParam(params, "category")),
    status: oneOf(firstParam(params, "status"), STATUSES),
    promo: oneOf(firstParam(params, "promo"), PROMOS),
    outOfStock: firstParam(params, "out") === "1",
    onlyNew: firstParam(params, "new") === "1",
    sort: oneOf(firstParam(params, "sort"), SORTS) ?? "default",
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: PRODUCTS_PAGE_SIZE,
  };
}

/** URL for a query, omitting defaults so links stay short. */
export function productListHref(query: Partial<ProductListQuery>, base = "/admin/products"): Route {
  return `${base}${toQueryString({
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
