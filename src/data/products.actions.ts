"use server";

import { z } from "zod";

import type { Job } from "@/domain/job";
import { productDisplayName, type Product, type ProductImage } from "@/domain/product";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiCreateProduct,
  apiDeleteProductImage,
  apiGetProduct,
  apiPatchProduct,
  apiReorderProductImages,
  apiStartBillzImport,
  apiUploadProductImage,
} from "./api/catalog";
import {
  mapJob,
  mapProduct,
  mapProductImage,
  toActionResult,
  TOP_LEVEL_ERROR,
} from "./api/mappers";
import {
  PRODUCT_FIELD_REMAP,
  productCreateBody,
  productFullPatchBody,
  productPatchBody,
} from "./api/mappers/products";
import { getJob } from "./jobs";
import * as mock from "./mock/products.actions";
import { searchActiveProducts } from "./products";
import {
  imageFileSchema,
  MAX_IMAGES,
  productBaselineSchema,
  productFormSchema,
  type ProductBaseline,
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
 * Mock bodies live in `./mock/products.actions.ts`; the api branch maps to
 * `POST products/`, `PATCH products/{id}/`, `POST products/{id}/images/`,
 * `DELETE products/{id}/images/{imageId}/` and `PUT products/{id}/images/order/`.
 * The create is idempotent-keyed (a lost answer is replayed with the id);
 * the patches carry only what changed against the editor's baseline. Images
 * are not keyed: the client posts each file once and remembers the answer.
 */

const productIdSchema = z.string().trim().min(1).max(64);
const imageIdSchema = z.string().trim().min(1).max(64);
/** API ids are integers; anything else cannot exist on the server. */
const apiIdSchema = z.string().regex(/^\d{1,18}$/);

async function apiSaveProduct(
  token: string,
  id: string | null,
  values: ProductFormValues,
  baseline: ProductBaseline | null,
  key: string,
): Promise<ActionResult<Product>> {
  try {
    if (id === null) {
      // Keyed (contract §1.7): a create whose answer was lost is replayed
      // with its id instead of failing on `billz_id` `unique`.
      const { data } = await apiCreateProduct(token, productCreateBody(values), key);
      return { ok: true, data: mapProduct(data) };
    }
    if (!apiIdSchema.safeParse(id).success) {
      return { ok: false, error: "Mahsulot topilmadi.", code: "not_found" };
    }
    // No baseline (a caller outside the editor): every editable field is sent.
    const body = baseline ? productPatchBody(baseline, values) : productFullPatchBody(values);
    if (Object.keys(body).length === 0) {
      return { ok: true, data: mapProduct((await apiGetProduct(token, id)).data) };
    }
    const { data } = await apiPatchProduct(token, id, body);
    return { ok: true, data: mapProduct(data) };
  } catch (error) {
    return toActionResult(error, PRODUCT_FIELD_REMAP);
  }
}

/**
 * Creates the product (`id: null`, always hidden, keyed with `key`) or
 * patches it with what differs from `baseline` — the values the editor
 * loaded — so concurrent edits by another admin to other fields survive.
 */
export async function saveProduct(
  id: string | null,
  values: ProductFormValues,
  baseline: ProductBaseline | null,
  key: string,
  csrf: string,
): Promise<ActionResult<Product>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = z.union([productIdSchema, z.null()]).safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Mahsulot topilmadi.", code: "not_found" };
  const parsedKey = z.object({ key: idempotencyKeySchema }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error);
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const parsedBaseline = productBaselineSchema.nullable().safeParse(baseline);
  if (!parsedBaseline.success) return fieldErrorsFrom(parsedBaseline.error);
  if ((await dataSource()) === "api") {
    return apiMutation("saveProduct", () =>
      apiSaveProduct(
        sessionToken(guard.session),
        parsedId.data,
        parsed.data,
        parsedBaseline.data,
        parsedKey.data.key,
      ),
    );
  }
  return mock.saveProduct(parsedId.data, parsed.data);
}

/** `formData` carries one `file` (JPEG/PNG/WebP, ≤ 5 MiB). */
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
  if ((await dataSource()) === "api") {
    return apiMutation("uploadProductImage", async () => {
      try {
        const body = new FormData();
        body.set("file", parsed.data.file, parsed.data.file.name);
        const { data } = await apiUploadProductImage(
          sessionToken(guard.session),
          parsed.data.productId,
          body,
        );
        return { ok: true, data: mapProductImage(data) };
      } catch (error) {
        // `images` (max_items) is about the product, not the picked file.
        return toActionResult(error, { images: TOP_LEVEL_ERROR });
      }
    });
  }
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
  if ((await dataSource()) === "api") {
    return apiMutation("deleteProductImage", async () => {
      try {
        await apiDeleteProductImage(
          sessionToken(guard.session),
          parsed.data.productId,
          parsed.data.imageId,
        );
        return { ok: true, data: { id: parsed.data.imageId } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
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
  if ((await dataSource()) === "api") {
    return apiMutation("reorderProductImages", async () => {
      const ids = parsed.data.imageIds.map((id) => Number(id));
      if (ids.some((id) => !Number.isInteger(id))) {
        return { ok: false, error: "Rasmlar tartibini tekshiring.", code: "mismatch" };
      }
      try {
        const { data } = await apiReorderProductImages(
          sessionToken(guard.session),
          parsed.data.productId,
          ids,
        );
        const ordered = [...data.images].sort((a, b) => a.position - b.position);
        return { ok: true, data: { imageIds: ordered.map((image) => String(image.id)) } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.reorderProductImages(parsed.data.productId, parsed.data.imageIds);
}

/**
 * `POST integrations/billz/import/` → the job (202). Single-flight on the
 * server: a running import is returned instead of a new one. The client polls
 * it with `pollJob` until it is `succeeded` or `failed`.
 */
export async function importFromBillz(key: string, csrf: string): Promise<ActionResult<Job>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = z.object({ key: idempotencyKeySchema }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error);
  if ((await dataSource()) === "api") {
    return apiMutation("importFromBillz", async () => {
      try {
        const { data } = await apiStartBillzImport(sessionToken(guard.session), parsedKey.data.key);
        return { ok: true, data: mapJob(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.importFromBillz();
}

/** `GET jobs/{id}/` for the import poller (a read: no refresh, no idempotency key). */
export async function pollJob(id: string, csrf: string): Promise<ActionResult<Job>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = z.string().trim().min(1).max(64).safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Jarayon topilmadi.", code: "not_found" };
  try {
    const token = guard.session.mode === "api" ? guard.session.token : null;
    const job = await getJob(parsedId.data, token);
    if (!job) return { ok: false, error: "Jarayon topilmadi.", code: "not_found" };
    return { ok: true, data: job };
  } catch (error) {
    return toActionResult(error);
  }
}

/** A product as the pickers show it (banner links). */
export interface ProductPick {
  id: string;
  name: string;
  billzId: string;
  imageUrl?: string;
}

/** Active products matching `q` (up to 8), for the banner link picker. */
export async function searchProducts(
  q: string,
  csrf: string,
): Promise<ActionResult<ProductPick[]>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z.string().trim().max(64).safeParse(q);
  if (!parsed.success) return { ok: true, data: [] };
  try {
    const products = await searchActiveProducts(parsed.data);
    return {
      ok: true,
      data: products.map((product) => {
        const pick: ProductPick = {
          id: product.id,
          name: productDisplayName(product),
          billzId: product.billzId,
        };
        if (product.mainImageUrl) pick.imageUrl = product.mainImageUrl;
        return pick;
      }),
    };
  } catch (error) {
    return toActionResult(error);
  }
}
