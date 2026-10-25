import type { Banner } from "@/domain/banner";

import type { BannerFormValues } from "../banners.schema";
import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { BANNERS } from "./banners";
import { PRODUCTS } from "./catalog";
import { CATEGORIES } from "./categories";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/banners.actions.ts` (contract §2.5). The
 * upload keeps no bytes: a created banner answers with an empty `imageUrl`
 * and the client keeps its local preview, as the product editor does.
 */

const byId = (id: string) => BANNERS.find((b) => b.id === id) ?? null;

function linkErrors(values: BannerFormValues): Record<string, string> | null {
  if (values.link.kind === "product") {
    const product = PRODUCTS.find((p) => p.id === values.link.productId);
    if (!product || product.status !== "active") return { "link.productId": "Topilmadi." };
  }
  if (values.link.kind === "category") {
    if (!CATEGORIES.some((c) => c.slug === values.link.category)) {
      return { "link.category": "Topilmadi." };
    }
  }
  return null;
}

function apply(before: Banner | null, values: BannerFormValues, image: File | null): Banner {
  const now = referenceNow().toISOString();
  return {
    id: before?.id ?? `draft-${crypto.randomUUID()}`,
    title: values.title,
    imageUrl: image ? "" : (before?.imageUrl ?? ""),
    link: {
      kind: values.link.kind,
      productId: values.link.kind === "product" ? values.link.productId : null,
      category: values.link.kind === "category" ? values.link.category : null,
    },
    isActive: values.isActive,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    position: before?.position ?? BANNERS.length,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function createBanner(
  values: BannerFormValues,
  image: File,
): Promise<ActionResult<Banner>> {
  await delay(500);
  const fieldErrors = linkErrors(values);
  if (fieldErrors) return { ok: false, error: "Maydonlarni tekshiring.", fieldErrors };
  return { ok: true, data: apply(null, values, image) };
}

export async function updateBanner(
  id: string,
  values: BannerFormValues,
  image: File | null,
): Promise<ActionResult<Banner>> {
  await delay(400);
  const before = byId(id);
  if (!before && !id.startsWith("draft-")) {
    return { ok: false, error: "Banner topilmadi.", code: "not_found" };
  }
  const fieldErrors = linkErrors(values);
  if (fieldErrors) return { ok: false, error: "Maydonlarni tekshiring.", fieldErrors };
  return { ok: true, data: apply(before ?? { ...apply(null, values, null), id }, values, image) };
}

export async function deleteBanner(id: string): Promise<ActionResult<{ id: string }>> {
  await delay(300);
  if (!byId(id) && !id.startsWith("draft-")) {
    return { ok: false, error: "Banner topilmadi.", code: "not_found" };
  }
  return { ok: true, data: { id } };
}

/** `ids` must be exactly the current set (contract `mismatch`); returns the reordered list. */
export async function reorderBanners(ids: string[]): Promise<ActionResult<Banner[]>> {
  await delay(200);
  const current = new Set(BANNERS.map((b) => b.id));
  const same = ids.length === current.size && ids.every((id) => current.has(id));
  if (!same) return { ok: false, error: "Ro‘yxat joriy elementlarga mos emas.", code: "mismatch" };
  return { ok: true, data: ids.map((id, position) => ({ ...byId(id)!, position })) };
}
