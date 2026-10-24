/**
 * Product mutations used by the admin editor.
 *
 * Demo mode: validates, computes the saved product locally and resolves after
 * a short delay; nothing is persisted (the shell shows a "Demo" marker). With
 * the API, send `multipart/form-data` (texts, price, category, billz_id,
 * promo, status, image order + new files) to
 * `PUT /api/v1/admin/products/{id}/` or `POST /api/v1/admin/products/` from a
 * Server Action and return the product from the response.
 */
import type { Product } from "@/domain/product";
import { productFormSchema, type ProductFormValues } from "./products.schema";
import { formatNumber } from "@/lib/format";

import { referenceNow } from "./config";
import type { ActionResult } from "./types";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

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
  before: Product | null,
  values: ProductFormValues,
): Promise<ActionResult<Product>> {
  await delay();
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Maydonlarni tekshiring.", fieldErrors };
  }
  const data = parsed.data;
  const billzChanged = !before || before.billzId !== data.billzId;
  return {
    ok: true,
    data: {
      id: before?.id ?? `draft-${data.billzId}`,
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
