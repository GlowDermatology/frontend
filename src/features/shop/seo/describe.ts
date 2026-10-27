import type { ShopCategory, ShopProduct } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { localizeVolume } from "../content/volume";
import { clampDescription } from "./metadata";

/**
 * Titles and descriptions of entity pages (pure; unit-tested). The quality
 * of a product page depends on what staff typed, so: the API's
 * `seo_title`/`seo_description` win when filled (B-W1); otherwise the
 * description's first sentences; when that is empty too, a sentence built
 * from name, volume, category and price — never an empty description.
 */

/** The Uzbek texts of the same product, to spot an untranslated fallback (U6). */
export type UzTexts = Pick<ShopProduct, "description" | "seoTitle" | "seoDescription"> | null;

const squash = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/**
 * A ru/en text the API filled from Uzbek (staff left the translation empty)
 * counts as missing: a Russian page must not describe itself in Uzbek.
 */
function own(
  value: string | null | undefined,
  locale: Locale,
  uz: UzTexts | undefined,
  key: keyof NonNullable<UzTexts>,
  contentLanguage: Locale | null = null,
): string {
  if (!value) return "";
  if (locale === "uz") return value;
  // The API says which language the texts came in (`content_language`).
  if (contentLanguage !== null && contentLanguage !== locale) return "";
  // An older API, or one text left untranslated: compare with the Uzbek one.
  if (uz && squash(uz[key]) === squash(value)) return "";
  return value;
}

export function productTitle(product: ShopProduct, locale: Locale = "uz", uz?: UzTexts): string {
  const seoTitle = own(product.seoTitle, locale, uz, "seoTitle", product.contentLanguage);
  if (seoTitle) return seoTitle;
  const volume = localizeVolume(product.volume, locale);
  return volume ? `${product.name}, ${volume}` : product.name;
}

export function productDescription(
  product: ShopProduct,
  locale: Locale,
  dict: ShopDictionary,
  uz?: UzTexts,
): string {
  const seoDescription = own(
    product.seoDescription,
    locale,
    uz,
    "seoDescription",
    product.contentLanguage,
  );
  if (seoDescription) return clampDescription(seoDescription);
  const description = own(product.description, locale, uz, "description", product.contentLanguage);
  if (description.replace(/\s+/g, "").length >= 50) {
    return clampDescription(description);
  }
  return clampDescription(
    dict.meta.productDescription({
      name: product.name,
      volume: localizeVolume(product.volume, locale),
      category: product.category?.name ?? null,
      price: formatPrice(product.price, locale),
    }),
  );
}

export function categoryTitle(category: ShopCategory, dict: ShopDictionary): string {
  return category.seoTitle ?? dict.meta.categoryTitle(category.name);
}

/** Whether an entity's texts are in the page's language (unknown counts as yes). */
export function inPageLanguage(contentLanguage: Locale | null, locale: Locale): boolean {
  return locale === "uz" || contentLanguage === null || contentLanguage === locale;
}

export function categoryDescription(
  category: ShopCategory,
  dict: ShopDictionary,
  locale: Locale = "uz",
): string {
  // An Uzbek fallback on a ru/en page gives way to the generated sentence (U6).
  if (!inPageLanguage(category.contentLanguage, locale)) {
    return clampDescription(dict.meta.categoryDescription(category.name, category.productCount));
  }
  if (category.seoDescription) return clampDescription(category.seoDescription);
  if (category.description && category.description.length >= 50) {
    return clampDescription(category.description);
  }
  return clampDescription(dict.meta.categoryDescription(category.name, category.productCount));
}
