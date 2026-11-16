import { describe, expect, it, vi } from "vitest";

vi.mock("./delay", () => ({ delay: async () => undefined }));

import {
  ISSUE_RESOLVED_MESSAGE,
  openIncident,
  PICKUP_ISSUE_MESSAGE,
  resolveIssue,
  setDispatchSuspension,
  UNTIL_PAST_MESSAGE,
} from "./delivery-issues.actions";
import {
  getDispatchSuspension,
  getIssueAlerts,
  listDeliveryIssues,
} from "./delivery-issues.queries";
import { DELIVERY_ISSUES, ORDER_SEEDS, ORDER_SUMMARIES } from "./orders";
import { getFulfilmentCounts, getOrder, getOrderStatusCounts, listOrders } from "./orders.queries";

/**
 * The Yandex Delivery demo data (plan §3.9/§3.10): which orders carry it, the
 * carrier filters, the dashboard counters, the queue and its mock actions.
 */

const yandexSeeds = ORDER_SEEDS.filter((seed) => seed.yandex);
const LIST = { period: "all" as const, page: 1, pageSize: 50, sort: "date_desc" as const };

describe("demo Yandex deliveries", () => {
  it("puts ten generated paid deliveries on every interesting stage, never a design order", () => {
    expect(yandexSeeds).toHaveLength(10);
    expect(yandexSeeds.every((seed) => seed.id < 10_243 && seed.customerId !== "5")).toBe(true);
    expect(
      yandexSeeds.every((seed) => seed.payment === "paid" && seed.fulfilment === "delivery"),
    ).toBe(true);
    expect(new Set(yandexSeeds.map((seed) => seed.yandex!.stage))).toEqual(
      new Set([
        "awaiting_dispatch",
        "courier_requested",
        "courier_assigned",
        "failed",
        "in_transit",
        "at_destination",
        "returning",
        "delivered",
      ]),
    );
    expect(new Set(yandexSeeds.map((seed) => seed.yandex!.method))).toEqual(
      new Set(["standard", "express"]),
    );
  });

  it("keeps the design orders and the tab counts as drawn", async () => {
    const order = await getOrder(10248);
    expect(order?.delivery).toMatchObject({ provider: "bts", stage: null, openIssues: [] });
    expect(order?.availableActions).toEqual({
      transitions: ["delivered"],
      cancel: true,
      retryShipment: false,
    });
    expect((await getOrderStatusCounts({ period: "month" })).all).toBe(1284);
    expect((await getOrder(10251))?.delivery).toBeNull(); // pickup
  });

  it("never carries a courier phone", () => {
    const text = JSON.stringify(ORDER_SUMMARIES.map((order) => order.delivery));
    expect(text).not.toMatch(/\+?998\d{9}/);
  });

  it("filters by carrier, stage and open issues like orders/ does", async () => {
    expect((await listOrders({ ...LIST, provider: "yandex" })).total).toBe(10);
    const returning = await listOrders({ ...LIST, provider: "yandex", stage: "returning" });
    expect(returning.items.map((o) => o.delivery?.stage)).toEqual(["returning"]);
    expect((await listOrders({ ...LIST, stage: "courier_assigned" })).total).toBe(1);
    const urgent = await listOrders({ ...LIST, attention: "urgent" });
    expect(urgent.items.every((o) => o.delivery?.openIssues.some((issue) => issue.urgent))).toBe(
      true,
    );
    expect(urgent.total).toBe(2);
    expect((await listOrders({ ...LIST, attention: "open" })).total).toBe(5);
    const bts = await listOrders({ ...LIST, provider: "bts" });
    expect(
      bts.items.every((o) => o.fulfilment === "delivery" && o.delivery?.provider === "bts"),
    ).toBe(true);
  });

  it("words a Yandex order's history with its carrier", async () => {
    const returning = yandexSeeds.find((seed) => seed.yandex!.stage === "returning")!;
    const order = await getOrder(returning.id);
    expect(order?.history.map((event) => [event.title, event.source])).toEqual(
      expect.arrayContaining([
        ["Kuryer chaqirildi", "admin"],
        ["Kuryerga topshirildi", "yandex"],
        ["Yetkazib bo‘lmadi", "yandex"],
      ]),
    );
    expect(order?.history.some((event) => event.title.startsWith("BTS"))).toBe(false);
    expect(order?.availableActions).toMatchObject({ transitions: [], retryShipment: false });
  });
});

