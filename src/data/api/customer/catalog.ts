import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import type { QueryValue } from "../client";
import { customerFetch, publicGet } from "./client";
import type {
  ApiCustomerBannerList,
  ApiCustomerCategoryList,
  ApiCustomerProductDetail,
  ApiCustomerProductPage,
} from "./types";

/**
 * Catalog endpoints of the customer API (contract §2.3), one language per
 * call (the API resolves i18n fields from `Accept-Language`). Anonymous reads
 * go through `publicGet` (cacheable, see `src/data/shop/catalog.ts`); a
 * search goes through `customerFetch`, so the API throttles it per visitor.
 * Every function throws `ApiError`.
 */

const BASE = "/api/v1/catalog";

export function apiCatalogBanners(locale: Locale) {
  return publicGet<ApiCustomerBannerList>(`${BASE}/banners/`, locale);
}

export function apiCatalogCategories(locale: Locale) {
  return publicGet<ApiCustomerCategoryList>(`${BASE}/categories/`, locale);
}

export function apiCatalogProducts(locale: Locale, query: Record<string, QueryValue>) {
  return publicGet<ApiCustomerProductPage>(`${BASE}/products/`, locale, query);
}

/** The same list for one visitor (a search): forwards their IP and user agent. */
export function apiCatalogProductsForVisitor(locale: Locale, query: Record<string, QueryValue>) {
  return customerFetch<ApiCustomerProductPage>(`${BASE}/products/`, { locale, query });
}

/**
 * `GET catalog/products/{id}/`; with B-W1 the same path also takes the slug
 * ("lookup by slug"). 404 when the product is not visible.
 */
export function apiCatalogProduct(locale: Locale, idOrSlug: string) {
  return publicGet<ApiCustomerProductDetail>(
    `${BASE}/products/${encodeURIComponent(idOrSlug)}/`,
    locale,
  );
}
