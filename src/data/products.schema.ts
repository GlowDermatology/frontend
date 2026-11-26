import { z } from "zod";

import { CATEGORY_SLUG_PATTERN } from "@/domain/category";
import { ALT_MAX_LENGTH, TEXT_MAX_LENGTH } from "@/domain/product";
import { catalogDataCopy, type CatalogDataCopy } from "@/domain/copy/catalog";
import { PRODUCT_SLUG_MAX, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, slugProblem } from "@/domain/seo";
import type { Locale } from "@/lib/i18n/locales";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

/**
 * Validation for the product editor, one schema per admin language (`productFormSchemas[locale]`,
 * messages from `catalogDataCopy`). The same schema re-validates the payload in the Server
 * Action before it is sent to `POST products/` / `PATCH products/{id}/` (contract §2.3).
 */
export const MAX_IMAGES = 8;
/** 5 MiB (contract §2.3 `file_too_large`); checked client-side before the round trip. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const textOf = (m: CatalogDataCopy) => (max: number) => z.string().trim().max(max, m.maxChars(max));

function textsSchema(m: CatalogDataCopy) {
  const text = textOf(m);
  return z.object({
    name: text(TEXT_MAX_LENGTH.name),
    shortDescription: text(TEXT_MAX_LENGTH.shortDescription),
    description: text(TEXT_MAX_LENGTH.description),
    ingredients: text(TEXT_MAX_LENGTH.ingredients),
    usage: text(TEXT_MAX_LENGTH.usage),
  });
}

function altSchema(m: CatalogDataCopy) {
  const text = textOf(m)(ALT_MAX_LENGTH);
  return z.object({ uz: text, ru: text, en: text });
}

const imageBase = z.object({
  id: z.string(),
  label: z.string(),
  art: z
    .object({
      kind: z.enum(["pump", "jar", "dropper", "tube", "toner", "box", "texture"]),
      tone: z.enum(["default", "night", "dark-cap"]).optional(),
    })
    .optional(),
  src: z.string().optional(),
});

function seoSchema(m: CatalogDataCopy) {
  const text = textOf(m);
  const seoText = z.object({
    title: text(SEO_TITLE_MAX),
    description: text(SEO_DESCRIPTION_MAX),
  });
  return z.object({ uz: seoText, ru: seoText, en: seoText });
}

/** `seo.{uz,ru,en}.{title,description}` (B-W1): optional, ≤120 / ≤300, `""` = the website builds one. */
export const seoFormSchemas = localized(catalogDataCopy, seoSchema);

/**
 * The website URL segment (B-W1). `""` on a new product: the server derives
 * it from the name; an existing product never sends `""` (it keeps its slug).
 */
export function slugFieldSchema(max: number, locale: Locale = "uz") {
  return z
    .string()
    .trim()
    .superRefine((slug, ctx) => {
      if (slug === "") return;
      const problem = slugProblem(slug, max, locale);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });
}

export const productFormSchemas = localized(catalogDataCopy, (m, locale) => {
  const texts = textsSchema(m);
  return z
    .object({
      texts: z.object({
        uz: texts.extend({
          name: z.string().trim().min(2, m.nameUzRequired).max(120, m.maxChars(120)),
        }),
        ru: texts,
        en: texts,
      }),
      price: z
        .number({ error: m.priceRequired })
        .int(m.priceInteger)
        .min(1000, m.priceMin)
        .max(100_000_000, m.priceMax),
      /** Category slug, or `""` for "Tanlanmagan" (sent as `null`). */
      category: z.string().regex(CATEGORY_SLUG_PATTERN, m.categoryUnknown).or(z.literal("")),
      billzId: z
        .string()
        .trim()
        .regex(/^\d{6,14}$/, m.billzIdInvalid),
      promo: z.boolean(),
      status: z.enum(["active", "hidden"]),
      images: z
        .array(imageBase.extend({ alt: altSchema(m).optional() }))
        .max(MAX_IMAGES, m.tooManyImages(MAX_IMAGES)),
      slug: slugFieldSchema(PRODUCT_SLUG_MAX, locale),
      seo: seoSchema(m),
    })
    .superRefine(
      (values, ctx) => {
        if (values?.status !== "active") return;
        if (!values.category) {
          ctx.addIssue({ code: "custom", path: ["category"], message: m.activeNeedsCategory });
        }
        if (Array.isArray(values.images) && values.images.length === 0) {
          ctx.addIssue({ code: "custom", path: ["images"], message: m.activeNeedsImage });
        }
      },
      // Also while another field is refused (an empty price): every error shows in one
      // round, so a missing photo is never discovered only after the rest is fixed.
      { when: () => true },
    );
});

