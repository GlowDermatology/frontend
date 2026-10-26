import { describe, expect, it } from "vitest";

import { customBucket, rangeDays, validateCustomRange } from "./dashboard";
import { orderActions, shipmentPending, type Shipment } from "./order";
import { refundOperations } from "./payment";

/**
 * Rules the orders, payments and dashboard screens rely on in mock mode (the
 * API answers them itself in api mode): `available_actions` (§2.2), the
 * refund operations (§2.12) and the custom dashboard range (§2.10).
 */

const failed = (pending: boolean): Shipment => ({
  state: "failed",
  lastAttemptAt: "2026-10-24T10:09:00+05:00",
  attempts: 1,
  pending,
});

describe("orderActions (contract §2.2 available_actions)", () => {
  it("offers the manual transitions and cancel while the order is open", () => {
    expect(
      orderActions({
        status: "processing",
        fulfilment: "pickup",
        shipment: { state: "not_required" },
      }),
    ).toEqual({ transitions: ["delivered"], cancel: true, retryShipment: false });
    expect(
      orderActions({
        status: "handed_to_courier",
        fulfilment: "delivery",
        shipment: {
          state: "created",
          trackingNumber: "1",
          tariff: 1,
          updatedAt: "",
          via: "webhook",
        },
      }),
    ).toEqual({ transitions: ["delivered"], cancel: true, retryShipment: false });
    expect(
      orderActions({
        status: "delivered",
        fulfilment: "delivery",
        shipment: { state: "not_created" },
      }),
    ).toEqual({ transitions: [], cancel: false, retryShipment: false });
    expect(
      orderActions({
        status: "awaiting_payment",
        fulfilment: "delivery",
        shipment: { state: "not_created" },
      }),
    ).toEqual({ transitions: [], cancel: true, retryShipment: false });
  });

  it("offers a BTS retry only for a processing delivery whose create failed and is not in flight", () => {
    const base = { status: "processing" as const, fulfilment: "delivery" as const };
    expect(orderActions({ ...base, shipment: failed(false) }).retryShipment).toBe(true);
    expect(orderActions({ ...base, shipment: failed(true) }).retryShipment).toBe(false);
    expect(
      orderActions({ ...base, status: "cancelled", shipment: failed(false) }).retryShipment,
    ).toBe(false);
    expect(shipmentPending(failed(true))).toBe(true);
    expect(shipmentPending({ state: "not_created", pending: true })).toBe(true);
    expect(shipmentPending({ state: "not_required" })).toBe(false);
  });
});

describe("refundOperations (contract §2.12)", () => {
  it("retries a failed refund of a paid payment and resolves unknown or manual ones", () => {
    expect(refundOperations({ state: "failed" }, { status: "paid" })).toEqual({
      retry: true,
      resolve: false,
    });
    expect(refundOperations({ state: "failed" }, { status: "refunded" }).retry).toBe(false);
    expect(refundOperations({ state: "manual_required" }, { status: "paid" })).toEqual({
      retry: false,
      resolve: true,
    });
    expect(refundOperations({ state: "unknown" }, { status: "paid" }).resolve).toBe(true);
    expect(refundOperations({ state: "requested" }, { status: "paid" })).toEqual({
      retry: false,
      resolve: false,
    });
    expect(refundOperations({ state: "succeeded" }, { status: "refunded" }).resolve).toBe(false);
  });
});

describe("validateCustomRange (contract §2.10)", () => {
  const today = "2026-10-26";

  it("answers like the backend, in its order", () => {
    expect(validateCustomRange(undefined, "2026-10-20", today)).toEqual({
      from: "Majburiy maydon.",
    });
    expect(validateCustomRange("2026-10-20", undefined, today)).toEqual({ to: "Majburiy maydon." });
    expect(validateCustomRange("2026-10-25", "2026-10-20", today)).toEqual({
      from: "Noto‘g‘ri qiymat.",
    });
    expect(validateCustomRange("2026-10-25", "2026-10-27", today)).toEqual({
      to: "Noto‘g‘ri qiymat.",
    });
    expect(validateCustomRange("2025-10-25", "2026-10-26", today)).toEqual({
      to: "Noto‘g‘ri qiymat.",
    });
    expect(validateCustomRange("2026-02-30", "2026-10-26", today)).toEqual({
      from: "Noto‘g‘ri qiymat.",
    });
  });

  it("accepts 366 days and a single day, with hour buckets up to two days", () => {
    expect(validateCustomRange("2025-10-26", "2026-10-26", today)).toEqual({});
    expect(rangeDays("2025-10-26", "2026-10-26")).toBe(366);
    expect(validateCustomRange(today, today, today)).toEqual({});
    expect(customBucket("2026-10-25", "2026-10-26")).toBe("hour");
    expect(customBucket("2026-10-24", "2026-10-26")).toBe("day");
  });
});
