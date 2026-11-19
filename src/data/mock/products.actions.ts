import { catalogDataCopy } from "@/domain/copy/catalog";
import type { Job } from "@/domain/job";
import {
  emptyAlt,
  lastChangeText,
  type ImageAlt,
  type Product,
  type ProductImage,
  type ProductLastChange,
} from "@/domain/product";
import { slugifyName } from "@/domain/seo";
import { copyFor, getAdminLocale } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import { imageFileProblem, MAX_IMAGES, type ProductFormValues } from "../products.schema";
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

/** The `last_change` the server would record for this save (contract §5.2). */
export function changeOf(
  before: Product | null,
  values: ProductFormValues,
): Pick<ProductLastChange, "kind" | "oldPrice" | "newPrice"> {
  if (!before) return { kind: "created" };
  if (before.price !== values.price) {
    return { kind: "price_changed", oldPrice: before.price, newPrice: values.price };
  }
  if (before.status !== values.status) {
    return { kind: values.status === "active" ? "activated" : "hidden" };
  }
  if (before.promo !== values.promo)
    return { kind: values.promo ? "promo_added" : "promo_removed" };
  return { kind: "updated" };
}

/**
 * The demo's Billz is unreachable for a Billz ID ending in `9999` (like the
 * backend fakes' "transport down" numbers): a create or a Billz ID change to
 * such an id answers the API's 503 `provider_unavailable`, so the editor's
 * message can be seen without a backend.
 */
export const MOCK_BILLZ_DOWN_SUFFIX = "9999";

/** The API's `unique` message for a product slug (contract §2.3), in Uzbek. */
export const PRODUCT_SLUG_TAKEN_MESSAGE = catalogDataCopy.uz.productSlugTaken;

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
  const m = await copyFor(catalogDataCopy);
  const before = id === null ? null : await getProduct(id);
  if (id !== null && !before && !id.startsWith("draft-")) {
    return { ok: false, error: m.productNotFound, code: "not_found" };
  }
  const billzChanged = !before || before.billzId !== data.billzId;
  if (billzChanged && data.billzId.endsWith(MOCK_BILLZ_DOWN_SUFFIX)) {
    return { ok: false, error: m.billzUnavailable, code: "provider_unavailable" };
  }
  const slug = savedSlug(before, data);
  if (data.slug && PRODUCTS.some((p) => p.slug === slug && p.id !== before?.id)) {
    return { ok: false, error: m.checkFields, fieldErrors: { slug: m.productSlugTaken } };
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
        ...changeOf(before, data),
        note: lastChangeText(changeOf(before, data), "uz"),
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
  const problem = imageFileProblem(file, await getAdminLocale());
  if (problem) return { ok: false, error: problem, fieldErrors: { file: problem } };
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

/** The demo keeps nothing: the photo comes back with the merged alt texts. */
export async function updateProductImageAlt(
  imageId: string,
  alt: Partial<ImageAlt>,
): Promise<ActionResult<ProductImage>> {
  await delay(150);
  return { ok: true, data: { id: imageId, label: "", alt: { ...emptyAlt(), ...alt } } };
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[],
): Promise<ActionResult<{ imageIds: string[] }>> {
  await delay(150);
  void productId;
  if (imageIds.length > MAX_IMAGES) {
    return { ok: false, error: (await copyFor(catalogDataCopy)).tooManyImages(MAX_IMAGES) };
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
