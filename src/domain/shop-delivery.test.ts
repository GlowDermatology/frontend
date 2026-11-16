import { describe, expect, it } from "vitest";

import {
  DELIVERY_REFRESH_MS,
  choiceKey,
  courierShown,
  etaShown,
  findOption,
  isDeliveryConflict,
  offeredFulfilments,
  quoteExpiredAt,
  REQUOTE_GRACE_MS,
  refreshDue,
  requoteAt,
  sameChoice,
  shouldRefreshDelivery,
  type ShipmentStage,
  type ShopDeliveryOption,
  type ShopOrderDelivery,
} from "./shop-delivery";

const yandex = (stage: ShipmentStage | null): ShopOrderDelivery => ({
  provider: "yandex",
  method: "express",
  methodLabel: "Ekspress",
  stage,
  stageLabel: stage,
  etaFrom: "2026-11-15T11:30:00+05:00",
  etaTo: "2026-11-15T12:30:00+05:00",
  courierName: "Akmal",
  courierVehicle: "Cobalt",
  trackingUrl: null,
});

describe("choices", () => {
  it("keys and compares a carrier with its method", () => {
    expect(choiceKey({ provider: "yandex", method: "express" })).toBe("yandex:express");
    expect(choiceKey({ provider: "bts", method: null })).toBe("bts");
    expect(
      sameChoice(
        { provider: "yandex", method: "standard" },
        { provider: "yandex", method: "standard" },
      ),
    ).toBe(true);
    expect(
      sameChoice(
        { provider: "yandex", method: "standard" },
        { provider: "yandex", method: "express" },
      ),
    ).toBe(false);
    expect(sameChoice(null, null)).toBe(true);
    expect(sameChoice(null, { provider: "bts", method: null })).toBe(false);
  });

  it("finds the option of a choice", () => {
    const options = [
      { provider: "yandex", method: "standard", label: "S" },
      { provider: "bts", method: null, label: "B" },
    ] as ShopDeliveryOption[];
    expect(findOption(options, { provider: "bts", method: null })?.label).toBe("B");
    expect(findOption(options, { provider: "yandex", method: "express" })).toBeNull();
    expect(findOption(options, null)).toBeNull();
  });

  it("recognises a mapped delivery conflict only", () => {
    expect(
      isDeliveryConflict({
        kind: "delivery",
        options: null,
        quoteId: null,
        deliveryFee: null,
        total: null,
      }),
    ).toBe(true);
    expect(isDeliveryConflict({ order_id: 5 })).toBe(false);
    expect(isDeliveryConflict(null)).toBe(false);
  });
});

describe("offeredFulfilments", () => {
  it("offers delivery when only Yandex delivers (fulfilment_methods keeps meaning BTS)", () => {
    expect(offeredFulfilments(["pickup"], ["yandex"])).toEqual(["delivery", "pickup"]);
    expect(offeredFulfilments(["delivery", "pickup"], ["yandex", "bts"])).toEqual([
      "delivery",
      "pickup",
    ]);
    expect(offeredFulfilments(["pickup"], [])).toEqual(["pickup"]);
    expect(offeredFulfilments(["delivery", "pickup"], [])).toEqual(["delivery", "pickup"]);
  });
});

