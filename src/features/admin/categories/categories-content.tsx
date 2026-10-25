import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";

import { CategoriesView } from "./categories-view";

/** Data boundary of /admin/categories: the whole list, ordered by position. */
export async function CategoriesContent() {
  await requireStaff();
  const categories = await getCategories();
  return <CategoriesView categories={categories} exportHref="/admin/categories/export" />;
}
