import type { ShopCategory, ShopProduct } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { clampDescription } from "./metadata";

/**
 * Titles and descriptions of entity pages (pure; unit-tested). The quality
 * of a product page depends on what staff typed, so: the API's
 * `seo_title`/`seo_description` win when filled (B-W1); otherwise the
 * description's first sentences; when that is empty too, a sentence built
 * from name, volume, category and price — never an empty description.
 */

export function productTitle(product: ShopProduct): string {
  if (product.seoTitle) return product.seoTitle;
  return product.volume ? `${product.name}, ${product.volume}` : product.name;
}

export function productDescription(
  product: ShopProduct,
  locale: Locale,
  dict: ShopDictionary,
): string {
  if (product.seoDescription) return clampDescription(product.seoDescription);
  if (product.description.replace(/\s+/g, "").length >= 50) {
    return clampDescription(product.description);
  }
  return clampDescription(
    dict.meta.productDescription({
      name: product.name,
      volume: product.volume,
      category: product.category?.name ?? null,
      price: formatPrice(product.price, locale),
    }),
  );
}

export function categoryTitle(category: ShopCategory, dict: ShopDictionary): string {
  return category.seoTitle ?? dict.meta.categoryTitle(category.name);
}

export function categoryDescription(category: ShopCategory, dict: ShopDictionary): string {
  if (category.seoDescription) return clampDescription(category.seoDescription);
  if (category.description && category.description.length >= 50) {
    return clampDescription(category.description);
  }
  return clampDescription(dict.meta.categoryDescription(category.name, category.productCount));
}
