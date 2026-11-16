import { describe, expect, it } from "vitest";

import order10248Fixture from "../__fixtures__/order-10248.json";
import type {
  ApiDashboard,
  ApiDeliveryIssue,
  ApiOrderDelivery,
  ApiOrderDetail,
  ApiOrderEvent,
  ApiPaginatedDeliveryIssues,
} from "../types";
import { mapDashboard, mapFulfilment } from "./dashboard";
import {
  issueListParams,
  mapDeliveryIssue,
  mapIssueAlerts,
  mapSuspension,
  suspensionBody,
  URGENT_ALERT_PARAMS,
} from "./delivery-issues";
import {
  confirmReturnBody,
  dispatchBody,
  foldOrderHistory,
  mapOrder,
  mapOrderActions,
  mapOrderDelivery,
  mapOrderSummary,
  orderFilterParams,
  safeTrackingUrl,
} from "./orders";

/**
 * Yandex Delivery admin mappers (plan §3.9, §3.10; INTERFACES-ops) against
 * hand-written answers typed by the generated OpenAPI schema of backend
 * 03d5149 (no live recording exists yet: no Yandex account).
 */

const order10248 = order10248Fixture as unknown as ApiOrderDetail;

const YANDEX: ApiOrderDelivery = {
  provider: "yandex",
  method: "express",
  stage: "courier_assigned",
  promised_from: "2026-11-15T14:05:00+05:00",
  promised_to: "2026-11-15T14:50:00+05:00",
  quote_fee: 35_000,
  carrier_price: 30_500,
  offer_price: 32_000,
  approved_price: null,
  carrier_cost_total: null,
  cost_difference: null,
  parcel_weight_g: 850,
  prepared_at: "2026-11-15T13:40:00+05:00",
  courier_name: "Sardor",
  courier_vehicle: "Chevrolet Cobalt · oq",
  tracking_url: "https://example.com/track/abc",
  claim_status: "performer_found",
  claim_number: 1,
  failure_code: null,
  open_issues: [
    {
      id: 7,
      kind: "incident",
      code: "staff_report",
      urgent: true,
      opened_at: "2026-11-15T13:50:00+05:00",
    },
  ],
};

const BTS: ApiOrderDelivery = {
  provider: "bts",
  method: null,
  stage: null,
  promised_from: null,
  promised_to: null,
  quote_fee: null,
  carrier_price: null,
  offer_price: null,
  approved_price: null,
  carrier_cost_total: null,
  cost_difference: null,
  parcel_weight_g: null,
  prepared_at: null,
  courier_name: null,
  courier_vehicle: null,
  tracking_url: null,
  claim_status: null,
  claim_number: null,
  failure_code: null,
  open_issues: [],
};

const event = (
  id: number,
  type: string,
  data: Record<string, unknown>,
  extra: Partial<ApiOrderEvent> = {},
): ApiOrderEvent =>
  ({
    id,
    type,
    at: "2026-11-15T15:00:00+05:00",
    source: "system",
    actor: null,
    status_after: null,
    data,
    ...extra,
  }) as ApiOrderEvent;