export type ProductFormValues = z.infer<LocalizedOf<typeof productFormSchemas>>;

const baselineText = z.string().max(5000);
const baselineTexts = z.object({
  name: baselineText,
  shortDescription: baselineText,
  description: baselineText,
  ingredients: baselineText,
  usage: baselineText,
});

/**
 * The editor's baseline (what it loaded, or what the server holds after a
 * partially failed save) that `saveProduct` diffs a PATCH against. Shape
 * checks only: a baseline is server data and may break the form rules (an
 * imported draft carries `price: 0`).
 */
export const productBaselineSchema = z.object({
  texts: z.object({ uz: baselineTexts, ru: baselineTexts, en: baselineTexts }),
  price: z.number().int().min(0).max(1_000_000_000),
  category: z.string().max(40),
  billzId: z.string().max(14),
  promo: z.boolean(),
  status: z.enum(["active", "hidden"]),
  slug: z.string().max(PRODUCT_SLUG_MAX),
  seo: z.object({
    uz: z.object({ title: baselineText, description: baselineText }),
    ru: z.object({ title: baselineText, description: baselineText }),
    en: z.object({ title: baselineText, description: baselineText }),
  }),
});

export type ProductBaseline = z.infer<typeof productBaselineSchema>;

/** The contract's messages for the two file rules (§1.6 generic field codes), in Uzbek. */
export const IMAGE_TOO_LARGE_MESSAGE = catalogDataCopy.uz.imageTooLarge;
export const IMAGE_TYPE_MESSAGE = catalogDataCopy.uz.imageType;

/**
 * Why a picked image file is refused before the round trip (type, then size), in `locale`;
 * `null` when it is a JPEG/PNG/WebP of at most 5 MiB.
 */
export function imageFileProblem(
  file: Pick<File, "type" | "size">,
  locale: Locale = "uz",
): string | null {
  const m = catalogDataCopy[locale];
  if (!(IMAGE_TYPES as ReadonlyArray<string>).includes(file.type)) return m.imageType;
  if (file.size > MAX_IMAGE_BYTES) return m.imageTooLarge;
  return null;
}

/** A picked image file: JPEG/PNG/WebP, 1 byte … 5 MiB. */
export const imageFileSchemas = localized(catalogDataCopy, (m) =>
  z
    .instanceof(File, { error: m.imageFileRequired })
    .refine((file) => (IMAGE_TYPES as ReadonlyArray<string>).includes(file.type), {
      error: m.imageType,
    })
    .refine((file) => file.size > 0 && file.size <= MAX_IMAGE_BYTES, {
      error: m.imageTooLarge,
    }),
);
/** @deprecated Uzbek messages: use `imageFileSchemas[locale]`. */
export const imageFileSchema = imageFileSchemas.uz;

/** A crop as sent: four finite numbers (0-1 of the image); the server judges bounds and shape. */
const cropSchema = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .refine((crop) => crop.every((value) => Number.isFinite(value) && value >= -1 && value <= 2));
const renditionChangeSchema = z.union([cropSchema, z.literal("auto"), z.null()]);

/**
 * Body of `PUT products/{id}/images/{image_id}/renditions/` (backend 0bcf0a5): per shape a crop,
 * `"auto"` or `null` (removed); a shape left out is kept. At least one shape.
 */
export const renditionChangesSchema = z
  .object({ portrait: renditionChangeSchema.optional(), square: renditionChangeSchema.optional() })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);
