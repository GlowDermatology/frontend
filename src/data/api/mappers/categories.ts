import type { Category } from "@/domain/category";

import type { CategoryFormValues } from "../../categories.schema";
import type { ApiCategory, ApiCategoryPatch, ApiCategoryWrite } from "../types";

/** `Category` (contract §2.4) → the FE domain type. */
export function mapCategory(api: ApiCategory): Category {
  return {
    slug: api.slug,
    name: { uz: api.name.uz, ru: api.name.ru, en: api.name.en },
    position: api.position,
    isActive: api.is_active,
    productCount: api.product_count,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/** Body of `POST categories/`. */
export function categoryCreateBody(values: CategoryFormValues): ApiCategoryWrite {
  return {
    slug: values.slug,
    name: { uz: values.name.uz, ru: values.name.ru, en: values.name.en },
    is_active: values.isActive,
  };
}

/** Body of `PATCH categories/{slug}/`: the slug is immutable and never sent. */
export function categoryPatchBody(values: Omit<CategoryFormValues, "slug">): ApiCategoryPatch {
  return {
    name: { uz: values.name.uz, ru: values.name.ru, en: values.name.en },
    is_active: values.isActive,
  };
}
