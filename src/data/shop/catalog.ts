import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  apiCatalogBanners,
  apiCatalogCategories,
  apiCatalogProduct,
  apiCatalogProducts,
  apiCatalogProductsForVisitor,
} from "@/data/api/customer/catalog";
import {
  mapBanner,
  mapCategory,
  mapProduct,
  mapProductCard,
  mapProductPage,
  mapService,
  mapSettings,
  mapSpecialist,
} from "@/data/api/customer/mappers";
import { apiServices, apiSpecialists } from "@/data/api/customer/professionals";
import { apiPublicSettings } from "@/data/api/customer/settings";
import { isApiError } from "@/data/api/errors";
import type {
  ShopBanner,
  ShopCategory,
  ShopPage,
  ShopProduct,
  ShopProductCard,
  ShopService,
  ShopSettings,
  ShopSpecialist,
} from "@/domain/shop";
import type { Locale } from "@/lib/i18n/locales";
import {
  CATALOG_PAGE_SIZE,
  catalogApiQuery,
  isActiveSearch,
  type CatalogQuery,
} from "@/features/shop/routing/catalog-query";
import { isNumericId } from "@/features/shop/routing/routes";
import { serverEnv } from "@/lib/env.server";

import { shopTags } from "./tags";

/**
 * Storefront reads (customer contract §2.3, §2.4, §2.11). Every function
 * here is a `"use cache"` scope keyed by its arguments (language, slug,
 * query): one API answer serves every visitor until its `cacheLife` runs
 * out or a tag is revalidated (`POST /api/revalidate`, `./tags.ts`). The
 * reads are anonymous (`publicGet`), so nothing personal can leak into a
 * shared entry.
 *
 * Profiles (next.config.ts `cacheLife`): `catalog` — products, categories,
 * banners (revalidate 5 min); `content` — specialists, services, settings
 * and legal texts (revalidate 1 h). Tags make a staff change visible at once.
 *
 * A failing API call throws and is not cached; the page's error boundary
 * shows "try again". A 404 is a value (`null`) and is cached like any
 * answer, under the same tags, so a product made visible again shows up on
 * the next revalidation.
 *
 * Callers must first check `storefrontEnabled()` (api mode).
 */

function hosts(): string[] {
  return serverEnv.mediaHosts();
}

function isNotFound(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export async function getBanners(locale: Locale): Promise<ShopBanner[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.banners);
  const { data } = await apiCatalogBanners(locale);
  return data.results.map((banner) => mapBanner(banner, hosts()));
}

export async function getCategories(locale: Locale): Promise<ShopCategory[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.categories);
  const { data } = await apiCatalogCategories(locale);
  return data.results.map((category) => mapCategory(category, hosts()));
}

export async function getCategory(locale: Locale, slug: string): Promise<ShopCategory | null> {
  const categories = await getCategories(locale);
  return categories.find((category) => category.slug === slug) ?? null;
}

async function getCachedProductPage(
  locale: Locale,
  query: CatalogQuery,
): Promise<ShopPage<ShopProductCard>> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.products);
  const { data } = await apiCatalogProducts(locale, catalogApiQuery(query));
  return mapProductPage(data, hosts());
}

/**
 * One page of the catalog. Browsing (category, sort, in-stock, page) is
 * cached and shared; a search is a per-visitor request (not cached, and
 * sent with the visitor's IP so the API's per-client throttle applies to
 * them, not to this server). An unknown category is dropped before the call
 * (the API answers 400 for it), and a page past the end answers the API's
 * clamped last page.
 */
export async function listProducts(
  locale: Locale,
  query: CatalogQuery,
): Promise<{ page: ShopPage<ShopProductCard>; query: CatalogQuery }> {
  let effective = query;
  if (query.category) {
    const category = await getCategory(locale, query.category);
    if (!category) effective = { ...query, category: null };
  }
  if (isActiveSearch(effective.q)) {
    const { data } = await apiCatalogProductsForVisitor(locale, catalogApiQuery(effective));
    return { page: mapProductPage(data, hosts()), query: effective };
  }
  return { page: await getCachedProductPage(locale, effective), query: effective };
}

/** Products for the home page: promoted ones first, then the newest, `count` in all. */
export async function getFeaturedProducts(locale: Locale, count = 8): Promise<ShopProductCard[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.products);
  const [promo, newest] = await Promise.all([
    apiCatalogProducts(locale, { promo: true, page_size: CATALOG_PAGE_SIZE }),
    apiCatalogProducts(locale, { page_size: CATALOG_PAGE_SIZE }),
  ]);
  const seen = new Set<number>();
  const out: ShopProductCard[] = [];
  for (const item of [...promo.data.results, ...newest.data.results]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(mapProductCard(item, hosts()));
    if (out.length === count) break;
  }
  return out;
}

/**
 * A product by URL segment: a numeric id (legacy URLs, and every URL until
 * the API sends slugs) or a slug (B-W1's lookup by slug on the same path).
 * `null` when the API says 404 (hidden, unknown).
 */
export async function getProduct(locale: Locale, segment: string): Promise<ShopProduct | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.products);
  try {
    const { data } = await apiCatalogProduct(locale, segment);
    cacheTag(shopTags.product(data.id));
    return mapProduct(data, hosts());
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Up to `count` other products of the same category, for the product page. */
export async function getRelatedProducts(
  locale: Locale,
  product: Pick<ShopProduct, "id" | "category">,
  count = 4,
): Promise<ShopProductCard[]> {
  if (!product.category) return [];
  const { page } = await listProducts(locale, {
    q: "",
    category: product.category.slug,
    sort: "default",
    inStock: false,
    page: 1,
  });
  return page.items.filter((item) => item.id !== product.id).slice(0, count);
}

/** Every visible product (uz names), for the sitemaps. Bounded at 200 pages of 50. */
export async function getAllProducts(): Promise<ShopProductCard[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag(shopTags.products);
  const out: ShopProductCard[] = [];
  for (let page = 1; page <= 200; page += 1) {
    const { data } = await apiCatalogProducts("uz", { page, page_size: 50 });
    out.push(...mapProductPage(data, hosts()).items);
    if (page >= data.page_count) break;
  }
  return out;
}

export async function getSpecialists(locale: Locale): Promise<ShopSpecialist[]> {
  "use cache";
  cacheLife("content");
  cacheTag(shopTags.specialists);
  const { data } = await apiSpecialists(locale);
  return data.results.map((specialist) => mapSpecialist(specialist, hosts()));
}

/**
 * A specialist by URL segment (slug or id), found in the cached list: the
 * list holds every active specialist with their services (§2.11), so no
 * per-specialist call is needed and a slug works on any API version.
 */
export async function getSpecialist(
  locale: Locale,
  segment: string,
): Promise<ShopSpecialist | null> {
  const specialists = await getSpecialists(locale);
  if (isNumericId(segment)) {
    return specialists.find((specialist) => String(specialist.id) === segment) ?? null;
  }
  return (
    specialists.find((specialist) => specialist.hasSlug && specialist.segment === segment) ?? null
  );
}

export async function getServices(locale: Locale): Promise<ShopService[]> {
  "use cache";
  cacheLife("content");
  cacheTag(shopTags.services);
  const { data } = await apiServices(locale);
  return data.results.map(mapService);
}

export async function getSettings(locale: Locale): Promise<ShopSettings> {
  "use cache";
  cacheLife("content");
  cacheTag(shopTags.settings);
  const { data } = await apiPublicSettings(locale);
  return mapSettings(data);
}
