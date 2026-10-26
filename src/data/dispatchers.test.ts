import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import categoriesFixture from "./api/__fixtures__/categories.json";
import productFixture from "./api/__fixtures__/product-1.json";
import pageFixture from "./api/__fixtures__/products-page.json";
import statsFixture from "./api/__fixtures__/stats.json";
import dayFixture from "./api/__fixtures__/appointments-day.json";
import appointmentsMetaFixture from "./api/__fixtures__/appointments-meta.json";
import auditFixture from "./api/__fixtures__/audit-page.json";
import navCountsFixture from "./api/__fixtures__/nav-counts.json";
import notificationsMetaFixture from "./api/__fixtures__/notifications-meta.json";
import notificationsPageFixture from "./api/__fixtures__/notifications-page.json";
import pendingFixture from "./api/__fixtures__/pending-summary.json";
import membersFixture from "./api/__fixtures__/segment-1-members.json";
import segmentsFixture from "./api/__fixtures__/segments-page.json";
import settingsFixture from "./api/__fixtures__/settings.json";

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
  getMe: async () => null,
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
    segments: await import("./segments"),
    settings: await import("./settings"),
    audit: await import("./audit"),
    shell: await import("./shell"),
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

  it("lists unfiltered when the API refuses a category deleted in between (400 on category)", async () => {
    const d = await loadDispatchers();
    const { ApiError } = await import("./api/errors");
    cachedGet.mockImplementation(async (_path: string, params: Record<string, unknown>) => {
      if (params.category === "gone") {
        throw new ApiError(400, {
          code: "validation_error",
          message: "Maydonlarni tekshiring.",
          errors: [{ field: "category", code: "invalid_choice", message: "Noto‘g‘ri tanlov." }],
          request_id: "r",
        });
      }
      return { status: 200, data: pageFixture, headers: new Headers() };
    });
    const page = await d.products.listProducts({ ...PRODUCT_QUERY, category: "gone" });
    expect(page.total).toBe(248);
    expect(cachedGet).toHaveBeenCalledTimes(2);
    expect(cachedGet.mock.calls[1]![1]).not.toHaveProperty("category", "gone");
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

  it("loads every category page but never past a short page, an empty page or the cap", async () => {
    const d = await loadDispatchers();
    const respond = (data: unknown) => ({ status: 200, data, headers: new Headers() });
    const row = (id: number, position: number) => ({
      ...categoriesFixture.results[0],
      id,
      slug: `c${id}`,
      position,
    });

    // A proxied answer without `page_count` (and without `page_size`): one request, no loop.
    cachedGet.mockImplementation(async () =>
      respond({ count: 2, page: 1, results: [row(2, 2), row(1, 1)] }),
    );
    expect((await d.categories.getCategories()).map((c) => c.slug)).toEqual(["c1", "c2"]);
    expect(cachedGet).toHaveBeenCalledTimes(1);

    // `page_count` that keeps growing with full pages: stops at the cap by throwing, not by looping.
    cachedGet.mockReset();
    const d2 = await loadDispatchers();
    cachedGet.mockImplementation(async (_path: string, params: { page: number }) =>
      respond({
        count: 10_000,
        page: params.page,
        page_size: 50,
        page_count: params.page + 1,
        results: Array.from({ length: 50 }, (_, i) => row(params.page * 100 + i, i)),
      }),
    );
    await expect(d2.categories.getCategories()).rejects.toThrow(/categories\/: more than 20 pages/);
    expect(cachedGet).toHaveBeenCalledTimes(20);

    // Banners: a honest two-page list is followed to the end.
    cachedGet.mockReset();
    const d3 = await loadDispatchers();
    cachedGet.mockImplementation(async (_path: string, params: { page: number }) =>
      respond({
        count: 51,
        page: params.page,
        page_size: 50,
        page_count: 2,
        results: Array.from({ length: params.page === 1 ? 50 : 1 }, (_, i) => ({
          id: params.page * 100 + i,
          position: params.page * 100 + i,
          title: { uz: `B${i}`, ru: "", en: "" },
          image_url: "http://localhost:8001/media/banners/x.png",
          link: { kind: "none", product_id: null, category: null },
          is_active: true,
          starts_at: null,
          ends_at: null,
          created_at: "2026-10-24T07:00:00Z",
          updated_at: "2026-10-24T07:00:00Z",
        })),
      }),
    );
    expect(await d3.banners.getBanners()).toHaveLength(51);
    expect(cachedGet).toHaveBeenCalledTimes(2);
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
    // customers and cashback are wired (F2c): see customers-cashback.test.ts.
    expect(resources.sort()).toEqual(["dashboard", "orders"]);
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("reads the M1d shell resources from the API and maps them", async () => {
    const respond = (data: unknown) => ({ status: 200, data, headers: new Headers() });
    cachedGet.mockImplementation(async (path: string) => {
      const fixtures: Record<string, unknown> = {
        "/api/v1/admin/appointments/": dayFixture,
        "/api/v1/admin/appointments/pending-summary/": pendingFixture,
        "/api/v1/admin/appointments/meta/": appointmentsMetaFixture,
        "/api/v1/admin/notifications/": notificationsPageFixture,
        "/api/v1/admin/notifications/meta/": notificationsMetaFixture,
        "/api/v1/admin/segments/": segmentsFixture,
        "/api/v1/admin/segments/1/members/": membersFixture,
        "/api/v1/admin/settings/": settingsFixture,
        "/api/v1/admin/audit-log/": auditFixture,
        "/api/v1/admin/nav-counts/": navCountsFixture,
      };
      if (!(path in fixtures)) throw new Error(`unexpected GET ${path}`);
      return respond(fixtures[path]);
    });
    const d = await loadDispatchers();
    const day = await d.appointments.getAppointmentDay("2026-10-26");
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/appointments/",
      { date: "2026-10-26" },
      "staff-token",
    );
    expect(day.specialists).toHaveLength(3);
    expect(day.appointments).toHaveLength(8);
    expect(await d.appointments.getPendingAppointments()).toEqual({
      count: 3,
      nextAt: "2026-10-26T09:00:00+05:00",
    });
    expect((await d.appointments.getBookingMeta()).specialists).toHaveLength(3);
    const today = await d.appointments.defaultAppointmentDay();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const overview = await d.notifications.getNotificationsOverview();
    expect(overview.history.map((r) => r.id)).toEqual(["4", "3", "2", "1"]);
    expect(overview).toMatchObject({ historyTotal: 4, totalDevices: 360, draft: null });
    expect(overview.templates).toHaveLength(4);
    expect(overview.defaultSchedule).toMatch(/^\d{4}-\d{2}-\d{2}T10:00:00\+05:00$/);
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/notifications/",
      { page_size: 20 },
      "staff-token",
    );

    expect((await d.segments.listSegments(1)).items.map((s) => s.name)).toEqual([
      "Doimiy mijozlar",
      "10 mln+ xarid",
    ]);
    expect((await d.segments.listSegmentMembers("1", 1)).items[0]?.name).toBe("Malika Karimova");
    expect(await d.segments.getSegment("s-1")).toBeNull();
    expect((await d.settings.getSettings()).integrationsMode).toBe("fake");
    const audit = await d.audit.listAuditLog({
      ordering: "at",
      page: 2,
      action: "auth.login_failed",
    });
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/audit-log/",
      expect.objectContaining({
        ordering: "at",
        page: 2,
        page_size: 20,
        action: "auth.login_failed",
      }),
      "staff-token",
    );
    expect(audit.items).toHaveLength(4);
    expect(await d.shell.getNavCounts()).toEqual({ ordersProcessing: 0, appointmentsPending: 3 });
  });

  it("degrades the nav counts to null when the API fails", async () => {
    const d = await loadDispatchers();
    const { ApiError } = await import("./api/errors");
    cachedGet.mockRejectedValue(
      new ApiError(503, { code: "http_503", message: "x", errors: [], request_id: "" }),
    );
    expect(await d.shell.getNavCounts()).toBeNull();
  });

  it("rejects an unknown value", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "staging";
    const d = await loadDispatchers();
    await expect(d.source.dataSource()).rejects.toThrow(/GLOWDERMA_DATA_SOURCE/);
  });
});
