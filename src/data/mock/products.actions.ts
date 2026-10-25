import type { Product, ProductImage } from "@/domain/product";
import { formatNumber } from "@/lib/format";

import { referenceNow } from "../config";
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  type ProductFormValues,
} from "../products.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
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
  return {
    ok: true,
    data: {
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
    },
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
    return { ok: false, error: `«${file.name}»: faqat JPG, PNG yoki WebP.` };
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: `«${file.name}» 5 MB dan katta.` };
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