describe("dashboard fulfilment over the fixtures", () => {
  it("counts by the backend's rules", async () => {
    const counts = await getFulfilmentCounts();
    expect(counts).toEqual({
      paidToPrepare: 10,
      toHandToCourier: 2,
      inDelivery: 8,
      returning: 1,
      completedToday: 1,
      needsAction: 6,
      urgent: 2,
    });
    // The tiles' lists contain their orders.
    const courier = await listOrders({ ...LIST, status: "processing", provider: "yandex" });
    expect(
      courier.items.filter((o) =>
        ["courier_requested", "courier_assigned", "courier_arrived"].includes(
          o.delivery?.stage ?? "",
        ),
      ),
    ).toHaveLength(counts.toHandToCourier);
    const processing = await getOrderStatusCounts({ period: "all" });
    expect(processing.processing).toBe(counts.paidToPrepare + counts.toHandToCourier);
  });
});

describe("the demo queue", () => {
  it("lists open issues urgent first, then oldest; resolved newest first", async () => {
    const open = await listDeliveryIssues({ state: "open", page: 1, pageSize: 20 });
    expect(open.total).toBe(6);
    expect(open.items.map((issue) => issue.urgent)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    const urgentDates = open.items.slice(0, 2).map((issue) => issue.openedAt);
    expect([...urgentDates].sort()).toEqual(urgentDates);
    const resolved = await listDeliveryIssues({ state: "resolved", page: 1, pageSize: 20 });
    expect(resolved.items.every((issue) => issue.resolvedBy?.name === "Administrator")).toBe(true);
    expect(
      (await listDeliveryIssues({ state: "open", kind: "incident", page: 1, pageSize: 20 })).total,
    ).toBe(1);
    expect(
      (await listDeliveryIssues({ state: "open", urgent: false, page: 1, pageSize: 20 })).total,
    ).toBe(4);
    const order = open.items[0]!.orderId;
    expect(
      (await listDeliveryIssues({ state: "open", order, page: 1, pageSize: 20 })).items.every(
        (issue) => issue.orderId === order,
      ),
    ).toBe(true);
  });

  it("feeds the poll and the switch", async () => {
    const alerts = await getIssueAlerts();
    expect(alerts.open).toBe(6);
    expect(alerts.urgent.map((alert) => alert.kind).sort()).toEqual(["incident", "return_pending"]);
    expect((await getDispatchSuspension()).suspended).toBe(false);
  });
});

describe("mock queue actions (the backend's rules)", () => {
  const open = DELIVERY_ISSUES.find((issue) => issue.state === "open")!;
  const resolved = DELIVERY_ISSUES.find((issue) => issue.state === "resolved")!;

  it("resolves an open issue, refuses a resolved or unknown one", async () => {
    const result = await resolveIssue(open.id, "Mijoz bilan gaplashildi");
    expect(result).toMatchObject({
      ok: true,
      data: { id: open.id, state: "resolved", resolutionNote: "Mijoz bilan gaplashildi" },
    });
    expect(await resolveIssue(resolved.id, "yana")).toEqual({
      ok: false,
      error: ISSUE_RESOLVED_MESSAGE,
      code: "conflict",
    });
    expect(await resolveIssue(999_999, "yo‘q")).toMatchObject({ ok: false, code: "not_found" });
  });

  it("opens a staff incident (201), refreshes an open one (200), refuses pickup", async () => {
    const created = await openIncident(10248, "Qadoq ezilgan", false);
    expect(created).toMatchObject({
      ok: true,
      data: { created: true, issue: { orderId: 10248, kind: "incident", code: "staff_report" } },
    });
    const withIncident = DELIVERY_ISSUES.find(
      (issue) => issue.kind === "incident" && issue.state === "open",
    )!;
    const refreshed = await openIncident(withIncident.orderId, "Yangilangan izoh", false);
    expect(refreshed).toMatchObject({
      ok: true,
      data: {
        created: false,
        issue: { id: withIncident.id, note: "Yangilangan izoh", urgent: false },
      },
    });
    expect(await openIncident(10251, "Olib ketish", true)).toEqual({
      ok: false,
      error: PICKUP_ISSUE_MESSAGE,
      code: "conflict",
    });
    expect(await openIncident(1, "Yo‘q", true)).toMatchObject({ code: "not_found" });
  });

  it("switches dispatch off until a future time and refuses a past one", async () => {
    const on = await setDispatchSuspension(true, "2026-10-25T09:00:00+05:00", "Inventarizatsiya");
    expect(on).toMatchObject({
      ok: true,
      data: { suspended: true, until: "2026-10-25T09:00:00+05:00", note: "Inventarizatsiya" },
    });
    expect(await setDispatchSuspension(true, "2026-10-24T09:00:00+05:00", "")).toMatchObject({
      ok: false,
      fieldErrors: { until: UNTIL_PAST_MESSAGE },
    });
    expect(await setDispatchSuspension(false, "2026-10-24T09:00:00+05:00", "")).toMatchObject({
      ok: true,
      data: { suspended: false, until: null },
    });
  });
});
