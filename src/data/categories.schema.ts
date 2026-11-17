import { z } from "zod";

import { CATEGORY_SLUG_PATTERN, isReservedCategorySlug } from "@/domain/category";
import { catalogDataCopy, type CatalogDataCopy } from "@/domain/copy/catalog";
import { emptySeo } from "@/domain/seo";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

import { imageFileSchemas, seoFormSchemas } from "./products.schema";

/**
 * Validation for the category dialogs (contract §2.4), shared by the form and
 * the Server Actions, one schema per admin language (`categorySchemas[locale]`,
 * messages from `catalogDataCopy`). The slug is immutable after creation: the
 * edit dialog shows it read-only and `updateCategory` never sends it.
 */

function slugSchema(m: CatalogDataCopy) {
  return z
    .string()
    .trim()
    .regex(CATEGORY_SLUG_PATTERN, m.categorySlugInvalid)
    .refine((slug) => !isReservedCategorySlug(slug), { error: m.slugReserved });
}

export const categorySchemas = localized(catalogDataCopy, (m, locale) => {
  const optionalName = z.string().trim().max(60, m.maxChars(60));
  const form = z.object({
    slug: slugSchema(m),
    name: z.object({
      uz: z.string().trim().min(2, m.categoryNameUzRequired).max(60, m.maxChars(60)),
      ru: optionalName,
      en: optionalName,
    }),
    isActive: z.boolean(),
    /** Page title / meta description per language (B-W1). */
    seo: seoFormSchemas[locale],
  });
  return {
    slug: slugSchema(m),
    form,
    /** The editable part of an existing category (everything but the slug). */
    edit: form.omit({ slug: true }),
    image: imageFileSchemas[locale].optional(),
  };
});

export type CategoryFormValues = z.infer<LocalizedOf<typeof categorySchemas>["form"]>;
export type CategoryEditValues = z.infer<LocalizedOf<typeof categorySchemas>["edit"]>;

/**
 * The dialog's image change (gap ADM-5.1, contract §2.4), sent next to the
 * values as `FormData`: an `image` part (JPEG/PNG/WebP ≤ 5 MiB) replaces the
 * image, `remove_image=true` drops it; never both.
 */
export interface CategoryImageChange {
  image: File | null;
  remove: boolean;
}

/** The dialog's image change → the `FormData` the actions take. */
export function categoryMediaFormData(change: CategoryImageChange): FormData | null {
  if (!change.image && !change.remove) return null;
  const form = new FormData();
  if (change.image) form.set("image", change.image, change.image.name);
  else form.set("remove_image", "true");
  return form;
}

export const EMPTY_CATEGORY: CategoryFormValues = {
  slug: "",
  name: { uz: "", ru: "", en: "" },
  isActive: true,
  seo: emptySeo(),
};
