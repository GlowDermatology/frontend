import { describe, expect, it } from "vitest";

import type { ShopProgressStep } from "@/domain/shop-account";

import { deriveProgress, paymentLabel } from "./progress";

const step = (name: string, state: ShopProgressStep["state"] = "upcoming"): ShopProgressStep => ({
  step: name,
  label: name,
  state,
  at: null,
});

const delivery = [step("placed"), step("paid"), step("with_courier"), step("delivered")];
const event = (type: string) => ({
  type,
  at: "2026-10-28T10:00:00+05:00",
  title: type,
  subtitle: null,
});

describe("deriveProgress", () => {
  it("follows the status of an open order", () => {
    const states = deriveProgress({
      status: "processing",
      fulfilment: "delivery",
      progress: delivery,
      timeline: [event("payment_confirmed"), event("order_created")],
    }).map((s) => s.state);
    expect(states).toEqual(["done", "done", "current", "upcoming"]);
  });

  it("agrees with the timeline even when the API's progress lags", () => {
    const states = deriveProgress({
      status: "processing",
      fulfilment: "delivery",
      progress: [
        step("placed", "done"),
        step("paid", "current"),
        step("with_courier"),
        step("delivered"),
      ],
      timeline: [event("handed_to_courier"), event("payment_confirmed")],
    }).map((s) => s.state);
    expect(states).toEqual(["done", "done", "done", "current"]);
  });

  it("does not pass the courier step of a Yandex order when a courier was only requested", () => {
    const yandex = {
      status: "processing" as const,
      fulfilment: "delivery" as const,
      progress: delivery,
      timeline: [event("shipment_created"), event("payment_confirmed")],
    };
    const courierRequested = deriveProgress({
      ...yandex,
      delivery: {
        provider: "yandex",
        method: "standard",
        methodLabel: "Standart",
        stage: "courier_requested",
        stageLabel: "Kuryer qidirilmoqda",
        etaFrom: null,
        etaTo: null,
        courierName: null,
        courierVehicle: null,
        trackingUrl: null,
      },
    }).map((s) => s.state);
    expect(courierRequested).toEqual(["done", "done", "current", "upcoming"]);
    // BTS keeps reading a created parcel as handed over.
    expect(deriveProgress(yandex).map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
  });

  it("skips what a cancelled order never reached and ends with the cancellation", () => {
    const steps = deriveProgress({
      status: "cancelled",
      fulfilment: "pickup",
      progress: [step("placed"), step("paid"), step("picked_up"), step("cancelled", "done")],
      timeline: [event("cancelled"), event("order_created")],
    });
    expect(steps.map((s) => `${s.step}:${s.state}`)).toEqual([
      "placed:done",
      "paid:skipped",
      "picked_up:skipped",
      "cancelled:done",
    ]);
  });
});

describe("paymentLabel", () => {
  it("never says the payment failed for an order cancelled before paying", () => {
    const labels = { unpaid: "To‘lanmagan" };
    expect(
      paymentLabel(
        { status: "cancelled", payment: { status: "failed", statusLabel: "To‘lov o‘tmadi" } },
        labels,
      ),
    ).toBe("To‘lanmagan");
    expect(
      paymentLabel(
        { status: "cancelled", payment: { status: "refunded", statusLabel: "Qaytarildi" } },
        labels,
      ),
    ).toBe("Qaytarildi");
    expect(
      paymentLabel(
        { status: "processing", payment: { status: "paid", statusLabel: "To‘langan" } },
        labels,
      ),
    ).toBe("To‘langan");
  });
});
