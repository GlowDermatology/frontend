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
// --- orders / payments / dashboard (F2d) ---
import dashboardWeekFixture from "./api/__fixtures__/dashboard-week.json";
import order10248Fixture from "./api/__fixtures__/order-10248.json";
import orderCountsFixture from "./api/__fixtures__/order-status-counts.json";
import ordersPageFixture from "./api/__fixtures__/orders-page.json";
import paymentsPageFixture from "./api/__fixtures__/payments-page.json";
// --- end orders / payments / dashboard ---

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
    payments: await import("./payments"),
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

const PAYMENT_QUERY = {
  period: "all" as const,
  sort: "date_desc" as const,
  page: 1,
  pageSize: 20,
};

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
    const dashboard = await d.dashboard.getDashboard({ range: "today" });
    expect(dashboard.ok && dashboard.data.series.length).toBeGreaterThan(0);
    // The demo shows every attention item: three manual refunds, an unknown and a failed one,
    // and BTS polling down.
    expect(dashboard.ok && dashboard.data.attention).toMatchObject({
      refundsNeedingAction: 5,
      btsPollingFailing: true,
    });
    const custom = await d.dashboard.getDashboard({
      range: "custom",
      from: "2026-10-23",
      to: "2026-10-24",
    });
    expect(custom.ok && custom.data.attention.btsPollingFailing).toBe(true);
    expect((await d.orders.getOrder(10248))?.availableActions).toEqual({
      transitions: ["delivered"],
      cancel: true,
      retryShipment: false,
    });
    expect((await d.payments.listPayments(PAYMENT_QUERY)).total).toBe(1284);
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

  it("serves every resource from the API: no dispatcher falls back to a not-wired empty shape", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = await loadDispatchers();

    const before = Date.now();
    const now = await d.now.requestNow();
    expect(now.getTime()).toBeGreaterThanOrEqual(before - 1000);

    const resources = warn.mock.calls.map((call) => String(call[0]).match(/^\[data\] (\w+):/)?.[1]);
    // Every resource is wired to the API (F2a–F2d): nothing serves an empty "not wired" shape any more.
    expect(resources).toEqual([]);
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
    expect(overview.history.items.map((r) => r.id)).toEqual(["4", "3", "2", "1"]);
    expect(overview.history).toMatchObject({ total: 4, page: 1, pageSize: 20, pageCount: 1 });
    expect(overview).toMatchObject({ totalDevices: 360, draft: null });
    expect(overview.templates).toHaveLength(4);
    expect(overview.defaultSchedule).toMatch(/^\d{4}-\d{2}-\d{2}T10:00:00\+05:00$/);
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/notifications/",
      { state: undefined, kind: undefined, page: 1, page_size: 20 },
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

  /* --- orders / payments / dashboard (F2d) --- */

  it("reads orders, payments and the dashboard from the API with the mapped parameters", async () => {
    const respond = (data: unknown) => ({ status: 200, data, headers: new Headers() });
    cachedGet.mockImplementation(async (path: string) => {
      const fixtures: Record<string, unknown> = {
        "/api/v1/admin/orders/": ordersPageFixture,
        "/api/v1/admin/orders/status-counts/": orderCountsFixture,
        "/api/v1/admin/orders/10248/": order10248Fixture,
        "/api/v1/admin/payments/": paymentsPageFixture,
        "/api/v1/admin/dashboard/": dashboardWeekFixture,
      };
      if (!(path in fixtures)) throw new Error(`unexpected GET ${path}`);
      return respond(fixtures[path]);
    });
    const d = await loadDispatchers();

    const page = await d.orders.listOrders({
      q: " 10248 ",
      status: "processing",
      period: "week",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-24",
      customer: "7",
      sort: "date_asc",
      page: 2,
      pageSize: 6,
    });
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/orders/",
      {
        search: "10248",
        fulfilment: undefined,
        payment: undefined,
        period: "week",
        date_from: "2026-10-01",
        date_to: "2026-10-24",
        customer: "7",
        status: "processing",
        ordering: "created_at",
        page: 2,
        page_size: 6,
      },
      "staff-token",
    );
    expect(page.total).toBe(252);
    expect(page.items[0]).toMatchObject({ id: 10252, customer: { id: "1" } });

    const counts = await d.orders.getOrderStatusCounts({ period: "all", payment: "paid" });
    expect(cachedGet).toHaveBeenLastCalledWith(
      "/api/v1/admin/orders/status-counts/",
      expect.objectContaining({ period: "all", payment: "paid" }),
      "staff-token",
    );
    expect(counts.processing).toBe(12);

    const order = await d.orders.getOrder(10248);
    expect(order?.history.map((e) => e.title)).toEqual([
      "Kuryerga topshirildi",
      "BTS buyurtmasi yaratildi",
      "Jarayonda",
      "To‘lov kutilmoqda",
    ]);
    // The recorded photos point at 127.0.0.1:8000, never a configured GLOWDERMA_MEDIA_HOSTS entry.
    expect(order?.items.every((item) => item.imageUrl === undefined)).toBe(true);
    expect((await d.orders.getRecentOrders(6)).length).toBe(6);
    expect(cachedGet).toHaveBeenLastCalledWith(
      "/api/v1/admin/orders/",
      { page_size: 6 },
      "staff-token",
    );

    const payments = await d.payments.listPayments({ ...PAYMENT_QUERY, refund: "succeeded" });
    expect(cachedGet).toHaveBeenLastCalledWith(
      "/api/v1/admin/payments/",
      expect.objectContaining({
        refund_state: "succeeded",
        ordering: "-created_at",
        page_size: 20,
      }),
      "staff-token",
    );
    expect(payments.items[0]?.refunds[0]?.state).toBe("succeeded");

    const dashboard = await d.dashboard.getDashboard({ range: "week" });
    expect(cachedGet).toHaveBeenLastCalledWith(
      "/api/v1/admin/dashboard/",
      { range: "week" },
      "staff-token",
    );
    expect(dashboard.ok && dashboard.data.series).toHaveLength(7);
    expect(dashboard.ok && dashboard.data.stats.ordersNote).toMatch(/^O‘tgan hafta: \d+ ta$/);
  });

  it("merges the three refund states that need action and pages locally", async () => {
    const refund = (id: number, state: string) => ({
      id,
      state,
      provider: "click",
      amount: 1000,
      requested_at: "2026-10-24T12:00:00+05:00",
      updated_at: "2026-10-24T12:00:00+05:00",
      completed_at: null,
    });
    const payment = (id: number, at: string, state: string) => ({
      id,
      order_id: 10_000 + id,
      customer: { id: 1, name: "", phone: "+998901234567" },
      provider: "click",
      status: "paid",
      amount: 1000,
      transaction_id: null,
      created_at: at,
      confirmed_at: null,
      refunds: [refund(id, state)],
    });
    const byState: Record<string, unknown[]> = {
      failed: [payment(3, "2026-10-24T10:00:00+05:00", "failed")],
      unknown: [payment(1, "2026-10-20T10:00:00+05:00", "unknown")],
      manual_required: [payment(2, "2026-10-22T10:00:00+05:00", "manual_required")],
    };
    cachedGet.mockImplementation(async (_path: string, query: Record<string, unknown>) => {
      const results = byState[String(query.refund_state)] ?? [];
      return {
        status: 200,
        data: { count: results.length, page: 1, page_size: 50, page_count: 1, results },
        headers: new Headers(),
      };
    });
    const d = await loadDispatchers();
    const page = await d.payments.listPayments({ ...PAYMENT_QUERY, refund: "needs_action" });
    expect(cachedGet).toHaveBeenCalledTimes(3);
    expect(page.items.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(page.items[2]?.customer.name).toBe("O‘chirilgan mijoz");
    expect(page.total).toBe(3);

    // A payment with a failed and a manual_required refund comes back in both lists: once here.
    const both = {
      ...payment(4, "2026-10-23T10:00:00+05:00", "manual_required"),
      refunds: [refund(5, "manual_required"), refund(4, "failed")],
    };
    byState.failed = [byState.failed![0], both];
    byState.manual_required = [both, byState.manual_required![0]];
    const merged = await d.payments.listPayments({ ...PAYMENT_QUERY, refund: "needs_action" });
    expect(merged.items.map((p) => p.id)).toEqual([3, 4, 2, 1]);
    expect(merged.total).toBe(4);
    expect(merged.items[1]?.refunds.map((r) => r.state)).toEqual(["manual_required", "failed"]);
  });

  it("returns the dashboard's custom-range 400 as field errors", async () => {
    const d = await loadDispatchers();
    const { ApiError } = await import("./api/errors");
    cachedGet.mockRejectedValue(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "to", code: "invalid", message: "Noto‘g‘ri qiymat." }],
        request_id: "",
      }),
    );
    expect(
      await d.dashboard.getDashboard({ range: "custom", from: "2026-10-20", to: "2026-12-01" }),
    ).toEqual({ ok: false, errors: { to: "Noto‘g‘ri qiymat." } });
  });

  it("maps a 404 order to null", async () => {
    const d = await loadDispatchers();
    const { ApiError } = await import("./api/errors");
    cachedGet.mockRejectedValue(
      new ApiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "" }),
    );
    expect(await d.orders.getOrder(999)).toBeNull();
  });

  /* --- end orders / payments / dashboard --- */

  it("rejects an unknown value", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "staging";
    const d = await loadDispatchers();
    await expect(d.source.dataSource()).rejects.toThrow(/GLOWDERMA_DATA_SOURCE/);
  });
});
