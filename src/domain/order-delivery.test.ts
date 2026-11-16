import { describe, expect, it } from "vitest";

import { issueDetailLines } from "./delivery-issue";
import {
  carrierLabel,
  issueKindLabel,
  orderActions,
  urgentIssues,
  type OrderDelivery,
  type Shipment,
} from "./order";

const yandex = (patch: Partial<OrderDelivery> = {}): OrderDelivery => ({
  provider: "yandex",
  method: "express",
  stage: "awaiting_dispatch",
  promisedFrom: null,
  promisedTo: null,
  quoteFee: null,
  carrierPrice: null,
  offerPrice: null,
  approvedPrice: null,
  carrierCostTotal: null,
  costDifference: null,
  parcelWeightG: null,
  preparedAt: null,
  courierName: null,
  courierVehicle: null,
  trackingUrl: null,
  claimStatus: null,
  claimNumber: null,
  failureCode: null,
  openIssues: [],
  ...patch,
});

const notCreated: Shipment = { state: "not_created" };

describe("carrierLabel", () => {
  it("names Yandex Standard/Express, BTS and pickup", () => {
    expect(carrierLabel({ fulfilment: "delivery", delivery: yandex() })).toBe("Yandex Express");
    expect(carrierLabel({ fulfilment: "delivery", delivery: yandex({ method: "standard" }) })).toBe(
      "Yandex Standard",
    );
    expect(carrierLabel({ fulfilment: "delivery", delivery: yandex({ method: null }) })).toBe(
      "Yandex",
    );
    expect(
      carrierLabel({ fulfilment: "delivery", delivery: { ...yandex(), provider: "bts" } }),
    ).toBe("BTS");
    // An API before Yandex Delivery: every delivery is BTS.
    expect(carrierLabel({ fulfilment: "delivery" })).toBe("BTS");
    expect(carrierLabel({ fulfilment: "pickup", delivery: null })).toBe("Olib ketish");
  });
});

describe("orderActions for a Yandex order (demo rules)", () => {
  it("has no manual transitions or BTS retry; dispatch while it waits for a courier", () => {
    expect(
      orderActions({
        status: "processing",
        fulfilment: "delivery",
        shipment: notCreated,
        delivery: yandex(),
      }),
    ).toEqual({
      transitions: [],
      cancel: true,
      retryShipment: false,
      dispatch: true,
      confirmReturn: false,
    });
  });

  it("keeps dispatch away from an open courier claim; cancel is carrier-aware (server side)", () => {
    const busy = orderActions({
      status: "processing",
      fulfilment: "delivery",
      shipment: notCreated,
      delivery: yandex({ stage: "courier_assigned" }),
    });
    expect(busy).toMatchObject({ cancel: true, dispatch: false, confirmReturn: false });
    const returned = orderActions({
      status: "handed_to_courier",
      fulfilment: "delivery",
      shipment: notCreated,
      delivery: yandex({ stage: "returned" }),
    });
    expect(returned).toMatchObject({ cancel: true, dispatch: true, confirmReturn: true });
    const returning = orderActions({
      status: "handed_to_courier",
      fulfilment: "delivery",
      shipment: notCreated,
      delivery: yandex({ stage: "returning" }),
    });
    expect(returning).toMatchObject({ dispatch: false, confirmReturn: true });
    expect(
      orderActions({
        status: "delivered",
        fulfilment: "delivery",
        shipment: notCreated,
        delivery: yandex({ stage: "delivered" }),
      }),
    ).toMatchObject({ cancel: false, dispatch: false, confirmReturn: false });
  });

  it("offers the manual «Yetkazildi» only while a parcel_unaccounted issue is open", () => {
    const unaccounted = yandex({
      stage: "in_transit",
      openIssues: [
        {
          id: 1,
          kind: "parcel_unaccounted",
          code: "cancelled_with_items_on_hands",
          urgent: true,
          openedAt: "2026-10-24T10:00:00+05:00",
        },
      ],
    });
    const base = { fulfilment: "delivery" as const, shipment: notCreated };
    expect(
      orderActions({ ...base, status: "handed_to_courier", delivery: unaccounted }).transitions,
    ).toEqual(["delivered"]);
    expect(
      orderActions({ ...base, status: "processing", delivery: unaccounted }).transitions,
    ).toEqual([]);
    expect(
      orderActions({
        ...base,
        status: "handed_to_courier",
        delivery: yandex({ stage: "in_transit" }),
      }).transitions,
    ).toEqual([]);
  });

  it("leaves BTS orders' actions as before (no dispatch key)", () => {
    const bts = orderActions({
      status: "processing",
      fulfilment: "delivery",
      shipment: { state: "failed", lastAttemptAt: "2026-10-24T10:09:00+05:00" },
      delivery: { ...yandex(), provider: "bts" },
    });
    expect(bts).toEqual({ transitions: ["handed_to_courier"], cancel: true, retryShipment: true });
  });
});

describe("issue labels and lines", () => {
  it("labels every kind, an unknown one by its code", () => {
    expect(issueKindLabel("return_pending")).toBe("Qaytish kutilmoqda");
    expect(issueKindLabel("brand_new")).toBe("brand_new");
    expect(
      urgentIssues(
        yandex({
          openIssues: [
            { id: 1, kind: "incident", code: "a", urgent: true, openedAt: "" },
            { id: 2, kind: "incident", code: "b", urgent: false, openedAt: "" },
          ],
        }),
      ).map((issue) => issue.id),
    ).toEqual([1]);
    expect(urgentIssues(null)).toEqual([]);
  });

  it("lists the details' scalars, money and grams marked for formatting", () => {
    expect(
      issueDetailLines({
        offer_price: 32_000,
        quote_fee: 30_000,
        weight_g: 850,
        carrier_status: "returning",
        claim_number: 2,
        nested: { a: 1 },
        empty: "",
        none: null,
      }),
    ).toEqual([
      { key: "offer_price", label: "Yandex taklifi", value: 32_000, kind: "money" },
      { key: "quote_fee", label: "Mijoz to‘lagan", value: 30_000, kind: "money" },
      { key: "weight_g", label: "Og‘irlik", value: 850, kind: "grams" },
      { key: "carrier_status", label: "Yandex holati", value: "returning", kind: "text" },
      { key: "claim_number", label: "Urinish", value: 2, kind: "text" },
    ]);
    expect(issueDetailLines(null)).toEqual([]);
    expect(issueDetailLines([1, 2])).toEqual([]);
  });
});
