import { z } from "zod";

import { CATEGORY_SLUG_PATTERN, isReservedCategorySlug } from "@/domain/category";

import { emptySeo } from "@/domain/seo";

import { imageFileSchema, seoFormSchema } from "./products.schema";

/**
 * Validation for the category dialogs (contract §2.4), shared by the form and
 * the Server Actions. The slug is immutable after creation: the edit dialog
 * shows it read-only and `updateCategory` never sends it.
 */

const optionalName = z.string().trim().max(60, "60 belgidan oshmasin.");

export const categorySlugSchema = z
  .string()
  .trim()
  .regex(
    CATEGORY_SLUG_PATTERN,
    "Slug 2–40 ta kichik lotin harfi, raqam yoki defisdan iborat bo‘lsin.",
  )
  .refine((slug) => !isReservedCategorySlug(slug), { error: "Bu slug band." });

export const categoryFormSchema = z.object({
  slug: categorySlugSchema,
  name: z.object({
    uz: z
      .string()
      .trim()
      .min(2, "O‘zbekcha nomni kiriting (kamida 2 belgi).")
      .max(60, "60 belgidan oshmasin."),
    ru: optionalName,
    en: optionalName,
  }),
  isActive: z.boolean(),
  /** Page title / meta description per language (B-W1). */
  seo: seoFormSchema,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/** The editable part of an existing category (everything but the slug). */
export const categoryEditSchema = categoryFormSchema.omit({ slug: true });
export type CategoryEditValues = z.infer<typeof categoryEditSchema>;

/**
 * The dialog's image change (gap ADM-5.1, contract §2.4), sent next to the
 * values as `FormData`: an `image` part (JPEG/PNG/WebP ≤ 5 MiB) replaces the
 * image, `remove_image=true` drops it; never both.
 */
export interface CategoryImageChange {
  image: File | null;
  remove: boolean;
}

export const categoryImageSchema = imageFileSchema.optional();

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
