import { z } from "zod";

import { CATEGORY_SLUG_PATTERN, isReservedCategorySlug } from "@/domain/category";

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
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/** The editable part of an existing category (everything but the slug). */
export const categoryEditSchema = categoryFormSchema.omit({ slug: true });
export type CategoryEditValues = z.infer<typeof categoryEditSchema>;

export const EMPTY_CATEGORY: CategoryFormValues = {
  slug: "",
  name: { uz: "", ru: "", en: "" },
  isActive: true,
};
