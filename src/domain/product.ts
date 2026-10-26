/**
 * Products. Stock and the Billz name come from Billz (the store's POS) and are
 * read-only here; texts, images, price, category, promo flag and visibility
 * are managed in the admin panel.
 */

export const CONTENT_LANGUAGES = ["uz", "ru", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const PRODUCT_TEXT_FIELDS = ["name", "description", "ingredients", "usage"] as const;
export type ProductTextField = (typeof PRODUCT_TEXT_FIELDS)[number];
export type ProductTexts = Record<ProductTextField, string>;

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
  lastChange?: { by: string; at: string; note: string };
}

export const LOW_STOCK_THRESHOLD = 3;

/**
 * A create, or a change of the Billz ID, reads the product from live Billz
 * (contract §2.3); while Billz is unreachable the API answers 503
 * `provider_unavailable` and writes nothing. The editor keeps every value
 * and shows this on the form.
 */
export const BILLZ_UNAVAILABLE_MESSAGE =
  "Billz javob bermadi: mahsulot saqlanmadi. Kiritilgan ma’lumotlar joyida — birozdan so‘ng «Saqlash»ni qayta bosing.";

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export function isTextComplete(texts: ProductTexts): boolean {
  return PRODUCT_TEXT_FIELDS.every((field) => texts[field].trim().length > 0);
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
