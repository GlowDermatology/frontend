import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import categoriesFixture from "./api/__fixtures__/categories.json";
import productFixture from "./api/__fixtures__/product-1.json";
import pageFixture from "./api/__fixtures__/products-page.json";
import statsFixture from "./api/__fixtures__/stats.json";

/**
 * The dispatchers in `src/data/<resource>.ts` pick the mock or the api branch
 * per request from `GLOWDERMA_DATA_SOURCE`. `connection()` needs a Next
 * request store, so it is stubbed here; the env is set before each import.
 * The wired resources (products, categories, banners) get a stubbed API
 * client answering the recorded fixtures; the others still answer the
 * documented empty shapes.
 */
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

const cachedGet = vi.fn();
const apiFetch = vi.fn();
vi.mock("./api/client", () => ({
  cachedGet: (...args: unknown[]) => cachedGet(...args),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));
vi.mock("./auth", () => ({
  requireApiToken: async () => "staff-token",
  verifyStaff: async () => ({ ok: true, mode: "api", token: "staff-token", sid: null }),
}));

async function loadDispatchers() {
  vi.resetModules();
  return {
    orders: await import("./orders"),
    products: await import("./products"),
    categories: await import("./categories"),
    banners: await import("./banners"),
    jobs: await import("./jobs"),
    customers: await import("./customers"),
    cashback: await import("./cashback"),
    notifications: await import("./notifications"),
    appointments: await import("./appointments"),
    dashboard: await import("./dashboard"),
    now: await import("./now"),
    source: await import("./source"),
  };
}

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
  vi.restoreAllMocks();
  cachedGet.mockReset();
  apiFetch.mockReset();
});

const PRODUCT_QUERY = {
  outOfStock: false,
  onlyNew: false,
  sort: "default" as const,
  page: 1,
  pageSize: 8,
};

describe("dispatchers in mock mode (env unset)", () => {
  beforeEach(() => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
  });

  it("serves the fixtures and the demo instant", async () => {
    const d = await loadDispatchers();
    expect(await d.source.dataSource()).toBe("mock");
    expect((await d.now.requestNow()).toISOString()).toBe("2026-10-24T07:00:00.000Z");
    expect((await d.orders.getOrderStatusCounts({ period: "month" })).all).toBe(1284);
    expect((await d.products.getCatalogStats()).total).toBe(248);
    expect((await d.products.getCatalogStats()).lastSyncLabel).toBe("2 daqiqa oldin");
    expect((await d.categories.getCategories()).map((c) => c.slug)).toEqual([
      "serums",
      "cleansing",
      "moisturizing",
      "sun",
      "toners",
    ]);
    expect((await d.banners.getBanners()).length).toBe(2);
    expect((await d.jobs.getJob("1", null))?.state).toBe("succeeded");
    expect((await d.customers.getCustomer("5"))?.name).toBe("Malika Karimova");
    expect((await d.cashback.getCashbackSettings()).policy.tiers.length).toBeGreaterThan(0);
    expect((await d.appointments.getAppointmentDay("2026-10-26")).specialists).toHaveLength(3);
    expect((await d.dashboard.getDashboard("today")).series.length).toBeGreaterThan(0);
    expect(cachedGet).not.toHaveBeenCalled();
  });
});

