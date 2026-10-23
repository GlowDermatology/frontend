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

export const CATEGORY_IDS = ["serums", "cleansing", "moisturizing", "sun", "toners"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type ProductStatus = "active" | "hidden";

/** Illustration used while there are no product photos (see `ProductArt`). */
export interface ProductArtRef {
  kind: "pump" | "jar" | "dropper" | "tube" | "toner";
  tone?: "default" | "night" | "dark-cap";
}

export interface ProductImage {
  id: string;
  label: string;
  /** Illustration placeholder or an uploaded file (object URL in this phase). */
  art?: {
    kind: "dropper" | "box" | "texture" | ProductArtRef["kind"];
    tone?: ProductArtRef["tone"];
  };
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
  lastChange?: { by: string; at: string; note: string };
}

export const LOW_STOCK_THRESHOLD = 3;

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
