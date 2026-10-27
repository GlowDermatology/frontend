import { productDisplayName as displayName, stockLevel, type Product } from "@/domain/product";

import { lastSyncLabel } from "../api/mappers/products";
import { DEMO_NOW, referenceNow } from "../config";
import type { CatalogStats, ProductListQuery } from "../products";
import { paginate, type Page } from "../types";
import { PRODUCTS } from "./catalog";

/** Mock implementation of `src/data/products.ts` over the fixture catalog. */

function matches(product: Product, query: ProductListQuery): boolean {
  const term = query.q?.trim().toLowerCase();
  if (term) {
    const haystack = [displayName(product), product.billzName, product.billzId, product.id]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (query.category === "none" && product.category !== null) return false;
  if (query.category && query.category !== "none" && product.category !== query.category)
    return false;
  if (query.status && product.status !== query.status) return false;
  if (query.promo === "yes" && !product.promo) return false;
  if (query.promo === "no" && product.promo) return false;
  if (query.outOfStock && stockLevel(product.stock) !== "out") return false;
  if (query.onlyNew && !product.isNewFromBillz) return false;
  return true;
}

function filterAndSort(query: Omit<ProductListQuery, "page" | "pageSize">): Product[] {
  const filtered = PRODUCTS.filter((p) => matches(p, query as ProductListQuery));
  const byName = (a: Product, b: Product) => displayName(a).localeCompare(displayName(b), "uz");
  return query.sort === "default"
    ? filtered
    : [...filtered].sort((a, b) => (query.sort === "name_asc" ? byName(a, b) : byName(b, a)));
}

export async function listProducts(query: ProductListQuery): Promise<Page<Product>> {
  return paginate(filterAndSort(query), query.page, query.pageSize);
}

/** Every matching row, for the local CSV export (page and size ignored, as in the API). */
export async function exportProducts(
  query: Omit<ProductListQuery, "page" | "pageSize">,
): Promise<Product[]> {
  return filterAndSort(query);
}

export async function getProduct(id: string): Promise<Product | null> {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

/** The demo's last Billz sync: two minutes before `DEMO_NOW`, as the design shows. */
export const MOCK_LAST_SYNC_AT = new Date(Date.parse(DEMO_NOW) - 2 * 60 * 1000).toISOString();

export async function getCatalogStats(): Promise<CatalogStats> {
  return {
    total: PRODUCTS.length,
    active: PRODUCTS.filter((p) => p.status === "active").length,
    hidden: PRODUCTS.filter((p) => p.status === "hidden").length,
    newFromBillz: PRODUCTS.filter((p) => p.isNewFromBillz).length,
    outOfStock: PRODUCTS.filter((p) => stockLevel(p.stock) === "out").length,
    billzConnected: true,
    lastSyncAt: MOCK_LAST_SYNC_AT,
    lastSyncLabel: lastSyncLabel(MOCK_LAST_SYNC_AT, referenceNow()),
  };
}
