import type { ApiCustomerProductCard } from "./types";

/**
 * HAND-WRITTEN — the live landing endpoints (`home/`, `catalog/feed/`,
 * `specialists/availability/`, `clinics/`), typed from the agreed contract
 * because the backend's OpenAPI schema did not list them yet when this was
 * written. Once `npm run gen:api` picks them up, replace these interfaces
 * with aliases over `components["schemas"]` (as `./types.ts` does) and
 * delete this note. The mappers (`./live-mappers.ts`) read every field
 * defensively, so a small drift (an extra field, a missing optional one)
 * does not break the page.
 */

export type ApiSpotlightReason = "promo" | "new" | "bestseller" | "low_stock";
export type ApiRailKey = "new" | "promo" | "bestsellers";

/** `GET home/` (cached 60 s by the API). */
export interface ApiHome {
  content_language: string;
  online_sales_enabled: boolean;
  stats: {
    products: number;
    /** `null` while online sales are off (no stock is published). */
    products_in_stock: number | null;
    categories: number;
    specialists: number;
    clinics: number;
  };
  spotlight: Array<{ reason: ApiSpotlightReason; product: ApiCustomerProductCard }>;
  /** In display order; a rail with no items is left out. */
  rails: Array<{ key: ApiRailKey; items: ApiCustomerProductCard[] }>;
  /** `null` when no cashback policy is active. Percentages are decimal strings ("1.00"). */
  cashback: {
    min_percent: string;
    max_percent: string;
    tiers: Array<{ from_amount: number; to_amount: number | null; percent: string }>;
  } | null;
}

/** `GET catalog/feed/?cursor=&category=` (cached 30 s): 24 cards per page. */
export interface ApiCatalogFeed {
  results: ApiCustomerProductCard[];
  next_cursor: string | null;
}

/** `GET specialists/availability/?days=7` (cached 60 s). */
export interface ApiSpecialistAvailability {
  generated_at: string;
  results: Array<{
    specialist_id: number;
    next_slot: { start: string; location_id: number; service_id: number } | null;
    slots_today: number;
  }>;
}

/** `GET clinics/` (cached 60 s). */
export interface ApiClinicList {
  results: Array<{
    id: number;
    name: string;
    address: string;
    directions: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
    specialist_count: number;
    /** Today's opening hours in Tashkent time, `null` when closed today. */
    today_hours: { start: string; end: string } | null;
    open_now: boolean;
  }>;
}
