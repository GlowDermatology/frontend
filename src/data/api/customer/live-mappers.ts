import type { ShopProductCard } from "@/domain/shop";
import type {
  RailKey,
  ShopAvailability,
  ShopCashbackPolicy,
  ShopClinic,
  ShopFeedPage,
  ShopHome,
  ShopSpecialistAvailability,
  SpotlightReason,
} from "@/domain/shop-live";

import type {
  ApiCatalogFeed,
  ApiClinicList,
  ApiHome,
  ApiSpecialistAvailability,
} from "./live-types";
import { contentLanguageOf, mapProductCard } from "./mappers";

/**
 * Live landing endpoints → view models (pure; unit-tested). Every reader is
 * defensive: the endpoints are new and typed by hand (`./live-types.ts`), so
 * an unknown reason or rail key is dropped, a malformed percent or count
 * becomes "not provided" instead of a made-up number, and a product card
 * that fails to map is skipped rather than failing the whole page.
 */

const REASONS: ReadonlySet<string> = new Set<SpotlightReason>([
  "promo",
  "new",
  "bestseller",
  "low_stock",
]);
const RAILS: ReadonlySet<string> = new Set<RailKey>(["new", "promo", "bestsellers"]);
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** A decimal percent string ("1.00", "2.5") or number → number in [0, 100], else `null`. */
export function percentOf(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{1,3}(\.\d{1,4})?$/.test(value.trim())
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function cards(items: unknown, mediaHosts: ReadonlyArray<string>): ShopProductCard[] {
  if (!Array.isArray(items)) return [];
  const out: ShopProductCard[] = [];
  const seen = new Set<number>();
  for (const item of items) {
    if (typeof item !== "object" || item === null || typeof item.id !== "number") continue;
    if (seen.has(item.id)) continue;
    try {
      out.push(mapProductCard(item, mediaHosts));
      seen.add(item.id);
    } catch {
      // A malformed card is skipped; the rest of the list still renders.
    }
  }
  return out;
}

export function mapCashbackPolicy(api: ApiHome["cashback"]): ShopCashbackPolicy | null {
  if (!api) return null;
  const tiers = (Array.isArray(api.tiers) ? api.tiers : [])
    .flatMap((tier) => {
      const percent = percentOf(tier.percent);
      const from = typeof tier.from_amount === "number" ? Math.max(0, tier.from_amount) : null;
      if (percent === null || from === null) return [];
      const to =
        typeof tier.to_amount === "number" && tier.to_amount > from ? tier.to_amount : null;
      return [{ from, to, percent }];
    })
    .sort((a, b) => a.from - b.from);
  const tierPercents = tiers.map((tier) => tier.percent);
  const minPercent =
    percentOf(api.min_percent) ?? (tiers.length ? Math.min(...tierPercents) : null);
  const maxPercent =
    percentOf(api.max_percent) ?? (tiers.length ? Math.max(...tierPercents) : null);
  if (minPercent === null || maxPercent === null || maxPercent <= 0) return null;
  return {
    minPercent: Math.min(minPercent, maxPercent),
    maxPercent: Math.max(minPercent, maxPercent),
    tiers,
  };
}

export function mapHome(api: ApiHome, mediaHosts: ReadonlyArray<string>): ShopHome {
  const stats = api.stats ?? ({} as Partial<ApiHome["stats"]>);
  const spotlight: Array<ShopHome["spotlight"][number]> = [];
  const seen = new Set<number>();
  for (const entry of Array.isArray(api.spotlight) ? api.spotlight : []) {
    if (!entry || !REASONS.has(entry.reason)) continue;
    const [product] = cards([entry.product], mediaHosts);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    spotlight.push({ reason: entry.reason, product });
  }
  const railKeys = new Set<string>();
  const rails = (Array.isArray(api.rails) ? api.rails : []).flatMap((rail) => {
    if (!rail || !RAILS.has(rail.key) || railKeys.has(rail.key)) return [];
    const items = cards(rail.items, mediaHosts);
    if (items.length === 0) return [];
    railKeys.add(rail.key);
    return [{ key: rail.key, items }];
  });
  return {
    contentLanguage: contentLanguageOf(api.content_language),
    onlineSalesEnabled: Boolean(api.online_sales_enabled),
    stats: {
      products: count(stats.products),
      productsInStock:
        typeof stats.products_in_stock === "number" && stats.products_in_stock >= 0
          ? Math.trunc(stats.products_in_stock)
          : null,
      categories: count(stats.categories),
      specialists: count(stats.specialists),
      clinics: count(stats.clinics),
    },
    spotlight,
    rails,
    cashback: mapCashbackPolicy(api.cashback),
    feedCursor: feedCursorOf(api.feed_cursor),
  };
}

/** A cursor is passed back to the API as it came; anything odd ends the feed. */
export function feedCursorOf(value: unknown): string | null {
  return typeof value === "string" && /^[\w=\-.:~]{1,256}$/.test(value) ? value : null;
}

export function mapFeedPage(api: ApiCatalogFeed, mediaHosts: ReadonlyArray<string>): ShopFeedPage {
  return { items: cards(api.results, mediaHosts), nextCursor: feedCursorOf(api.next_cursor) };
}

export function mapAvailability(api: ApiSpecialistAvailability): ShopAvailability {
  const bySpecialist: Record<number, ShopSpecialistAvailability> = {};
  for (const row of Array.isArray(api.results) ? api.results : []) {
    if (!row || typeof row.specialist_id !== "number") continue;
    const slot = row.next_slot;
    const nextSlot =
      slot &&
      typeof slot.start === "string" &&
      !Number.isNaN(Date.parse(slot.start)) &&
      typeof slot.location_id === "number" &&
      typeof slot.service_id === "number"
        ? { start: slot.start, locationId: slot.location_id, serviceId: slot.service_id }
        : null;
    bySpecialist[row.specialist_id] = { nextSlot, slotsToday: count(row.slots_today) };
  }
  return {
    generatedAt:
      typeof api.generated_at === "string" && !Number.isNaN(Date.parse(api.generated_at))
        ? api.generated_at
        : null,
    bySpecialist,
  };
}

function clock(value: unknown): string | null {
  return typeof value === "string" && CLOCK.test(value.slice(0, 5)) ? value.slice(0, 5) : null;
}

export function mapClinics(api: ApiClinicList): ShopClinic[] {
  return (Array.isArray(api.results) ? api.results : []).flatMap((row) => {
    if (!row || typeof row.id !== "number" || !text(row.name)) return [];
    const start = clock(row.today_hours?.start);
    const end = clock(row.today_hours?.end);
    return [
      {
        id: row.id,
        name: text(row.name),
        address: text(row.address),
        directions: text(row.directions),
        phone: text(row.phone) || null,
        latitude: typeof row.latitude === "number" ? row.latitude : null,
        longitude: typeof row.longitude === "number" ? row.longitude : null,
        specialistCount: count(row.specialist_count),
        todayHours: start && end ? { start, end } : null,
        openNow: row.open_now === true,
      },
    ];
  });
}
