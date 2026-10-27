import type { Category } from "@/domain/category";

import type { CategoryFormValues } from "../../categories.schema";
import type { ApiCategory, ApiCategoryPatch, ApiCategoryWrite } from "../types";
import { mapSeo, mapSeoStatus } from "./seo";

/** `Category` (contract §2.4) → the FE domain type. */
export function mapCategory(api: ApiCategory): Category {
  return {
    slug: api.slug,
    name: { uz: api.name.uz, ru: api.name.ru, en: api.name.en },
    imageUrl: api.image_url ?? null,
    position: api.position,
    isActive: api.is_active,
    productCount: api.product_count,
    seo: mapSeo(api.seo),
    seoStatus: mapSeoStatus(api.seo_status),
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
    seo: values.seo,
  };
}

/** Body of `PATCH categories/{slug}/`: the slug is immutable and never sent. */
export function categoryPatchBody(values: Omit<CategoryFormValues, "slug">): ApiCategoryPatch {
  return {
    name: { uz: values.name.uz, ru: values.name.ru, en: values.name.en },
    is_active: values.isActive,
    seo: values.seo,
  };
}

/**
 * Multipart body of `POST categories/` (with `slug`) or `PATCH
 * categories/{slug}/` (without) when an image was picked (gap ADM-5.1):
 * dotted names like the banners', booleans as `true`/`false`.
 */
export function categoryFormData(
  values: Omit<CategoryFormValues, "slug"> & { slug?: string },
  image: File,
): FormData {
  const form = new FormData();
  if (values.slug !== undefined) form.set("slug", values.slug);
  form.set("name.uz", values.name.uz);
  form.set("name.ru", values.name.ru);
  form.set("name.en", values.name.en);
  form.set("is_active", values.isActive ? "true" : "false");
  // B-W1: the SEO leaves are dotted too (`seo.uz.title`).
  for (const language of ["uz", "ru", "en"] as const) {
    form.set(`seo.${language}.title`, values.seo[language].title);
    form.set(`seo.${language}.description`, values.seo[language].description);
  }
  form.set("image", image, image.name);
  return form;
}