describe("mapOrderDelivery (OrderDelivery)", () => {
  it("maps every Yandex key, keeping the server's amounts", () => {
    expect(mapOrderDelivery(YANDEX)).toEqual({
      provider: "yandex",
      method: "express",
      stage: "courier_assigned",
      promisedFrom: "2026-11-15T14:05:00+05:00",
      promisedTo: "2026-11-15T14:50:00+05:00",
      quoteFee: 35_000,
      carrierPrice: 30_500,
      offerPrice: 32_000,
      approvedPrice: null,
      carrierCostTotal: null,
      costDifference: null,
      parcelWeightG: 850,
      preparedAt: "2026-11-15T13:40:00+05:00",
      courierName: "Sardor",
      courierVehicle: "Chevrolet Cobalt · oq",
      trackingUrl: "https://example.com/track/abc",
      claimStatus: "performer_found",
      claimNumber: 1,
      failureCode: null,
      openIssues: [
        {
          id: 7,
          kind: "incident",
          code: "staff_report",
          urgent: true,
          openedAt: "2026-11-15T13:50:00+05:00",
        },
      ],
    });
  });

  it("keeps a BTS order to its provider and issues", () => {
    const bts = mapOrderDelivery({
      ...BTS,
      open_issues: [
        {
          id: 9,
          kind: "incident",
          code: "staff_report",
          urgent: false,
          opened_at: "2026-11-15T10:00:00+05:00",
        },
      ],
    });
    expect(bts.provider).toBe("bts");
    expect(bts.method).toBeNull();
    expect(bts.openIssues.map((issue) => issue.id)).toEqual([9]);
  });

  it("reads an unknown stage, method or issue kind as absent and drops non-http tracking links", () => {
    const odd = mapOrderDelivery({
      ...YANDEX,
      stage: "teleported" as never,
      method: "drone" as never,
      tracking_url: "javascript:alert(1)",
      courier_name: "",
      open_issues: [{ id: 1, kind: "brand_new" as never, code: "x", urgent: false, opened_at: "" }],
    });
    expect(odd).toMatchObject({ stage: null, method: null, trackingUrl: null, courierName: null });
    expect(odd.openIssues).toEqual([]);
    expect(safeTrackingUrl("https://a.example/x?y=1")).toBe("https://a.example/x?y=1");
    expect(safeTrackingUrl("ftp://a.example/x")).toBeNull();
    expect(safeTrackingUrl("not a url")).toBeNull();
    expect(safeTrackingUrl(null)).toBeNull();
  });
});

describe("orders with the delivery object", () => {
  it("leaves `delivery` out for an API before Yandex Delivery and keeps null for pickup", () => {
    const old = mapOrderSummary(order10248);
    expect("delivery" in old).toBe(false);
    expect(
      mapOrderSummary({ ...order10248, fulfilment: "pickup", delivery: null }).delivery,
    ).toBeNull();
    expect(mapOrderSummary({ ...order10248, delivery: YANDEX }).delivery?.stage).toBe(
      "courier_assigned",
    );
  });

  it("reads available_actions.dispatch / confirm_return only when the API sends them (phase 3)", () => {
    // An answer of a backend before phase 3 (the keys did not exist yet).
    const older = {
      transitions: [],
      cancel: true,
      retry_shipment: false,
    } as unknown as ApiOrderDetail["available_actions"];
    expect(mapOrderActions(older)).toEqual({ transitions: [], cancel: true, retryShipment: false });
    expect("dispatch" in mapOrderActions(older)).toBe(false);
    const current: ApiOrderDetail["available_actions"] = {
      transitions: ["delivered"],
      cancel: true,
      retry_shipment: false,
      dispatch: true,
      confirm_return: false,
    };
    expect(mapOrderActions(current)).toEqual({
      transitions: ["delivered"],
      cancel: true,
      retryShipment: false,
      dispatch: true,
      confirmReturn: false,
    });
  });

  it("builds the dispatch and confirm-return bodies (plan §3.6, §3.8)", () => {
    expect(dispatchBody({ contentsVerified: true, weightG: 650 })).toEqual({
      contents_verified: true,
      weight_g: 650,
    });
    expect(
      dispatchBody({ contentsVerified: true, weightG: 650, method: null, approvedPrice: 0 }),
    ).toEqual({ contents_verified: true, weight_g: 650, approved_price: 0 });
    expect(
      dispatchBody({
        contentsVerified: true,
        weightG: 9_000,
        method: "express",
        approvedPrice: null,
      }),
    ).toEqual({ contents_verified: true, weight_g: 9_000, method: "express" });
    expect(confirmReturnBody("  qadoq butun ")).toEqual({ note: "qadoq butun" });
    expect(confirmReturnBody(undefined)).toEqual({ note: "" });
  });

  it("words a Yandex order's carrier events (never the BTS texts)", () => {
    const rows = foldOrderHistory(
      [
        event(6, "shipment_returned", { provider: "yandex", carrier_status: "", claim_id: "c1" }),
        event(5, "shipment_returned", {
          provider: "yandex",
          carrier_status: "returned_finish",
          claim_id: "c1",
        }),
        event(
          4,
          "delivery_failed",
          {
            provider: "yandex",
            carrier_status: "returning",
            reason: "recipient_unreachable",
            claim_id: "c1",
          },
          { source: "yandex" },
        ),
        event(
          3,
          "handed_to_courier",
          { via: "polling", bts_status: "pickuped", push_sent: true },
          { source: "yandex", status_after: "handed_to_courier" },
        ),
        event(2, "shipment_created", { tracking_number: "c1", tariff: 32_000, manual: false }),
        event(1, "shipment_failed", {
          attempt: 1,
          manual: false,
          error_code: "performer_not_found",
        }),
      ],
      "delivery",
      "yandex",
    );
    expect(rows.map((row) => [row.title, row.note, row.source])).toEqual([
      ["Jo‘natma omborga qaytdi", "Qaytish qo‘lda tasdiqlandi", "system"],
      ["Jo‘natma omborga qaytdi", "Yandex · returned_finish", "system"],
      ["Yetkazib bo‘lmadi", "Yandex · returning · recipient_unreachable", "yandex"],
      ["Kuryerga topshirildi", "Polling · mijozga push yuborildi", "yandex"],
      ["Kuryer chaqirildi", "Yandex · buyurtma c1", "system"],
      ["Kuryer chaqirilmadi", "Yandex · performer_not_found", "system"],
    ]);
  });

  it("names the carrier a cancellation cancelled, and keeps BTS orders' texts", () => {
    const cancelled = event(9, "cancelled", {
      reason: "admin",
      note: "",
      refund_id: null,
      cashback_reversed: false,
      stock_released: true,
      bts_cancelled: true,
      push_sent: true,
    });
    expect(foldOrderHistory([cancelled], "delivery", "yandex")[0]?.note).toContain(
      "Yandex buyurtmasi bekor qilindi",
    );
    expect(foldOrderHistory([cancelled], "delivery", "bts")[0]?.note).toContain(
      "BTS buyurtmasi bekor qilindi",
    );
    const created = event(2, "shipment_created", {
      tracking_number: "48213907",
      tariff: 1,
      manual: false,
    });
    expect(foldOrderHistory([created], "delivery")[0]?.title).toBe("BTS buyurtmasi yaratildi");
  });

  it("passes the order's carrier to the history of the detail", () => {
    const order = mapOrder({
      ...order10248,
      delivery: YANDEX,
      history: [event(2, "shipment_created", { tracking_number: "c9", tariff: 1, manual: false })],
    });
    expect(order.history[0]?.title).toBe("Kuryer chaqirildi");
    expect(order.delivery?.provider).toBe("yandex");
  });

  it("sends the carrier filters to orders/ and status-counts/", () => {
    expect(
      orderFilterParams({
        period: "all",
        provider: "yandex",
        stage: "returning",
        attention: "urgent",
      }),
    ).toMatchObject({ provider: "yandex", stage: "returning", attention: "urgent", period: "all" });
  });
});

