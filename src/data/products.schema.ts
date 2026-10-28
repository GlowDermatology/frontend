import { z } from "zod";

import { CATEGORY_SLUG_PATTERN } from "@/domain/category";
import { PRODUCT_SLUG_MAX, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, slugProblem } from "@/domain/seo";

/**
 * Validation for the product editor. The same schema re-validates the payload
 * in the Server Action before it is sent to `POST products/` / `PATCH
 * products/{id}/` (contract §2.3).
 */
const text = (max: number) => z.string().trim().max(max, `${max} belgidan oshmasin.`);

const texts = z.object({
  name: text(120),
  description: text(2000),
  ingredients: text(2000),
  usage: text(1000),
});

const image = z.object({
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

const seoText = z.object({
  title: text(SEO_TITLE_MAX),
  description: text(SEO_DESCRIPTION_MAX),
});

/** `seo.{uz,ru,en}.{title,description}` (B-W1): optional, ≤120 / ≤300, `""` = the website builds one. */
export const seoFormSchema = z.object({ uz: seoText, ru: seoText, en: seoText });

/**
 * The website URL segment (B-W1). `""` on a new product: the server derives
 * it from the name; an existing product never sends `""` (it keeps its slug).
 */
export function slugFieldSchema(max: number) {
  return z
    .string()
    .trim()
    .superRefine((slug, ctx) => {
      if (slug === "") return;
      const problem = slugProblem(slug, max);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });
}

export const productFormSchema = z
  .object({
    texts: z.object({
      uz: texts.extend({
        name: z
          .string()
          .trim()
          .min(2, "O‘zbekcha nomni kiriting (kamida 2 belgi).")
          .max(120, "120 belgidan oshmasin."),
      }),
      ru: texts,
      en: texts,
    }),
    price: z
      .number({ error: "Narxni kiriting." })
      .int()
      .min(1000, "Narx kamida 1 000 so‘m bo‘lsin.")
      .max(100_000_000, "Narx juda katta."),
    /** Category slug, or `""` for "Tanlanmagan" (sent as `null`). */
    category: z.string().regex(CATEGORY_SLUG_PATTERN, "Kategoriya topilmadi.").or(z.literal("")),
    billzId: z
      .string()
      .trim()
      .regex(/^\d{6,14}$/, "Billz ID yoki shtrix-kod 6–14 ta raqamdan iborat bo‘lsin."),
    promo: z.boolean(),
    status: z.enum(["active", "hidden"]),
    images: z.array(image).max(8),
    slug: slugFieldSchema(PRODUCT_SLUG_MAX),
    seo: seoFormSchema,
  })
  .superRefine((values, ctx) => {
    if (values.status !== "active") return;
    if (!values.category) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Faol mahsulot uchun kategoriyani tanlang.",
      });
    }
    if (values.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Faol mahsulotda kamida bitta rasm bo‘lsin.",
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

const baselineText = z.string().max(5000);
const baselineTexts = z.object({
  name: baselineText,
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

export const MAX_IMAGES = 8;
/** 5 MiB (contract §2.3 `file_too_large`); checked client-side before the round trip. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** The contract's messages for the two file rules (§1.6 generic field codes). */
export const IMAGE_TOO_LARGE_MESSAGE = "Rasm 5 MB dan oshmasin.";
export const IMAGE_TYPE_MESSAGE = "Faqat JPEG, PNG yoki WebP rasm.";

/** A picked image file: JPEG/PNG/WebP, 1 byte … 5 MiB. */
export const imageFileSchema = z
  .instanceof(File, { error: "Rasm faylini tanlang." })
  .refine((file) => (IMAGE_TYPES as ReadonlyArray<string>).includes(file.type), {
    error: IMAGE_TYPE_MESSAGE,
  })
  .refine((file) => file.size > 0 && file.size <= MAX_IMAGE_BYTES, {
    error: IMAGE_TOO_LARGE_MESSAGE,
  });
