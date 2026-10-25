"use server";

import { z } from "zod";

import type { Product, ProductImage } from "@/domain/product";

import { apiMutation, fieldErrorsFrom, guardAction } from "./action-guard";
import * as mock from "./mock/products.actions";
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  productFormSchema,
  type ProductFormValues,
} from "./products.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Product mutations (spec "Frontend wiring › Server Actions", contract §2.3
 * and §7.7). The editor orchestrates a save as: `saveProduct` (create forced
 * hidden, or patch) → `uploadProductImage` per new file → `deleteProductImage`
 * per removed image → `reorderProductImages` → `saveProduct` again with
 * `status: "active"` when activation was requested → redirect on create.
 * Mock bodies live in `./mock/products.actions.ts`; the api branch (F2) maps
 * to `POST products/`, `PATCH products/{id}/`, `POST products/{id}/images/`,
 * `DELETE products/{id}/images/{imageId}/` and `PUT products/{id}/images/order/`.
 * Images are not idempotent-keyed: the client posts each file once.
 */

const productIdSchema = z.string().trim().min(1).max(64);
const imageIdSchema = z.string().trim().min(1).max(64);

const imageFileSchema = z
  .instanceof(File, { error: "Rasm faylini tanlang." })
  .refine((file) => (IMAGE_TYPES as ReadonlyArray<string>).includes(file.type), {
    error: "Faqat JPG, PNG yoki WebP.",
  })
  .refine((file) => file.size > 0 && file.size <= MAX_IMAGE_BYTES, {
    error: "Rasm 5 MB dan katta.",
  });

export async function saveProduct(
  id: string | null,
  values: ProductFormValues,
  csrf: string,
): Promise<ActionResult<Product>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = z.union([productIdSchema, z.null()]).safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Mahsulot topilmadi.", code: "not_found" };
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") return apiMutation("saveProduct");
  return mock.saveProduct(parsedId.data, parsed.data);
}

/** `formData` carries one `file` (JPG/PNG/WebP, ≤ 5 MB). */
export async function uploadProductImage(
  productId: string,
  formData: FormData,
  csrf: string,
): Promise<ActionResult<ProductImage>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .object({ productId: productIdSchema, file: imageFileSchema })
    .safeParse({ productId, file: formData.get("file") });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Rasmni tekshiring.");
  if ((await dataSource()) === "api") return apiMutation("uploadProductImage");
  return mock.uploadProductImage(parsed.data.productId, parsed.data.file);
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .object({ productId: productIdSchema, imageId: imageIdSchema })
    .safeParse({ productId, imageId });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") return apiMutation("deleteProductImage");
  return mock.deleteProductImage(parsed.data.productId, parsed.data.imageId);
}

/** The full ordered list of the product's image ids (first = main image). */
export async function reorderProductImages(
  productId: string,
  imageIds: string[],
  csrf: string,
): Promise<ActionResult<{ imageIds: string[] }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .object({
      productId: productIdSchema,
      imageIds: z
        .array(imageIdSchema)
        .max(MAX_IMAGES, `Ko‘pi bilan ${MAX_IMAGES} ta rasm qo‘shish mumkin.`)
        .refine((ids) => new Set(ids).size === ids.length, { error: "Rasmlar takrorlanmoqda." }),
    })
    .safeParse({ productId, imageIds });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Rasmlar tartibini tekshiring.");
  if ((await dataSource()) === "api") return apiMutation("reorderProductImages");
  return mock.reorderProductImages(parsed.data.productId, parsed.data.imageIds);
}
