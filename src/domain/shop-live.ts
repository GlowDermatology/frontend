/**
 * View models of the live storefront home (`home/`, `catalog/feed/`,
 * `specialists/availability/`, `clinics/`), mapped in
 * `src/data/api/customer/live-mappers.ts`, plus the small pure rules the
 * page applies to them (cashback estimate, opening hours). Money is integer
 * so‘m; percentages are numbers (1.5 = 1.5 %); datetimes are ISO strings.
 */

import type { ContentLanguage, ShopProductCard } from "./shop";

export type SpotlightReason = "promo" | "new" | "bestseller" | "low_stock";
export type RailKey = "new" | "promo" | "bestsellers";

export interface ShopHomeStats {
  products: number;
  /** `null` while online sales are off. */
  productsInStock: number | null;
  categories: number;
  specialists: number;
  clinics: number;
}

export interface ShopCashbackTier {
  from: number;
  /** `null` = no upper bound (the top tier). */
  to: number | null;
  percent: number;
}

export interface ShopCashbackPolicy {
  minPercent: number;
  maxPercent: number;
  tiers: ReadonlyArray<ShopCashbackTier>;
}

export interface ShopHome {
  contentLanguage: ContentLanguage | null;
  onlineSalesEnabled: boolean;
  stats: ShopHomeStats;
  spotlight: ReadonlyArray<{ reason: SpotlightReason; product: ShopProductCard }>;
  rails: ReadonlyArray<{ key: RailKey; items: ReadonlyArray<ShopProductCard> }>;
  cashback: ShopCashbackPolicy | null;
}

export interface ShopFeedPage {
  items: ShopProductCard[];
  nextCursor: string | null;
}

export interface ShopNextSlot {
  start: string;
  locationId: number;
  serviceId: number;
}

export interface ShopSpecialistAvailability {
  nextSlot: ShopNextSlot | null;
  slotsToday: number;
}

export interface ShopAvailability {
  generatedAt: string | null;
  /** Keyed by specialist id (a plain object: it crosses the `"use cache"` boundary). */
  bySpecialist: Readonly<Record<number, ShopSpecialistAvailability>>;
}

export interface ShopClinic {
  id: number;
  name: string;
  address: string;
  directions: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  specialistCount: number;
  /** "09:00" / "18:00" in Tashkent time; `null` when closed today. */
  todayHours: { start: string; end: string } | null;
  openNow: boolean;
}

/** Most spotlight frames the hero rotates through (the CSS has keyframes for 2–8). */
export const SPOTLIGHT_MAX = 8;

/**
 * The cashback a purchase at `price` earns under `policy`, as a range from
 * the lowest to the highest tier percent (so‘m, rounded down). Promotional
 * products earn nothing (cashback rule), so they have no estimate.
 */
export function cashbackEstimate(
  price: number,
  policy: Pick<ShopCashbackPolicy, "minPercent" | "maxPercent"> | null,
  promo: boolean,
): { min: number; max: number } | null {
  if (!policy || promo || price <= 0 || policy.maxPercent <= 0) return null;
  const min = Math.floor((price * policy.minPercent) / 100);
  const max = Math.floor((price * policy.maxPercent) / 100);
  if (max <= 0) return null;
  return { min, max };
}

/** The earliest of the given next slots (by instant), or `null` when there is none. */
export function earliestSlot(
  slots: ReadonlyArray<{ specialistId: number; slot: ShopNextSlot }>,
): { specialistId: number; slot: ShopNextSlot } | null {
  let best: { specialistId: number; slot: ShopNextSlot } | null = null;
  for (const entry of slots) {
    if (!best || Date.parse(entry.slot.start) < Date.parse(best.slot.start)) best = entry;
  }
  return best;
}
