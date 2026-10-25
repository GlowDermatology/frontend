import { productDisplayName as displayName, stockLevel, type Product } from "@/domain/product";

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

export async function listProducts(query: ProductListQuery): Promise<Page<Product>> {
  const filtered = PRODUCTS.filter((p) => matches(p, query));
  const byName = (a: Product, b: Product) => displayName(a).localeCompare(displayName(b), "uz");
  const sorted =
    query.sort === "default"
      ? filtered
      : [...filtered].sort((a, b) => (query.sort === "name_asc" ? byName(a, b) : byName(b, a)));
  return paginate(sorted, query.page, query.pageSize);
}

export async function getProduct(id: string): Promise<Product | null> {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export async function getCatalogStats(): Promise<CatalogStats> {
  return {
    total: PRODUCTS.length,
    newFromBillz: PRODUCTS.filter((p) => p.isNewFromBillz).length,
    outOfStock: PRODUCTS.filter((p) => stockLevel(p.stock) === "out").length,
    lastSyncLabel: "2 daqiqa oldin",
  };
}
