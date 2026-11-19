import { createFormatter } from "@/lib/format";
import { isFilled, recommendedToAsk } from "@/lib/forms/recommended-rules";
import type { Locale } from "@/lib/i18n/locales";

import { catalogDataCopy } from "./copy/catalog";
import type { SeoStatus, SeoTexts } from "./seo";

/**
 * Products. Stock and the Billz name come from Billz (the store's POS) and are
 * read-only here; texts, images, price, category, promo flag and visibility
 * are managed in the admin panel.
 */

export const CONTENT_LANGUAGES = ["uz", "ru", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const PRODUCT_TEXT_FIELDS = [
  "name",
  "shortDescription",
  "description",
  "ingredients",
  "usage",
] as const;
export type ProductTextField = (typeof PRODUCT_TEXT_FIELDS)[number];
export type ProductTexts = Record<ProductTextField, string>;

/** The fields a language needs to count as filled in (the short description is optional). */
export const REQUIRED_TEXT_FIELDS = ["name", "description", "ingredients", "usage"] as const;

/** `texts.<lang>.<field>` limits of the API (`catalog.services.TEXT_MAX_LENGTHS`). */
export const TEXT_MAX_LENGTH: Record<ProductTextField, number> = {
  name: 120,
  shortDescription: 300,
  description: 2000,
  ingredients: 1000,
  usage: 1000,
};
/** `ProductImage.alt.<lang>` limit (`catalog.services.ALT_MAX_LENGTH`). */
export const ALT_MAX_LENGTH = 160;

export function emptyTexts(): ProductTexts {
  return { name: "", shortDescription: "", description: "", ingredients: "", usage: "" };
}

/** Alt text of a photo per content language; `""` = not written. */
export type ImageAlt = Record<ContentLanguage, string>;

export function emptyAlt(): ImageAlt {
  return { uz: "", ru: "", en: "" };
}

/**
 * Category slug (`^[a-z0-9-]{2,40}$`, contract §2.4). Categories are data
 * (`getCategories()`), so this is a plain string; labels come from the
 * category's `name.uz` (see `@/domain/category`).
 */
export type CategoryId = string;

export type ProductStatus = "active" | "hidden";

/** Illustration used while there are no product photos (see `ProductArt`). */
export interface ProductArtRef {
  kind: "pump" | "jar" | "dropper" | "tube" | "toner";
  tone?: "default" | "night" | "dark-cap";
}

export interface ProductImage {
  id: string;
  label: string;
  /** Illustration placeholder (mock catalog) or an uploaded file (`src`). */
  art?: {
    kind: "dropper" | "box" | "texture" | ProductArtRef["kind"];
    tone?: ProductArtRef["tone"];
  };
  /** Photo URL: the API's media URL, or a local object URL before upload. */
  src?: string;
  /** Alt text per language (absent on a photo picked but not uploaded yet). */
  alt?: ImageAlt;
}

export interface Product {
  id: string;
  billzId: string;
  /** Name as it arrives from Billz (often upper-case shorthand). */
  billzName: string;
  volume: string;
  category: CategoryId | null;
  price: number;
  stock: number;
  promo: boolean;
  status: ProductStatus;
  /** Imported from Billz and not yet filled in by an admin. */
  isNewFromBillz: boolean;
  texts: Record<ContentLanguage, ProductTexts>;
  art: ProductArtRef | null;
  images: ProductImage[];
  /** First photo (`main_image_url`), rendered before `art` in lists and pickers. */
  mainImageUrl?: string;
  /** The latest change of the product (§5.2), rendered in the admin language by `lastChangeText`. */
  lastChange?: ProductLastChange;
  /** The website URL segment (`/mahsulotlar/{slug}`, B-W1): unique, never only digits. */
  slug: string;
  /** Page title / meta description per language; `""` = the website builds one (B-W1). */
  seo: SeoTexts;
  /** The server's «SEO holati» checklist (B-W1). */
  seoStatus: SeoStatus;
}

/** `last_change.kind` (contract §5.2). */
export type ProductChangeKind =
  | "created"
  | "price_changed"
  | "activated"
  | "hidden"
  | "promo_added"
  | "promo_removed"
  | "updated";

export interface ProductLastChange {
  /** The staff member's display name; `null` = the system (e.g. the Billz full sync). */
  by: string | null;
  at: string;
  kind: ProductChangeKind;
  /** `price_changed` only. */
  oldPrice?: number;
  newPrice?: number;
  /**
   * @deprecated The Uzbek text of the change (`lastChangeText(change, "uz")`), kept for older
   * readers; screens render `lastChangeText(change, locale)`.
   */
  note?: string;
}

/** "narx 175 000 → 185 000" · "цена 175 000 → 185 000" · "price 175,000 → 185,000". */
export function lastChangeText(
  change: Pick<ProductLastChange, "kind" | "oldPrice" | "newPrice">,
  locale: Locale = "uz",
): string {
  const t = catalogDataCopy[locale].lastChange;
  switch (change.kind) {
    case "created":
      return t.created;
    case "price_changed": {
      const fmt = createFormatter(locale);
      return t.priceChanged(fmt.number(change.oldPrice ?? 0), fmt.number(change.newPrice ?? 0));
    }
    case "activated":
      return t.activated;
    case "hidden":
      return t.hidden;
    case "promo_added":
      return t.promoAdded;
    case "promo_removed":
      return t.promoRemoved;
    case "updated":
      return t.updated;
  }
}

/** Who made the change, in the admin language (`null` = the system). */
export function lastChangeActor(change: Pick<ProductLastChange, "by">, locale: Locale = "uz") {
  return change.by ?? catalogDataCopy[locale].systemActor;
}

/**
 * The label the API mapper gives an uploaded photo («Rasm 2»: the API stores no name). A data
 * token, not UI text: the editor shows such a photo by its place in the admin language.
 */
export function defaultImageLabel(position: number): string {
  return `Rasm ${position}`;
}

/** Whether `label` is the mapper's token (`defaultImageLabel`), not a name someone gave. */
export function isDefaultImageLabel(label: string): boolean {
  return /^Rasm \d+$/.test(label);
}

export const LOW_STOCK_THRESHOLD = 3;

/**
 * A create, or a change of the Billz ID, reads the product from live Billz
 * (contract §2.3); while Billz is unreachable the API answers 503
 * `provider_unavailable` and writes nothing. The editor keeps every value
 * and shows this on the form.
 */
export const BILLZ_UNAVAILABLE_MESSAGE = catalogDataCopy.uz.billzUnavailable;

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export function isTextComplete(texts: ProductTexts): boolean {
  return REQUIRED_TEXT_FIELDS.every((field) => texts[field].trim().length > 0);
}

export function incompleteLanguages(
  texts: Record<ContentLanguage, ProductTexts>,
): ContentLanguage[] {
  return CONTENT_LANGUAGES.filter((lang) => !isTextComplete(texts[lang]));
}

/** Uzbek name, or the raw Billz name while the product is not filled in yet. */
export function productDisplayName(product: Pick<Product, "texts" | "billzName">): string {
  return product.texts.uz.name || product.billzName;
}

/**
 * Fields the editor recommends but does not require (DESIGN §A "save anyway?"): photos and the
 * Uzbek description. Names are the form paths the editor reveals. The SEO title / description
 * are not asked: the website builds its own when they are empty, and the «SEO holati» checklist
 * already reports them.
 */
export type ProductRecommendedField = "images" | "texts.uz.description";

export function productRecommendedMissing(values: {
  images: ReadonlyArray<unknown>;
  texts: { uz: { description: string } };
}): ProductRecommendedField[] {
  const missing: ProductRecommendedField[] = [];
  if (values.images.length === 0) missing.push("images");
  if (!values.texts.uz.description.trim()) missing.push("texts.uz.description");
  return missing;
}

/**
 * The empty recommended fields worth asking about on this save (`recommendedToAsk`): a hidden
 * product never asks; a new one, or the save that shows it, asks about every empty field; else
 * only about a field the admin just emptied. `saved` is the editor's baseline (`null` = create).
 */
export function productRecommendedToAsk(
  values: {
    images: ReadonlyArray<unknown>;
    texts: { uz: { description: string } };
    status: ProductStatus;
  },
  saved: {
    images: ReadonlyArray<unknown>;
    texts: { uz: { description: string } };
    status: ProductStatus;
  } | null,
): ProductRecommendedField[] {
  return recommendedToAsk(productRecommendedMissing(values), {
    isNew: saved === null,
    active: values.status === "active",
    wasActive: saved ? saved.status === "active" : undefined,
    filledBefore: (field) =>
      field === "images" ? (saved?.images.length ?? 0) > 0 : isFilled(saved?.texts.uz.description),
  });
}
