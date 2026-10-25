import "server-only";

import { cache } from "react";

import type { CategoryId, Product, ProductStatus } from "@/domain/product";

import { apiGetProduct, apiListProducts, apiProductStats } from "./api/catalog";
import { isApiError } from "./api/errors";
import { mapCatalogStats, mapPage, mapProduct, productListParams } from "./api/mappers";
import { requireApiToken } from "./auth";
import * as mock from "./mock/products.queries";
import { requestNow } from "./now";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Products read seam. Dispatches on `dataSource()`: mock bodies live in
 * `./mock/products.queries.ts`; the api branch calls `GET products/`,
 * `GET products/{id}/` and `GET products/stats/` (contract §2.3) through
 * `src/data/api/catalog.ts` and maps the answers with `src/data/api/mappers`.
 */

export interface ProductListQuery {
  q?: string;
  /** Category slug, or `none` for products without a category. */
  category?: CategoryId | "none";
  status?: ProductStatus;
  promo?: "yes" | "no";
  outOfStock: boolean;
  onlyNew: boolean;
  /** `default` keeps the catalog order (most recently curated first). */
  sort: "default" | "name_asc" | "name_desc";
  page: number;
  pageSize: number;
}

export interface CatalogStats {
  total: number;
  active: number;
  hidden: number;
  newFromBillz: number;
  outOfStock: number;
  /** Billz adapter configured and the last import did not fail. */
  billzConnected: boolean;
  /** `billz.last_sync_at`; `null` = never synced. */
  lastSyncAt: string | null;
  /** Relative to the server's `now` (contract §5.2): "2 daqiqa oldin". */
  lastSyncLabel: string;
}

/**
 * `GET /api/v1/admin/products/?search=&category=&status=&promo=&out_of_stock=&is_new=&ordering=&page=&page_size=`
 * Default order keeps the catalog order; sorting by name is opt-in.
 */
export async function listProducts(query: ProductListQuery): Promise<Page<Product>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListProducts(token, productListParams(query));
    return mapPage(data, mapProduct);
  }
  return mock.listProducts(query);
}

/**
 * `GET /api/v1/admin/products/{id}/` — `null` for an unknown id (404).
 * Deduplicated per render with React `cache()`, so `generateMetadata` and the
 * page body share one request.
 */
export const getProduct = cache(async (id: string): Promise<Product | null> => {
  if ((await dataSource()) === "api") {
    if (!/^\d{1,18}$/.test(id)) return null;
    const token = await requireApiToken();
    try {
      return mapProduct((await apiGetProduct(token, id)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.getProduct(id);
});

/** Catalog counters and the Billz status (`GET products/stats/`) for the header, sidebar and dashboard. */
export const getCatalogStats = cache(async (): Promise<CatalogStats> => {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const [{ data }, now] = await Promise.all([apiProductStats(token), requestNow()]);
    return mapCatalogStats(data, now);
  }
  return mock.getCatalogStats();
});

/**
 * Active products matching a search term, for pickers (banner links). One
 * page of the regular list (`status=active&search=`), up to 8 rows.
 */
export async function searchActiveProducts(q: string): Promise<Product[]> {
  const page = await listProducts({
    q: q.trim() || undefined,
    status: "active",
    outOfStock: false,
    onlyNew: false,
    sort: "default",
    page: 1,
    pageSize: 8,
  });
  return page.items;
}
