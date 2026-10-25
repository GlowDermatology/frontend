import "server-only";

import type { CategoryId, Product, ProductStatus } from "@/domain/product";

import * as mock from "./mock/products.queries";
import { dataSource, notWiredYet } from "./source";
import { emptyPage, type Page } from "./types";

/**
 * Products read seam. Dispatches on `dataSource()`: mock bodies live in
 * `./mock/products.queries.ts`; the api branch is not wired yet (F2) and
 * returns the documented empty shape via `notWiredYet`.
 */

export interface ProductListQuery {
  q?: string;
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
  newFromBillz: number;
  outOfStock: number;
  lastSyncLabel: string;
}

const RESOURCE = "products";

/**
 * `GET /api/v1/admin/products/?search=&category=&status=&promo=&out_of_stock=&page=`
 * Default order keeps the catalog order; sorting by name is opt-in.
 */
export async function listProducts(query: ProductListQuery): Promise<Page<Product>> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, emptyPage(query.pageSize));
  return mock.listProducts(query);
}

/** `GET /api/v1/admin/products/{id}/` — `null` for an unknown id (404). */
export async function getProduct(id: string): Promise<Product | null> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, null);
  return mock.getProduct(id);
}

/** Catalog counters for the products header and the dashboard. */
export async function getCatalogStats(): Promise<CatalogStats> {
  if ((await dataSource()) === "api") {
    return notWiredYet(RESOURCE, { total: 0, newFromBillz: 0, outOfStock: 0, lastSyncLabel: "—" });
  }
  return mock.getCatalogStats();
}
