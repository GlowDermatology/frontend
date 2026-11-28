import type { Banner } from "@/domain/banner";
import { catalogDataCopy, type CatalogDataCopy } from "@/domain/copy/catalog";
import { copyFor } from "@/lib/i18n/admin-locale";

import type { BannerFormValues } from "../banners.schema";
import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { BANNERS } from "./banners";
import { PRODUCTS } from "./catalog";
import { CATEGORIES } from "./categories";
import { consumeBannerImage } from "./banner-images";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/banners.actions.ts` (contract §2.5). The
 * upload keeps no bytes: a created banner answers with an empty `imageUrl`
 * and the client keeps its local preview, as the product editor does.
 */

const byId = (id: string) => BANNERS.find((b) => b.id === id) ?? null;

function linkErrors(values: BannerFormValues, m: CatalogDataCopy): Record<string, string> | null {
  if (values.link.kind === "product") {
    const product = PRODUCTS.find((p) => p.id === values.link.productId);
    if (!product || product.status !== "active") return { "link.productId": m.notFoundShort };
  }
  if (values.link.kind === "category") {
    if (!CATEGORIES.some((c) => c.slug === values.link.category)) {
      return { "link.category": m.notFoundShort };
    }
  }
  return null;
}

function linkChanged(
  before: Pick<BannerFormValues, "link"> | Pick<Banner, "link"> | null,
  values: BannerFormValues,
): boolean {
  if (!before) return true;
  const target = (link: BannerFormValues["link"]) =>
    link.kind === "product"
      ? link.productId
      : link.kind === "category"
        ? link.category
        : link.kind === "url"
          ? link.url
          : null;
  return before.link.kind !== values.link.kind || target(before.link) !== target(values.link);
}

function apply(
  before: Banner | null,
  values: BannerFormValues,
  image: File | null,
  imageUrl?: string,
): Banner {
  const now = referenceNow().toISOString();
  return {
    id: before?.id ?? `draft-${crypto.randomUUID()}`,
    title: values.title,
    imageUrl: imageUrl ?? (image ? "" : (before?.imageUrl ?? "")),
    link: {
      kind: values.link.kind,
      productId: values.link.kind === "product" ? values.link.productId : null,
      category: values.link.kind === "category" ? values.link.category : null,
      url: values.link.kind === "url" ? values.link.url : null,
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
  const m = await copyFor(catalogDataCopy);
  const fieldErrors = linkErrors(values, m);
  if (fieldErrors) return { ok: false, error: m.checkFields, fieldErrors };
  return { ok: true, data: apply(null, values, image) };
}

export async function updateBanner(
  id: string,
  values: BannerFormValues,
  image: File | null,
  baseline: BannerFormValues | null = null,
): Promise<ActionResult<Banner>> {
  await delay(400);
  const m = await copyFor(catalogDataCopy);
  const before = byId(id);
  if (!before && !id.startsWith("draft-")) {
    return { ok: false, error: m.bannerNotFound, code: "not_found" };
  }
  // Like the API: the link targets are checked only when the link is sent,
  // i.e. when it changed against the loaded banner.
  const fieldErrors = linkChanged(baseline ?? before, values) ? linkErrors(values, m) : null;
  if (fieldErrors) return { ok: false, error: m.checkFields, fieldErrors };
  return { ok: true, data: apply(before ?? { ...apply(null, values, null), id }, values, image) };
}

/** A banner saved with a finished demo banner image (`saveBanner`'s `imageJobId`). */
export async function saveBannerWithImageJob(
  id: string | null,
  jobId: string,
  values: BannerFormValues,
  baseline: BannerFormValues | null,
): Promise<ActionResult<Banner>> {
  await delay(400);
  const m = await copyFor(catalogDataCopy);
  const before = id ? byId(id) : null;
  if (id && !before && !id.startsWith("draft-")) {
    return { ok: false, error: m.bannerNotFound, code: "not_found" };
  }
  const fieldErrors = !id || linkChanged(baseline ?? before, values) ? linkErrors(values, m) : null;
  if (fieldErrors) return { ok: false, error: m.checkFields, fieldErrors };
  const used = await consumeBannerImage(jobId);
  if (!used.ok) return used;
  const base = before ?? (id ? { ...apply(null, values, null), id } : null);
  return { ok: true, data: apply(base, values, null, used.data.url) };
}

export async function deleteBanner(id: string): Promise<ActionResult<{ id: string }>> {
  await delay(300);
  if (!byId(id) && !id.startsWith("draft-")) {
    return { ok: false, error: (await copyFor(catalogDataCopy)).bannerNotFound, code: "not_found" };
  }
  return { ok: true, data: { id } };
}

/** `ids` must be exactly the current set (contract `mismatch`); returns the reordered list. */
export async function reorderBanners(ids: string[]): Promise<ActionResult<Banner[]>> {
  await delay(200);
  const current = new Set(BANNERS.map((b) => b.id));
  const same = ids.length === current.size && ids.every((id) => current.has(id));
  if (!same) {
    return { ok: false, error: (await copyFor(catalogDataCopy)).listMismatch, code: "mismatch" };
  }
  return { ok: true, data: ids.map((id, position) => ({ ...byId(id)!, position })) };
}
