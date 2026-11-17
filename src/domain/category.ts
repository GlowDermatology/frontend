import { isFilled, recommendedToAsk, textChanged } from "@/lib/forms/recommended-rules";

import type { ContentLanguage } from "./product";
import type { SeoStatus, SeoTexts } from "./seo";

/**
 * Product categories (contract §2.4). Addressed by slug; ordered by
 * `position`; the Uzbek name is the label the admin and the exports show.
 */

export type CategoryName = Record<ContentLanguage, string>;

export interface Category {
  slug: string;
  name: CategoryName;
  /** Absolute media URL of the category image (gap ADM-5.1), `null` when none. */
  imageUrl: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  /** Page title / meta description per language (B-W1). */
  seo: SeoTexts;
  /** The server's «SEO holati» checklist (B-W1). */
  seoStatus: SeoStatus;
  createdAt: string;
  updatedAt: string;
}

/** `^[a-z0-9-]{2,40}$` (contract §1.4 and §2.4). */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/;

/** Slugs that collide with routes or query values (`categories/order/`, `?category=none`). */
export const RESERVED_CATEGORY_SLUGS = ["order", "none"] as const;

export function isReservedCategorySlug(slug: string): boolean {
  return (RESERVED_CATEGORY_SLUGS as ReadonlyArray<string>).includes(slug);
}

/** Uzbek label of a category slug, or the slug itself when the list does not know it. */
export function categoryLabel(categories: ReadonlyArray<Category>, slug: string): string {
  return categories.find((category) => category.slug === slug)?.name.uz || slug;
}

/** Whether a category can be removed: only an empty one (409 `conflict` otherwise). */
export function canDeleteCategory(category: Pick<Category, "productCount">): boolean {
  return category.productCount === 0;
}

/**
 * Fields the dialog recommends but does not require: the Russian and English names (the
 * website and the app fall back to Uzbek). The image is not asked: the storefront card has a
 * fallback and the «SEO holati» checklist already reports a missing one.
 */
export type CategoryRecommendedField = "name.ru" | "name.en";

export function categoryRecommendedMissing(values: {
  name: CategoryName;
}): CategoryRecommendedField[] {
  const missing: CategoryRecommendedField[] = [];
  if (!values.name.ru.trim()) missing.push("name.ru");
  if (!values.name.en.trim()) missing.push("name.en");
  return missing;
}

/**
 * The empty names worth asking about on this save (`recommendedToAsk`): an inactive category
 * never asks; a new one, or the save that activates it, asks about both; else only a name the
 * admin just emptied, or both empty ones when the Uzbek name changed. `saved` = the stored
 * category (`null` = create).
 */
export function categoryRecommendedToAsk(
  values: { name: CategoryName; isActive: boolean },
  saved: { name: CategoryName; isActive: boolean } | null,
): CategoryRecommendedField[] {
  return recommendedToAsk(categoryRecommendedMissing(values), {
    isNew: saved === null,
    active: values.isActive,
    wasActive: saved?.isActive,
    filledBefore: (field) => isFilled(field === "name.ru" ? saved?.name.ru : saved?.name.en),
    sourceChanged: () => textChanged(saved?.name.uz, values.name.uz),
  });
}

/** Moves the item at `from` to `to`, returning a new array (no-op when out of range). */
export function moveItem<T>(items: ReadonlyArray<T>, from: number, to: number): T[] {
  const next = [...items];
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * A slug suggestion from an Uzbek (Latin) name: lower-case ASCII letters,
 * digits and single dashes, Uzbek apostrophes dropped (`O‘zbek` → `ozbek`),
 * cut to 40 characters. Cyrillic and other scripts yield `""` (the admin
 * types the slug by hand).
 */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
