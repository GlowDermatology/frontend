import {
  CONTENT_LANGUAGES,
  PRODUCT_TEXT_FIELDS,
  type ContentLanguage,
  type Product,
  type ProductImage,
  type ProductTexts,
} from "@/domain/product";
import { formatDateTimeShort, formatNumber } from "@/lib/format";

import type { CatalogStats, ProductListQuery } from "../../products";
import type { ProductBaseline, ProductFormValues } from "../../products.schema";
import type { QueryValue } from "../client";
import type {
  ApiLastChange,
  ApiProduct,
  ApiProductImage,
  ApiProductPatch,
  ApiProductStats,
  ApiProductWrite,
} from "../types";
import { idString } from "./common";

/**
 * `Product` and `products/stats/` → the FE domain types (contract §5.2).
 */

const EMPTY_TEXTS: ProductTexts = { name: "", description: "", ingredients: "", usage: "" };

/** `"" means not filled, never null"`; languages or fields the API omits become `""`. */
export function mapProductTexts(texts: ApiProduct["texts"]): Record<ContentLanguage, ProductTexts> {
  const out = {} as Record<ContentLanguage, ProductTexts>;
  for (const language of CONTENT_LANGUAGES) {
    const source = (texts[language] ?? {}) as Partial<ProductTexts>;
    const filled = { ...EMPTY_TEXTS };
    for (const field of PRODUCT_TEXT_FIELDS) filled[field] = source[field] ?? "";
    out[language] = filled;
  }
  return out;
}

/** `{id, url, position}` → `{id, src, label: "Rasm N"}`. */
export function mapProductImage(image: ApiProductImage): ProductImage {
  return { id: idString(image.id), src: image.url, label: `Rasm ${image.position + 1}` };
}

/** The last-change note per §5.2 (`price_changed` → "narx 175 000 → 185 000"). */
export function lastChangeNote(change: ApiLastChange): string {
  switch (change.kind) {
    case "created":
      return "mahsulot yaratildi";
    case "price_changed":
      return `narx ${formatNumber(change.old_price ?? 0)} → ${formatNumber(change.new_price ?? 0)}`;
    case "activated":
      return "faollashtirildi";
    case "hidden":
      return "yashirildi";
    case "promo_added":
      return "aksiyaga qo‘shildi";
    case "promo_removed":
      return "aksiyadan olindi";
    case "updated":
      return "ma’lumotlar yangilandi";
  }
}

export function mapProduct(api: ApiProduct): Product {
  const product: Product = {
    id: idString(api.id),
    billzId: api.billz_id,
    billzName: api.billz_name,
    volume: api.volume,
    category: api.category,
    price: api.price,
    stock: api.stock,
    promo: api.promo,
    status: api.status,
    isNewFromBillz: api.is_new_from_billz,
    texts: mapProductTexts(api.texts),
    art: null,
    images: [...api.images]
      .sort((a, b) => a.position - b.position)
      .map((image) => mapProductImage(image)),
  };
  if (api.main_image_url) product.mainImageUrl = api.main_image_url;
  if (api.last_change) {
    product.lastChange = {
      by: api.last_change.actor?.display_name ?? "Administrator",
      at: api.last_change.at,
      note: lastChangeNote(api.last_change),
    };
  }
  return product;
}

/**
 * "Sinxronlangan: …" label from `billz.last_sync_at` and the server's `now`
 * (§5.2): never → "hali sinxronlanmagan", <60 s → "hozirgina", <60 min →
 * "N daqiqa oldin", <24 h → "N soat oldin", else the short date-time.
 */
export function lastSyncLabel(lastSyncAt: string | null, now: Date): string {
  if (!lastSyncAt) return "hali sinxronlanmagan";
  const elapsed = Math.max(0, now.getTime() - Date.parse(lastSyncAt));
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return "hozirgina";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return formatDateTimeShort(lastSyncAt);
}

