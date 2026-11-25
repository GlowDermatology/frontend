import { describe, expect, it } from "vitest";

import { cashbackEstimate, earliestSlot } from "@/domain/shop-live";

import {
  feedCursorOf,
  mapAvailability,
  mapCashbackPolicy,
  mapClinics,
  mapFeedPage,
  mapHome,
  percentOf,
} from "./live-mappers";
import type { ApiCatalogFeed, ApiClinicList, ApiHome } from "./live-types";
import type { ApiCustomerProductCard } from "./types";

const HOSTS = ["media.example.uz"];

function card(id: number, extra: Partial<ApiCustomerProductCard> = {}): ApiCustomerProductCard {
  return {
    id,
    slug: `p-${id}`,
    name: ` Product ${id} `,
    volume: "30 ml",
    price: 185000,
    promo: false,
    category: { slug: "serums", name: "Serumlar" },
    main_image_url: `https://media.example.uz/p/${id}.jpg`,
    available: 12,
    stock_status: "in_stock",
    ...extra,
  } as ApiCustomerProductCard;
}

function home(extra: Partial<ApiHome> = {}): ApiHome {
  return {
    content_language: "uz",
    online_sales_enabled: true,
    stats: { products: 241, products_in_stock: 234, categories: 5, specialists: 3, clinics: 1 },
    spotlight: [
      { reason: "bestseller", product: card(1) },
      { reason: "promo", product: card(2, { promo: true }) },
    ],
    rails: [
      { key: "new", items: [card(3), card(4)] },
      { key: "promo", items: [card(2, { promo: true })] },
    ],
    cashback: {
      min_percent: "1.00",
      max_percent: "3.00",
      tiers: [
        { from_amount: 20_000_000, to_amount: 30_000_000, percent: "2.00" },
        { from_amount: 0, to_amount: 20_000_000, percent: "1.00" },
        { from_amount: 30_000_000, to_amount: null, percent: "3.00" },
      ],
    },
    feed_cursor: "MjAyNi0xMS0wMlQwMDowMDowMCswNTowMHwxMg",
    ...extra,
  };
}

