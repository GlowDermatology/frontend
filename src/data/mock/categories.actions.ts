import { canDeleteCategory, type Category } from "@/domain/category";

import type { CategoryEditValues, CategoryFormValues } from "../categories.schema";
import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { CATEGORIES } from "./categories";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/categories.actions.ts`: the same answers
 * Django gives (contract §2.4), computed from the fixtures and not persisted.
 */

const bySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug) ?? null;

export const CATEGORY_HAS_PRODUCTS_MESSAGE = "Kategoriyada mahsulotlar bor.";

export async function createCategory(values: CategoryFormValues): Promise<ActionResult<Category>> {
  await delay(400);
  if (bySlug(values.slug)) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: { slug: "Bu qiymat band." },
    };
  }
  const now = referenceNow().toISOString();
  return {
    ok: true,
    data: {
      slug: values.slug,
      name: values.name,
      position: CATEGORIES.length,
      isActive: values.isActive,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function updateCategory(
  slug: string,
  values: CategoryEditValues,
): Promise<ActionResult<Category>> {
  await delay(400);
  const before = bySlug(slug);
  if (!before) return { ok: false, error: "Kategoriya topilmadi.", code: "not_found" };
  return {
    ok: true,
    data: {
      ...before,
      name: values.name,
      isActive: values.isActive,
      updatedAt: referenceNow().toISOString(),
    },
  };
}

export async function deleteCategory(slug: string): Promise<ActionResult<{ slug: string }>> {
  await delay(300);
  const before = bySlug(slug);
  if (!before) return { ok: false, error: "Kategoriya topilmadi.", code: "not_found" };
  if (!canDeleteCategory(before)) {
    return { ok: false, error: CATEGORY_HAS_PRODUCTS_MESSAGE, code: "conflict" };
  }
  return { ok: true, data: { slug } };
}

/** `slugs` must be exactly the current set (contract `mismatch`); returns the reordered list. */
export async function reorderCategories(slugs: string[]): Promise<ActionResult<Category[]>> {
  await delay(200);
  const current = new Set(CATEGORIES.map((c) => c.slug));
  const same = slugs.length === current.size && slugs.every((slug) => current.has(slug));
  if (!same) return { ok: false, error: "Ro‘yxat joriy elementlarga mos emas.", code: "mismatch" };
  return {
    ok: true,
    data: slugs.map((slug, position) => ({ ...bySlug(slug)!, position })),
  };
}
