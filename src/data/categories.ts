import "server-only";

import { cache } from "react";

import type { Category } from "@/domain/category";

import { apiListCategories } from "./api/catalog";
import { mapCategory } from "./api/mappers";
import { requireApiToken } from "./auth";
import * as mock from "./mock/categories.queries";
import { dataSource } from "./source";

/**
 * Categories read seam (contract §2.4). Categories are few and addressed by
 * slug, so the whole list is loaded, ordered by `position`, and shared per
 * render with React `cache()` between the products toolbar, the editor, the
 * product mapper and the Kategoriyalar section.
 */

const PAGE_SIZE = 50;

/** `GET /api/v1/admin/categories/?page_size=50` (every page, ordered by position). */
export const getCategories = cache(async (): Promise<Category[]> => {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const categories: Category[] = [];
    let page = 1;
    for (;;) {
      const { data } = await apiListCategories(token, { page, page_size: PAGE_SIZE });
      categories.push(...data.results.map(mapCategory));
      if (page >= data.page_count) break;
      page += 1;
    }
    return categories.sort((a, b) => a.position - b.position);
  }
  return mock.getCategories();
});

/** The active categories, for pickers (product category, banner link). */
export async function getActiveCategories(): Promise<Category[]> {
  return (await getCategories()).filter((category) => category.isActive);
}