describe("dispatchers in api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
  });

  it("wired catalog reads call the API with the mapped parameters and map the answers", async () => {
    const d = await loadDispatchers();
    expect(await d.source.dataSource()).toBe("api");
    const respond = (data: unknown) => ({ status: 200, data, headers: new Headers() });
    cachedGet.mockImplementation(async (path: string) => {
      if (path.endsWith("/products/")) return respond(pageFixture);
      if (path.endsWith("/products/1/")) return respond(productFixture);
      if (path.endsWith("/products/stats/")) return respond(statsFixture);
      if (path.endsWith("/categories/")) return respond(categoriesFixture);
      if (path.endsWith("/banners/"))
        return respond({ count: 0, page: 1, page_size: 50, page_count: 1, results: [] });
      throw new Error(`unexpected GET ${path}`);
    });

    const page = await d.products.listProducts({
      ...PRODUCT_QUERY,
      q: "serum",
      outOfStock: true,
      sort: "name_asc",
      page: 2,
    });
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/products/",
      expect.objectContaining({
        search: "serum",
        out_of_stock: true,
        ordering: "name",
        page: 2,
        page_size: 8,
      }),
      "staff-token",
    );
    expect(page).toMatchObject({ total: 248, pageCount: 31 });
    expect(page.items[0]).toMatchObject({
      id: "1",
      lastChange: { note: "narx 175 000 → 185 000" },
    });

    const product = await d.products.getProduct("1");
    expect(product?.images.map((image) => image.label)).toEqual(["Rasm 1", "Rasm 2", "Rasm 3"]);
    expect(await d.products.getProduct("not-an-id")).toBeNull();

    const stats = await d.products.getCatalogStats();
    expect(stats).toMatchObject({ total: 248, newFromBillz: 4, billzConnected: true });
    expect(stats.lastSyncLabel).toMatch(/oldin$|^\d+-\w+, \d\d:\d\d$|hozirgina/);

    const categories = await d.categories.getCategories();
    expect(categories.map((c) => c.name.uz)).toEqual([
      "Serumlar",
      "Tozalash",
      "Namlantirish",
      "Quyoshdan himoya",
      "Tonerlar",
    ]);
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/categories/",
      { page: 1, page_size: 50 },
      "staff-token",
    );
    expect(await d.banners.getBanners()).toEqual([]);
  });

  it("maps a 404 product to null", async () => {
    const d = await loadDispatchers();
    const { ApiError } = await import("./api/errors");
    cachedGet.mockRejectedValue(
      new ApiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "" }),
    );
    expect(await d.products.getProduct("999999")).toBeNull();
    cachedGet.mockRejectedValue(
      new ApiError(500, {
        code: "server_error",
        message: "Kutilmagan xato.",
        errors: [],
        request_id: "",
      }),
    );
    await expect(d.products.getProduct("1")).rejects.toMatchObject({ status: 500 });
  });

  it("returns the documented empty shapes for the resources not wired yet and warns once each", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = await loadDispatchers();

    const before = Date.now();
    const now = await d.now.requestNow();
    expect(now.getTime()).toBeGreaterThanOrEqual(before - 1000);

    expect(
      await d.orders.listOrders({ period: "all", page: 3, pageSize: 25, sort: "date_desc" }),
    ).toEqual({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 });
    expect(await d.orders.getOrderStatusCounts({ period: "all" })).toEqual({
      all: 0,
      awaiting_payment: 0,
      processing: 0,
      handed_to_courier: 0,
      delivered: 0,
      cancelled: 0,
    });
    expect(await d.orders.getOrder(10248)).toBeNull();
    expect(await d.orders.getRecentOrders(6)).toEqual([]);
    expect(await d.orders.countFailedShipments()).toBe(0);
    expect(await d.orders.exportOrders({ period: "all", sort: "date_desc" })).toEqual([]);

    expect(await d.customers.getCustomer("5")).toBeNull();

    const cashback = await d.cashback.getCashbackSettings();
    expect(cashback.policy.tiers).toEqual([]);
    expect(cashback.versions).toEqual([]);
    expect(cashback.nextEffectiveFrom).toMatch(/^\d{4}-\d{2}-01T00:00:00\+05:00$/);
    expect(Number.isNaN(Date.parse(cashback.policy.effectiveFrom))).toBe(false);

    const overview = await d.notifications.getNotificationsOverview();
    expect(overview).toMatchObject({
      history: [],
      templates: [],
      segments: [],
      totalDevices: 0,
      linkOptions: [],
      draft: null,
    });
    expect(overview.defaultSchedule).toMatch(/^\d{4}-\d{2}-\d{2}T10:00:00\+05:00$/);

    expect(await d.appointments.getAppointmentDay("2026-10-26")).toEqual({
      date: "2026-10-26",
      specialists: [],
      appointments: [],
    });
    expect(await d.appointments.getPendingAppointments()).toEqual({ count: 0, nextAt: null });

    expect(await d.dashboard.getDashboard("week")).toEqual({
      range: "week",
      axisNote: "",
      axisLabels: ["", "", ""],
      series: [],
      stats: {
        newCustomers: 0,
        ordersNote: "",
        totalCustomers: 0,
        deletedCustomers: 0,
        outOfStock: 0,
      },
      attention: {
        btsFailed: 0,
        pendingAppointments: 0,
        nextAppointmentAt: null,
        newFromBillz: 0,
      },
    });

    const resources = warn.mock.calls.map((call) => String(call[0]).match(/^\[data\] (\w+):/)?.[1]);
    expect(resources.sort()).toEqual([
      "appointments",
      "cashback",
      "customers",
      "dashboard",
      "notifications",
      "orders",
    ]);
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("rejects an unknown value", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "staging";
    const d = await loadDispatchers();
    await expect(d.source.dataSource()).rejects.toThrow(/GLOWDERMA_DATA_SOURCE/);
  });
});
