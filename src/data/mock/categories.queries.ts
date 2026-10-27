import type { Category } from "@/domain/category";

import { CATEGORIES } from "./categories";

/** Mock implementation of `src/data/categories.ts`. */
export async function getCategories(): Promise<Category[]> {
  return [...CATEGORIES].sort((a, b) => a.position - b.position);
}

/** Rows of the categories export (same order as the list). */
export async function exportCategories(): Promise<Category[]> {
  return getCategories();
}
