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
