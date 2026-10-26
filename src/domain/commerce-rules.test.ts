import { describe, expect, it } from "vitest";

import { customBucket, rangeDays, validateCustomRange } from "./dashboard";
import {
  manualRefundReason,
  orderActions,
  refundStateLine,
  REFUND_STATE_LABEL,
  shipmentPending,
  type Refund,
  type RefundState,
  type Shipment,
} from "./order";
import { hasOpenRefund, OPEN_REFUND_STATES, refundOperations } from "./payment";

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
  const refund = (id: number, state: RefundState): Refund => ({
    id,
    state,
    provider: "payme",
    amount: 185_000,
    requestedAt: "2026-10-24T12:00:00+05:00",
    updatedAt: "2026-10-24T12:00:00+05:00",
  });
  const paid = (...states: RefundState[]) => ({
    status: "paid" as const,
    refunds: states.map((state, i) => refund(states.length - i, state)),
  });

  it("retries a failed refund of a paid payment and resolves unknown or manual ones", () => {
    expect(refundOperations({ state: "failed" }, paid("failed"))).toEqual({
      retry: true,
      resolve: false,
    });
    expect(
      refundOperations({ state: "failed" }, { status: "refunded", refunds: [refund(1, "failed")] })
        .retry,
    ).toBe(false);
    expect(refundOperations({ state: "manual_required" }, paid("manual_required"))).toEqual({
      retry: false,
      resolve: true,
    });
    expect(refundOperations({ state: "unknown" }, paid("unknown")).resolve).toBe(true);
    expect(refundOperations({ state: "requested" }, paid("requested"))).toEqual({
      retry: false,
      resolve: false,
    });
    expect(
      refundOperations({ state: "succeeded" }, { status: "refunded", refunds: [] }).resolve,
    ).toBe(false);
  });

  it("offers no retry while another refund of the payment is open (409 conflict)", () => {
    // Payment 230 in api mode: #17 manual_required (newest), #16 failed.
    const payment = paid("manual_required", "failed");
    const [open, failed] = payment.refunds;
    expect(refundOperations(failed!, payment)).toEqual({ retry: false, resolve: false });
    expect(refundOperations(open!, payment)).toEqual({ retry: false, resolve: true });
    for (const state of OPEN_REFUND_STATES) {
      expect(hasOpenRefund(paid(state, "failed"))).toBe(true);
      expect(refundOperations({ state: "failed" }, paid(state, "failed")).retry).toBe(false);
    }
    // Closed siblings (succeeded, failed) do not block it.
    expect(refundOperations({ state: "failed" }, paid("failed", "failed")).retry).toBe(true);
    expect(hasOpenRefund(paid("failed", "succeeded"))).toBe(false);
  });
});

describe("refund state line (contract §5.1, §7 item 3, M2)", () => {
  it("chooses the line by state and provider: a manual Click refund is paid by hand", () => {
    expect(refundStateLine({ state: "manual_required", provider: "payme" })).toBe(
      "Payme kabinetida qaytarish kerak",
    );
    expect(refundStateLine({ state: "manual_required", provider: "click" })).toBe(
      "Mijozga qo‘lda to‘lang, so‘ng «Qaytarildi» deb belgilang",
    );
    expect(refundStateLine({ state: "requested", provider: "click" })).toBe("Qaytarish so‘raldi");
    expect(refundStateLine({ state: "submitting", provider: "click" })).toBe("Qaytarilmoqda");
    expect(refundStateLine({ state: "succeeded", provider: "payme" })).toBe("Qaytarildi");
    expect(refundStateLine({ state: "failed", provider: "click" })).toBe("Qaytarib bo‘lmadi");
    expect(refundStateLine({ state: "unknown", provider: "click" })).toBe(
      "Holat noma’lum · tekshiring",
    );
    // The filter and badge name never assumes Payme.
    expect(REFUND_STATE_LABEL.manual_required).not.toMatch(/Payme/);
  });

  it("reads manual_reason, an absent one (M1 rows) as Payme", () => {
    expect(manualRefundReason("no_paydoc")).toBe("no_paydoc");
    expect(manualRefundReason("fake_mode")).toBe("fake_mode");
    expect(manualRefundReason("payme")).toBe("payme");
    expect(manualRefundReason(undefined)).toBe("payme");
    expect(manualRefundReason(null)).toBe("payme");
    expect(manualRefundReason("later_reason")).toBeNull();
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
