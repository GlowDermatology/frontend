import type { components } from "../schema";

/**
 * Named aliases over the generated customer-audience types (`npm run
 * gen:api`), plus the SEO fields backend B-W1 is adding in parallel
 * (`slug` on products and specialists, `updated_at` for sitemaps, optional
 * per-language `seo_title` / `seo_description` on products and categories).
 * The regenerated schema (B-W1 merged) makes them required; they are kept
 * optional here, and every reader treats them as possibly absent, so the
 * storefront works against the API before and after B-W1.
 */
type Schemas = components["schemas"];

interface PlannedSeoFields {
  /** B-W1: unique, auto from the uz name, editable in the admin. */
  slug?: string | null;
  /** B-W1: ISO 8601, for sitemap `lastmod`. */
  updated_at?: string | null;
  /** B-W1: resolved language, `""`/`null` when staff left it empty. */
  seo_title?: string | null;
  seo_description?: string | null;
}

/**
 * Optional on any API version: a product's brand and pre-promotion price
 * (no real source in the API yet; `sku` is in the contract since
 * feat/customer-web, the Billz article code).
 */
interface PlannedBrand {
  brand?: string | null;
  /** The price before the promotion, for a struck-through «AKSIYA» price. */
  old_price?: number | null;
}

/** The B-W1 keys, kept optional so an older API (or a recorded fixture) still type-checks. */
type SeoKeys = keyof PlannedSeoFields;

export type ApiCustomerProductCard = Omit<Schemas["ProductCard"], SeoKeys> &
  PlannedSeoFields &
  PlannedBrand;
export type ApiCustomerProductDetail = Omit<Schemas["ProductDetail"], SeoKeys> &
  PlannedSeoFields &
  PlannedBrand;
export type ApiCustomerProductPage = Omit<Schemas["PaginatedProductCardList"], "results"> & {
  results: ApiCustomerProductCard[];
};
export type ApiCustomerCategory = Omit<Schemas["CustomerCategory"], Exclude<SeoKeys, "slug">> &
  Omit<PlannedSeoFields, "slug"> & {
    /** Optional on any API version: a short category description. */
    description?: string | null;
  };
export type ApiCustomerCategoryList = { results: ApiCustomerCategory[] };
export type ApiCustomerBanner = Schemas["CustomerBanner"];
export type ApiCustomerBannerList = Schemas["CustomerBannerList"];
export type ApiSpecialist = Omit<Schemas["Specialist"], "slug" | "updated_at"> &
  Omit<PlannedSeoFields, "seo_title" | "seo_description">;
export type ApiSpecialistList = { results: ApiSpecialist[] };
export type ApiServiceOffer = Schemas["ServiceOffer"];
export type ApiServiceList = Schemas["ServiceList"];
export type ApiPublicSettings = Schemas["PublicSettings"];
export type ApiStockStatus = Schemas["StockStatusEnum"];
export type ApiSpecialistRole = Schemas["SpecialistRoleEnum"];
export type ApiServiceCategory = Schemas["ServiceCategoryEnum"];
export type ApiCustomerErrorEnvelope = Schemas["CustomerErrorEnvelope"];
