import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The dispatchers in `src/data/<resource>.ts` pick the mock or the api branch
 * per request from `GLOWDERMA_DATA_SOURCE`. `connection()` needs a Next
 * request store, so it is stubbed here; the env is set before each import.
 */
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

async function loadDispatchers() {
  vi.resetModules();
  return {
    orders: await import("./orders"),
    products: await import("./products"),
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
});

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
    expect((await d.customers.getCustomer("5"))?.name).toBe("Malika Karimova");
    expect((await d.cashback.getCashbackSettings()).policy.tiers.length).toBeGreaterThan(0);
    expect((await d.appointments.getAppointmentDay("2026-10-26")).specialists).toHaveLength(3);
    expect((await d.dashboard.getDashboard("today")).series.length).toBeGreaterThan(0);
  });
});

describe("dispatchers in api mode (endpoints not wired yet)", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
  });

  it("returns the documented empty shapes and warns once per resource", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = await loadDispatchers();
    expect(await d.source.dataSource()).toBe("api");

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

    expect(
      await d.products.listProducts({
        outOfStock: false,
        onlyNew: false,
        sort: "default",
        page: 1,
        pageSize: 8,
      }),
    ).toEqual({ items: [], total: 0, page: 1, pageSize: 8, pageCount: 1 });
    expect(await d.products.getProduct("p-1")).toBeNull();
    expect(await d.products.getCatalogStats()).toMatchObject({
      total: 0,
      newFromBillz: 0,
      outOfStock: 0,
    });

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
      "products",
    ]);
  });

  it("rejects an unknown value", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "staging";
    const d = await loadDispatchers();
    await expect(d.source.dataSource()).rejects.toThrow(/GLOWDERMA_DATA_SOURCE/);
  });
});
