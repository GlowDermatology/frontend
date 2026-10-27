import type { Category } from "@/domain/category";
import { categorySeoStatus, emptySeo, type SeoTexts } from "@/domain/seo";

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

/** The demo's filled SEO texts (the rest leave them to the website). */
const SEO: Record<string, SeoTexts> = {
  serums: {
    uz: {
      title: "Yuz uchun serumlar — Glow Derma",
      description:
        "Gialuron, vitamin C va niatsinamidli serumlar: dermatolog tanlovi, asl mahsulotlar, Toshkent bo‘ylab yetkazib berish.",
    },
    ru: { title: "Сыворотки для лица", description: "" },
    en: { title: "", description: "" },
  },
};

/** The demo's `seo_status`, computed the way the server does (`catalog.seo`). */
export function withCategorySeoStatus(category: Omit<Category, "seoStatus">): Category {
  return {
    ...category,
    seoStatus: categorySeoStatus({
      name: category.name,
      // `""`: a picked image the demo keeps no URL for (see `createCategory`).
      hasImage: category.imageUrl !== null,
      activeProducts: PRODUCTS.filter(
        (product) => product.category === category.slug && product.status === "active",
      ).length,
      seo: category.seo,
    }),
  };
}

export const CATEGORIES: ReadonlyArray<Category> = SEEDS.map(([slug, uz, ru, en], position) =>
  withCategorySeoStatus({
    slug,
    name: { uz, ru, en },
    imageUrl: null,
    position,
    isActive: true,
    productCount: PRODUCTS.filter((product) => product.category === slug).length,
    seo: SEO[slug] ?? emptySeo(),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }),
);

export const MOCK_CATEGORY_SLUGS: ReadonlyArray<string> = CATEGORIES.map((c) => c.slug);