describe("dashboard fulfilment and yandex_failing", () => {
  const base = {
    range: "today",
    from: "2026-11-15",
    to: "2026-11-15",
    bucket: "hour",
    buckets: [],
    previous_period_orders: 0,
    stats: {
      orders: 0,
      revenue: 0,
      new_customers: 0,
      total_customers: 0,
      deleted_customers: 0,
      out_of_stock: 0,
    },
    attention: {
      bts_failed: 0,
      pending_appointments: 0,
      next_appointment_at: null,
      new_from_billz: 0,
      refunds_needing_action: 0,
      bts_polling_failing: false,
      cashback_policy_missing: false,
      yandex_failing: true,
    },
    fulfilment: {
      paid_to_prepare: 4,
      to_hand_to_courier: 2,
      in_delivery: 7,
      returning: 1,
      completed_today: 12,
      needs_action: 3,
      urgent: 1,
    },
    generated_at: "2026-11-15T12:00:00+05:00",
  } satisfies ApiDashboard;

  it("maps the counters and the attention flag", () => {
    const data = mapDashboard(base);
    expect(data.attention.yandexFailing).toBe(true);
    expect(data.fulfilment).toEqual({
      paidToPrepare: 4,
      toHandToCourier: 2,
      inDelivery: 7,
      returning: 1,
      completedToday: 12,
      needsAction: 3,
      urgent: 1,
    });
  });

  it("degrades an answer from before Yandex Delivery to no tiles and no item", () => {
    const old: Record<string, unknown> = { ...base, attention: { ...base.attention } };
    delete old.fulfilment;
    delete (old.attention as Record<string, unknown>).yandex_failing;
    const data = mapDashboard(old as unknown as ApiDashboard);
    expect(data.fulfilment).toBeNull();
    expect(data.attention.yandexFailing).toBe(false);
    expect(mapFulfilment(undefined)).toBeNull();
  });
});