export function mapCatalogStats(api: ApiProductStats, now: Date): CatalogStats {
  return {
    total: api.total,
    active: api.active,
    hidden: api.hidden,
    newFromBillz: api.new_from_billz,
    outOfStock: api.out_of_stock,
    billzConnected: api.billz.connected,
    lastSyncAt: api.billz.last_sync_at,
    lastSyncLabel: lastSyncLabel(api.billz.last_sync_at, now),
  };
}

const ORDERING = { default: "default", name_asc: "name", name_desc: "-name" } as const;

/** The list filters of the UI query as `GET products/` parameters (§2.3, §7.15). */
export function productFilterParams(
  query: Omit<ProductListQuery, "page" | "pageSize">,
): Record<string, QueryValue> {
  return {
    search: query.q?.trim() || undefined,
    category: query.category,
    status: query.status,
    promo: query.promo === "yes" ? true : query.promo === "no" ? false : undefined,
    out_of_stock: query.outOfStock ? true : undefined,
    is_new: query.onlyNew ? true : undefined,
    ordering: query.sort === "default" ? undefined : ORDERING[query.sort],
  };
}

/** The full UI query as `GET products/` parameters, page and size included. */
export function productListParams(query: ProductListQuery): Record<string, QueryValue> {
  return {
    ...productFilterParams(query),
    page: query.page > 1 ? query.page : undefined,
    page_size: query.pageSize,
  };
}

/** Per-action field remap of `saveProduct` (contract §7.1). */
export const PRODUCT_FIELD_REMAP = { billz_id: "billzId" } as const;

/** Body of `POST products/`: the FE always creates hidden (the active rule needs images first). */
export function productCreateBody(values: ProductFormValues): ApiProductWrite {
  return {
    billz_id: values.billzId,
    texts: values.texts,
    price: values.price,
    category: values.category || null,
    promo: values.promo,
    status: "hidden",
  };
}

/** Body of `PATCH products/{id}/` (changed fields, `texts` as changed leaves). */
export type ProductPatchBody = ApiProductPatch;

/**
 * The scalar fields a PATCH is diffed against: what the editor loaded (or
 * what the server holds after a partially failed save), never a fresh read,
 * so another admin's concurrent change to a field this admin did not touch is
 * not written back.
 */
export type ProductPatchBaseline = ProductBaseline;

/** The changed text leaves only (`{ru: {name: "…"}}`); `undefined` when none changed. */
export function textsPatch(
  baseline: Record<ContentLanguage, ProductTexts>,
  values: Record<ContentLanguage, ProductTexts>,
): ProductPatchBody["texts"] {
  const out: NonNullable<ProductPatchBody["texts"]> = {};
  for (const language of CONTENT_LANGUAGES) {
    for (const field of PRODUCT_TEXT_FIELDS) {
      const value = values[language][field];
      if (value === baseline[language][field]) continue;
      (out[language] ??= {})[field] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Body of `PATCH products/{id}/`: only the fields that differ from the
 * editor's baseline, `texts` as changed leaves (the server merges them, §2.3).
 * An unchanged `billz_id` never triggers a Billz lookup, the server's
 * `last_change.kind` reflects the real edit, and a field another admin
 * changed meanwhile is left alone unless this admin edited it too.
 */
export function productPatchBody(
  baseline: ProductPatchBaseline,
  values: ProductFormValues,
): ProductPatchBody {
  const body: ProductPatchBody = {};
  if (values.billzId !== baseline.billzId) body.billz_id = values.billzId;
  const texts = textsPatch(baseline.texts, values.texts);
  if (texts) body.texts = texts;
  if (values.price !== baseline.price) body.price = values.price;
  if ((values.category || null) !== (baseline.category || null)) {
    body.category = values.category || null;
  }
  if (values.promo !== baseline.promo) body.promo = values.promo;
  if (values.status !== baseline.status) body.status = values.status;
  return body;
}

/** Every editable field, for a PATCH without a baseline. */
export function productFullPatchBody(values: ProductFormValues): ProductPatchBody {
  return { ...productCreateBody(values), status: values.status };
}
