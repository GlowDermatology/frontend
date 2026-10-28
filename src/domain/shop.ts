/**
 * Storefront view models: what the public pages render, mapped from the
 * customer API in `src/data/api/customer/mappers.ts`. Strings are already in
 * the page's language (the API resolves i18n fields, contract §1.4); money is
 * integer so‘m; datetimes are ISO strings.
 */

export interface ShopCategoryRef {
  slug: string;
  name: string;
}

export interface ShopProductCard {
  id: number;
  /** URL segment: the slug when the API sends one, else the id (pre-B-W1 APIs). */
  segment: string;
  /** Whether `segment` is a real slug (an id URL is canonical only until slugs exist). */
  hasSlug: boolean;
  name: string;
  volume: string;
  price: number;
  promo: boolean;
  category: ShopCategoryRef | null;
  /** Main image `next/image` may optimise (allowed media host), else `null`. */
  image: string | null;
  /** Main image as the API sent it (absolute http(s)), for Open Graph / JSON-LD. */
  imageUrl: string | null;
  available: number;
  inStock: boolean;
  brand: string | null;
  /** The store's stock-keeping code, when the API sends one. */
  sku: string | null;
  /** Language the texts are in (`uz` when a ru/en page fell back); `null` from an older API. */
  contentLanguage: ContentLanguage | null;
  /** The price before a promotion (always above `price`), when the API sends one. */
  oldPrice: number | null;
  updatedAt: string | null;
}

export interface ShopProduct extends ShopProductCard {
  description: string;
  ingredients: string;
  usage: string;
  /** Gallery in position order: optimisable URL (or `null`) and the raw URL. */
  images: ReadonlyArray<{ id: number; image: string | null; url: string }>;
  /** `min(available, per-line cap)`; 0 = cannot be added (§2.3). */
  maxQuantity: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** The language an entity's texts came in (customer API `content_language`). */
export type ContentLanguage = "uz" | "ru" | "en";

export interface ShopCategory {
  slug: string;
  name: string;
  image: string | null;
  imageUrl: string | null;
  productCount: number;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Language of the name and texts (`uz` when a ru/en page fell back); `null` from an older API. */
  contentLanguage: ContentLanguage | null;
  updatedAt: string | null;
}

export type ShopBannerLink =
  | { kind: "product"; productId: number }
  | { kind: "category"; slug: string }
  | { kind: "url"; url: string }
  | { kind: "none" };

export interface ShopBanner {
  id: number;
  title: string;
  image: string | null;
  width: number;
  height: number;
  link: ShopBannerLink;
}

export interface ShopSpecialistService {
  id: number;
  name: string;
  shortName: string;
  durationMin: number;
  price: number;
}

export interface ShopLocation {
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type ShopSpecialistRole = "dermatologist" | "cosmetologist";

export interface ShopSpecialist {
  id: number;
  segment: string;
  hasSlug: boolean;
  name: string;
  role: ShopSpecialistRole;
  roleLabel: string;
  photo: string | null;
  photoUrl: string | null;
  bio: string;
  qualifications: string;
  experienceYears: number | null;
  location: ShopLocation;
  services: ReadonlyArray<ShopSpecialistService>;
  /** Language of `bio`/`qualifications` (`uz` on a fallback); `null` from an older API. */
  contentLanguage: ContentLanguage | null;
  updatedAt: string | null;
}

export interface ShopService {
  id: number;
  name: string;
  shortName: string;
  description: string;
  category: "dermatology" | "cosmetology";
  categoryLabel: string;
  durationMin: number;
  priceFrom: number;
  priceTo: number;
  specialistIds: ReadonlyArray<number>;
}

export interface ShopSettings {
  supportPhone: string | null;
  storePhone: string | null;
  cosmetologistPhone: string | null;
  telegramUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  pickupAddress: string;
  terms: string;
  privacyPolicy: string;
  bookingPolicy: string;
  termsVersion: string | null;
  termsUpdatedAt: string | null;
  onlineSalesEnabled: boolean;
  fulfilmentMethods: ReadonlyArray<"delivery" | "pickup">;
  paymentProviders: ReadonlyArray<"click" | "payme">;
  storeUrls: { ios: string | null; android: string | null };
}

export interface ShopPage<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

/** Low-stock threshold for the "only N left" note (presentation only). */
export const LOW_STOCK_THRESHOLD = 5;

export type StockState = "in_stock" | "low" | "out_of_stock";

export function stockState(available: number, inStock: boolean): StockState {
  if (!inStock || available <= 0) return "out_of_stock";
  return available <= LOW_STOCK_THRESHOLD ? "low" : "in_stock";
}