describe("live landing mappers", () => {
  it("maps the home summary", () => {
    const mapped = mapHome(home(), HOSTS);
    expect(mapped.contentLanguage).toBe("uz");
    expect(mapped.onlineSalesEnabled).toBe(true);
    expect(mapped.stats).toEqual({
      products: 241,
      productsInStock: 234,
      categories: 5,
      specialists: 3,
      clinics: 1,
    });
    expect(mapped.spotlight.map((entry) => [entry.reason, entry.product.id])).toEqual([
      ["bestseller", 1],
      ["promo", 2],
    ]);
    expect(mapped.spotlight[0]!.product.name).toBe("Product 1");
    expect(mapped.rails.map((rail) => [rail.key, rail.items.map((item) => item.id)])).toEqual([
      ["new", [3, 4]],
      ["promo", [2]],
    ]);
    expect(mapped.feedCursor).toBe("MjAyNi0xMS0wMlQwMDowMDowMCswNTowMHwxMg");
  });

  it("drops an odd feed cursor, so the feed starts from the top", () => {
    expect(mapHome(home({ feed_cursor: null }), HOSTS).feedCursor).toBeNull();
    expect(mapHome(home({ feed_cursor: "a b/c" }), HOSTS).feedCursor).toBeNull();
  });

  it("drops unknown reasons, rail keys, duplicates and empty rails", () => {
    const mapped = mapHome(
      home({
        spotlight: [
          { reason: "trending" as never, product: card(1) },
          { reason: "new", product: card(5) },
          { reason: "promo", product: card(5) },
          { reason: "low_stock", product: { broken: true } as never },
        ],
        rails: [
          { key: "bestsellers", items: [card(6), card(6)] },
          { key: "featured" as never, items: [card(7)] },
          { key: "new", items: [] },
          { key: "bestsellers", items: [card(8)] },
        ],
      }),
      HOSTS,
    );
    expect(mapped.spotlight.map((entry) => entry.product.id)).toEqual([5]);
    expect(mapped.rails).toHaveLength(1);
    expect(mapped.rails[0]!.items.map((item) => item.id)).toEqual([6]);
  });

  it("keeps the stock count unknown while online sales are off", () => {
    const mapped = mapHome(
      home({
        online_sales_enabled: false,
        stats: { products: 10, products_in_stock: null, categories: 0, specialists: 0, clinics: 0 },
      }),
      HOSTS,
    );
    expect(mapped.onlineSalesEnabled).toBe(false);
    expect(mapped.stats.productsInStock).toBeNull();
  });

  it("reads the cashback policy without inventing a percent", () => {
    const policy = mapCashbackPolicy(home().cashback);
    expect(policy).toEqual({
      minPercent: 1,
      maxPercent: 3,
      tiers: [
        { from: 0, to: 20_000_000, percent: 1 },
        { from: 20_000_000, to: 30_000_000, percent: 2 },
        { from: 30_000_000, to: null, percent: 3 },
      ],
    });
    expect(mapCashbackPolicy(null)).toBeNull();
    expect(mapCashbackPolicy({ min_percent: "abc", max_percent: "", tiers: [] })).toBeNull();
    // Bounds missing: taken from the tiers.
    expect(
      mapCashbackPolicy({
        min_percent: "",
        max_percent: "",
        tiers: [{ from_amount: 0, to_amount: null, percent: "1.5" }],
      }),
    ).toMatchObject({ minPercent: 1.5, maxPercent: 1.5 });
    expect(percentOf("2.50")).toBe(2.5);
    expect(percentOf("101")).toBeNull();
    expect(percentOf("-1")).toBeNull();
  });

  it("estimates cashback as a range, and none for promotions", () => {
    expect(cashbackEstimate(185_000, { minPercent: 1, maxPercent: 3 }, false)).toEqual({
      min: 1850,
      max: 5550,
    });
    expect(cashbackEstimate(185_000, { minPercent: 1, maxPercent: 3 }, true)).toBeNull();
    expect(cashbackEstimate(185_000, null, false)).toBeNull();
    expect(cashbackEstimate(50, { minPercent: 1, maxPercent: 1 }, false)).toBeNull();
  });

  it("maps feed pages and refuses odd cursors", () => {
    const page: ApiCatalogFeed = { results: [card(1), card(1), card(2)], next_cursor: "cD0yNA==" };
    expect(mapFeedPage(page, HOSTS)).toMatchObject({ nextCursor: "cD0yNA==" });
    expect(mapFeedPage(page, HOSTS).items.map((item) => item.id)).toEqual([1, 2]);
    expect(feedCursorOf("../../etc")).toBeNull();
    expect(feedCursorOf("a b")).toBeNull();
    expect(feedCursorOf(null)).toBeNull();
    expect(feedCursorOf("x".repeat(257))).toBeNull();
  });

  it("maps availability per specialist and finds the earliest slot", () => {
    const mapped = mapAvailability({
      generated_at: "2026-11-25T08:00:00+05:00",
      results: [
        {
          specialist_id: 3,
          next_slot: { start: "2026-11-25T14:00:00+05:00", location_id: 1, service_id: 7 },
          slots_today: 4,
        },
        {
          specialist_id: 4,
          next_slot: { start: "2026-11-25T11:30:00+05:00", location_id: 1, service_id: 8 },
          slots_today: 2,
        },
        { specialist_id: 5, next_slot: null, slots_today: 0 },
        {
          specialist_id: 6,
          next_slot: { start: "never", location_id: 1, service_id: 1 },
          slots_today: -3,
        },
      ],
    });
    expect(mapped.generatedAt).toBe("2026-11-25T08:00:00+05:00");
    expect(mapped.bySpecialist[3]).toEqual({
      nextSlot: { start: "2026-11-25T14:00:00+05:00", locationId: 1, serviceId: 7 },
      slotsToday: 4,
    });
    expect(mapped.bySpecialist[5]).toEqual({ nextSlot: null, slotsToday: 0 });
    expect(mapped.bySpecialist[6]).toEqual({ nextSlot: null, slotsToday: 0 });
    const slots = Object.entries(mapped.bySpecialist).flatMap(([id, row]) =>
      row.nextSlot ? [{ specialistId: Number(id), slot: row.nextSlot }] : [],
    );
    expect(earliestSlot(slots)?.specialistId).toBe(4);
    expect(earliestSlot([])).toBeNull();
  });

  it("maps clinics with today's hours", () => {
    const api: ApiClinicList = {
      results: [
        {
          id: 1,
          name: " Glow Derma klinikasi ",
          address: "Toshkent",
          directions: "",
          phone: "+998712000000",
          latitude: 41.3,
          longitude: 69.2,
          specialist_count: 3,
          today_hours: { start: "09:00:00", end: "18:00" },
          open_now: true,
        },
        {
          id: 2,
          name: "Filial",
          address: "",
          directions: "",
          phone: null,
          latitude: null,
          longitude: null,
          specialist_count: 0,
          today_hours: { start: "9", end: "18:00" },
          open_now: false,
        },
        { id: 3, name: "", address: "", directions: "" } as never,
      ],
    };
    const clinics = mapClinics(api);
    expect(clinics).toHaveLength(2);
    expect(clinics[0]).toMatchObject({
      name: "Glow Derma klinikasi",
      phone: "+998712000000",
      todayHours: { start: "09:00", end: "18:00" },
      openNow: true,
      specialistCount: 3,
    });
    expect(clinics[1]).toMatchObject({ todayHours: null, openNow: false, phone: null });
  });
});
