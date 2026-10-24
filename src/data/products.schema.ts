import { z } from "zod";

import { CATEGORY_IDS } from "@/domain/product";

/**
 * Validation for the product editor. The same schema can validate the payload
 * in a Server Action before it is sent to `PUT /api/v1/admin/products/{id}/`.
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
    category: z.enum(CATEGORY_IDS).or(z.literal("")),
    billzId: z
      .string()
      .trim()
      .regex(/^\d{6,14}$/, "Billz ID yoki shtrix-kod 6–14 ta raqamdan iborat bo‘lsin."),
    promo: z.boolean(),
    status: z.enum(["active", "hidden"]),
    images: z.array(image).max(8),
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

export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
