import type { Category } from "@/domain/category";

import { PRODUCTS } from "./catalog";

/**
 * Mock categories: the five slugs the product fixtures use, in the order the
 * design's filter lists them. `productCount` is derived from the catalog so
 * the two fixtures never disagree.
 */

const SEEDS: ReadonlyArray<[slug: string, uz: string, ru: string, en: string]> = [
  ["serums", "Serumlar", "Сыворотки", "Serums"],
  ["cleansing", "Tozalash", "Очищение", "Cleansing"],
  ["moisturizing", "Namlantirish", "Увлажнение", "Moisturising"],
  ["sun", "Quyoshdan himoya", "Защита от солнца", "Sun care"],
  ["toners", "Tonerlar", "Тонеры", "Toners"],
];

const CREATED_AT = "2026-06-01T09:00:00+05:00";

export const CATEGORIES: ReadonlyArray<Category> = SEEDS.map(([slug, uz, ru, en], position) => ({
  slug,
  name: { uz, ru, en },
  position,
  isActive: true,
  productCount: PRODUCTS.filter((product) => product.category === slug).length,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}));

export const MOCK_CATEGORY_SLUGS: ReadonlyArray<string> = CATEGORIES.map((c) => c.slug);