const ISSUE: ApiDeliveryIssue = {
  id: 41,
  order_id: 10240,
  kind: "return_pending",
  code: "warehouse_closed",
  urgent: true,
  details: { claim_number: 1, offer_price: 32_000 },
  note: "",
  state: "open",
  opened_at: "2026-11-15T19:10:00+05:00",
  updated_at: "2026-11-15T19:10:00+05:00",
  reminded_at: "2026-11-15T19:40:00+05:00",
  reminders: 1,
  resolved_at: null,
  resolved_by: null,
  resolution_note: "",
};

describe("delivery issues, alerts and the dispatch switch", () => {
  it("maps a queue row", () => {
    expect(mapDeliveryIssue(ISSUE)).toEqual({
      id: 41,
      orderId: 10240,
      kind: "return_pending",
      code: "warehouse_closed",
      urgent: true,
      details: { claim_number: 1, offer_price: 32_000 },
      note: "",
      state: "open",
      openedAt: "2026-11-15T19:10:00+05:00",
      updatedAt: "2026-11-15T19:10:00+05:00",
      remindedAt: "2026-11-15T19:40:00+05:00",
      reminders: 1,
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: "",
    });
    const resolved = mapDeliveryIssue({
      ...ISSUE,
      state: "resolved",
      details: ["not", "an", "object"],
      resolved_by: { id: 3, display_name: "" },
      resolution_note: "Qayta yetkazildi",
    });
    expect(resolved).toMatchObject({
      state: "resolved",
      details: {},
      resolvedBy: { id: "3", name: "#3" },
      resolutionNote: "Qayta yetkazildi",
    });
  });

  it("sends the queue filters as the API names them", () => {
    expect(
      issueListParams({
        state: "open",
        urgent: false,
        kind: "incident",
        order: 7,
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({ state: "open", urgent: false, kind: "incident", order: 7, page: 2, page_size: 50 });
    expect(URGENT_ALERT_PARAMS).toEqual({ state: "open", urgent: true, page_size: 50 });
  });

  it("keeps only open urgent rows of a known kind for the poll", () => {
    const page: ApiPaginatedDeliveryIssues = {
      count: 4,
      page: 1,
      page_size: 50,
      page_count: 1,
      results: [
        ISSUE,
        { ...ISSUE, id: 42, urgent: false },
        { ...ISSUE, id: 43, state: "resolved" },
        { ...ISSUE, id: 44, kind: "brand_new" as never },
      ],
    };
    expect(mapIssueAlerts(5, page)).toEqual({
      open: 5,
      urgent: [
        {
          id: 41,
          orderId: 10240,
          kind: "return_pending",
          code: "warehouse_closed",
          openedAt: "2026-11-15T19:10:00+05:00",
        },
      ],
    });
    expect(mapIssueAlerts(-1, { ...page, results: [] }).open).toBe(0);
  });

  it("maps the switch and builds its body (until only while suspending)", () => {
    expect(
      mapSuspension({
        suspended: true,
        until: "2026-11-16T09:00:00+05:00",
        note: "Inventarizatsiya",
        updated_at: "2026-11-15T18:00:00+05:00",
      }),
    ).toEqual({
      suspended: true,
      until: "2026-11-16T09:00:00+05:00",
      note: "Inventarizatsiya",
      updatedAt: "2026-11-15T18:00:00+05:00",
    });
    expect(
      suspensionBody({ suspended: true, until: "2026-11-16T09:00:00+05:00", note: " x " }),
    ).toEqual({
      suspended: true,
      until: "2026-11-16T09:00:00+05:00",
      note: "x",
    });
    expect(suspensionBody({ suspended: true, until: "", note: "" })).toEqual({
      suspended: true,
      until: null,
      note: "",
    });
    expect(suspensionBody({ suspended: false, until: "2026-11-16T09:00:00+05:00" })).toEqual({
      suspended: false,
      note: "",
    });
  });
});