describe("quote freshness", () => {
  const quote = {
    quotedAt: "2026-11-15T12:00:00+05:00",
    quoteExpiresAt: "2026-11-15T12:15:00+05:00",
  };
  const received = Date.parse("2026-11-15T12:00:01+05:00");

  it("asks again just after the quote runs out, on the server's clock", () => {
    expect(requoteAt(quote, received)).toBe(received + 15 * 60_000 + REQUOTE_GRACE_MS);
    // A device clock an hour fast or slow changes nothing: the lifetime is the server's.
    const skewed = received + 3_600_000;
    expect(requoteAt(quote, skewed)).toBe(skewed + 15 * 60_000 + REQUOTE_GRACE_MS);
    // A reused quote answered later has less time left.
    expect(requoteAt({ ...quote, quotedAt: "2026-11-15T12:14:00+05:00" }, received)).toBe(
      received + 60_000 + REQUOTE_GRACE_MS,
    );
  });

  it("falls back to the device clock without quoted_at", () => {
    expect(requoteAt({ ...quote, quotedAt: null }, received)).toBe(
      Date.parse(quote.quoteExpiresAt) + REQUOTE_GRACE_MS,
    );
  });

  it("never expires a quote without a stamp (BTS, pickup) or with an unreadable one", () => {
    expect(requoteAt({ ...quote, quoteExpiresAt: null }, received)).toBeNull();
    expect(requoteAt({ ...quote, quoteExpiresAt: "soon" }, received)).toBeNull();
    expect(quoteExpiredAt(null, received)).toBe(false);
  });

  it("calls a quote expired from its expiry on", () => {
    const deadline = requoteAt(quote, received)!;
    expect(quoteExpiredAt(deadline, deadline - REQUOTE_GRACE_MS - 1)).toBe(false);
    expect(quoteExpiredAt(deadline, deadline - REQUOTE_GRACE_MS)).toBe(true);
  });
});

describe("shouldRefreshDelivery (the 30 s order page refresh)", () => {
  it("refreshes a paid Yandex order while its parcel is under way", () => {
    for (const stage of [
      "awaiting_dispatch",
      "courier_requested",
      "courier_assigned",
      "courier_arrived",
      "in_transit",
      "at_destination",
      "returning",
      "failed",
    ] as const) {
      expect(shouldRefreshDelivery({ status: "handed_to_courier", delivery: yandex(stage) })).toBe(
        true,
      );
    }
    expect(
      shouldRefreshDelivery({ status: "processing", delivery: yandex("courier_requested") }),
    ).toBe(true);
  });

  it("stops once the parcel is delivered, cancelled or returned", () => {
    for (const stage of ["delivered", "cancelled", "returned"] as const) {
      expect(shouldRefreshDelivery({ status: "handed_to_courier", delivery: yandex(stage) })).toBe(
        false,
      );
    }
  });

  it("stops for a finished or unpaid order, BTS, pickup and an unknown stage", () => {
    expect(shouldRefreshDelivery({ status: "delivered", delivery: yandex("in_transit") })).toBe(
      false,
    );
    expect(shouldRefreshDelivery({ status: "cancelled", delivery: yandex("returning") })).toBe(
      false,
    );
    expect(
      shouldRefreshDelivery({ status: "awaiting_payment", delivery: yandex("awaiting_dispatch") }),
    ).toBe(false);
    expect(
      shouldRefreshDelivery({
        status: "processing",
        delivery: { ...yandex(null), provider: "bts" },
      }),
    ).toBe(false);
    expect(shouldRefreshDelivery({ status: "processing", delivery: null })).toBe(false);
    expect(shouldRefreshDelivery({ status: "processing", delivery: yandex(null) })).toBe(false);
  });

  it("refreshes on the beat, and on return only after a missed beat", () => {
    expect(refreshDue(0, DELIVERY_REFRESH_MS)).toBe(true);
    expect(refreshDue(1_000, DELIVERY_REFRESH_MS)).toBe(false);
  });
});

describe("courier and window", () => {
  it("shows the courier only while one is on the job", () => {
    expect(courierShown(yandex("courier_assigned"))).toBe(true);
    expect(courierShown(yandex("in_transit"))).toBe(true);
    expect(courierShown(yandex("courier_requested"))).toBe(false);
    expect(courierShown(yandex("delivered"))).toBe(false);
    expect(courierShown({ ...yandex("in_transit"), courierName: null, courierVehicle: null })).toBe(
      false,
    );
  });

  it("hides the promised window once the journey ended or turned back", () => {
    expect(etaShown(yandex("in_transit"))).toBe(true);
    expect(etaShown(yandex(null))).toBe(true);
    expect(etaShown(yandex("returning"))).toBe(false);
    expect(etaShown(yandex("delivered"))).toBe(false);
    expect(etaShown({ ...yandex("in_transit"), etaFrom: null, etaTo: null })).toBe(false);
  });
});
