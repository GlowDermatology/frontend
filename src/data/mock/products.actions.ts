import type { Job } from "@/domain/job";
import { BILLZ_UNAVAILABLE_MESSAGE, type Product, type ProductImage } from "@/domain/product";
import { slugifyName } from "@/domain/seo";
import { formatNumber } from "@/lib/format";

import { referenceNow } from "../config";
import {
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_TYPE_MESSAGE,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  type ProductFormValues,
} from "../products.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { PRODUCTS, withSeoStatus } from "./catalog";
import { MOCK_FAILED_IMPORT_JOB_ID, MOCK_IMPORT_JOB_ID, runningImportJob } from "./jobs.queries";
import { getProduct } from "./products.queries";

/**
 * Mock implementation of `src/data/products.actions.ts`. `saveProduct` looks
 * the product up by id (or creates a draft) and computes the saved record the
 * way the demo always did; the image actions validate their input and return
 * the shapes the editor's orchestration expects. Nothing is persisted.
 */

function changeNote(before: Product | null, values: ProductFormValues): string {
  if (!before) return "mahsulot yaratildi";
  if (before.price !== values.price) {
    return `narx ${formatNumber(before.price)} → ${formatNumber(values.price)}`;
  }
  if (before.status !== values.status) {
    return values.status === "active" ? "faollashtirildi" : "yashirildi";
  }
  if (before.promo !== values.promo)
    return values.promo ? "aksiyaga qo‘shildi" : "aksiyadan olindi";
  return "ma’lumotlar yangilandi";
}

/**
 * The demo's Billz is unreachable for a Billz ID ending in `9999` (like the
 * backend fakes' "transport down" numbers): a create or a Billz ID change to
 * such an id answers the API's 503 `provider_unavailable`, so the editor's
 * message can be seen without a backend.
 */
export const MOCK_BILLZ_DOWN_SUFFIX = "9999";

/** The API's `unique` message for a product slug (contract §2.3). */
export const PRODUCT_SLUG_TAKEN_MESSAGE = "Bu manzil (slug) boshqa mahsulotda bor.";

/** The slug the save keeps: the typed one, else the stored one, else one derived like the server's. */
function savedSlug(before: Product | null, data: ProductFormValues): string {
  if (data.slug) return data.slug;
  if (before?.slug) return before.slug;
  return slugifyName(data.texts.uz.name) || `mahsulot-${data.billzId}`;
}

export async function saveProduct(
  id: string | null,
  data: ProductFormValues,
): Promise<ActionResult<Product>> {
  await delay(600);
  const before = id === null ? null : await getProduct(id);
  if (id !== null && !before && !id.startsWith("draft-")) {
    return { ok: false, error: "Mahsulot topilmadi.", code: "not_found" };
  }
  const billzChanged = !before || before.billzId !== data.billzId;
  if (billzChanged && data.billzId.endsWith(MOCK_BILLZ_DOWN_SUFFIX)) {
    return { ok: false, error: BILLZ_UNAVAILABLE_MESSAGE, code: "provider_unavailable" };
  }
  const slug = savedSlug(before, data);
  if (data.slug && PRODUCTS.some((p) => p.slug === slug && p.id !== before?.id)) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: { slug: PRODUCT_SLUG_TAKEN_MESSAGE },
    };
  }
  return {
    ok: true,
    data: withSeoStatus({
      id: before?.id ?? id ?? `draft-${data.billzId}`,
      billzId: data.billzId,
      billzName: before && !billzChanged ? before.billzName : "",
      volume: before?.volume ?? "",
      category: data.category || null,
      price: data.price,
      // Stock is read from Billz after the link is verified; unknown until then.
      stock: before && !billzChanged ? before.stock : 0,
      promo: data.promo,
      status: data.status,
      isNewFromBillz: false,
      texts: data.texts,
      art: before?.art ?? null,
      images: data.images,
      lastChange: {
        by: "Administrator",
        at: referenceNow().toISOString(),
        note: changeNote(before, data),
      },
      slug,
      seo: data.seo,
    }),
  };
}

/**
 * The upload keeps no bytes: the client keeps its local preview (object URL)
 * and replaces the temporary `upload-…` id with the one returned here.
 */
export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<ActionResult<ProductImage>> {
  await delay(300);
  void productId;
  if (!(IMAGE_TYPES as ReadonlyArray<string>).includes(file.type)) {
    return { ok: false, error: IMAGE_TYPE_MESSAGE, fieldErrors: { file: IMAGE_TYPE_MESSAGE } };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: IMAGE_TOO_LARGE_MESSAGE,
      fieldErrors: { file: IMAGE_TOO_LARGE_MESSAGE },
    };
  }
  return { ok: true, data: { id: `img-${crypto.randomUUID()}`, label: file.name } };
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<ActionResult<{ id: string }>> {
  await delay(150);
  void productId;
  return { ok: true, data: { id: imageId } };
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[],
): Promise<ActionResult<{ imageIds: string[] }>> {
  await delay(150);
  void productId;
  if (imageIds.length > MAX_IMAGES) {
    return { ok: false, error: `Ko‘pi bilan ${MAX_IMAGES} ta rasm qo‘shish mumkin.` };
  }
  return { ok: true, data: { imageIds } };
}

/**
 * The demo import: a job that is `running` now and finished on the first
 * poll. It succeeds (job 1, with the full run's `hidden`) unless the list is
 * searched for a term ending in `9999` (`MOCK_BILLZ_DOWN_SUFFIX`, like the
 * product save's rule): then the demo's Billz listing arrives incomplete
 * (job 2). The outcome follows what the visitor sees, never a shared
 * counter; the fixtures never change.
 */
export async function importFromBillz(search?: string): Promise<ActionResult<Job>> {
  await delay(400);
  const incomplete = search?.trim().endsWith(MOCK_BILLZ_DOWN_SUFFIX) ?? false;
  return {
    ok: true,
    data: runningImportJob(incomplete ? MOCK_FAILED_IMPORT_JOB_ID : MOCK_IMPORT_JOB_ID),
  };
}
