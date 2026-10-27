import { describe, expect, it } from "vitest";

import { customBucket, rangeDays, validateCustomRange } from "./dashboard";
import {
  manualRefundNote,
  manualRefundReason,
  orderActions,
  refundManualReason,
  refundStateLine,
  REFUND_STATE_LABEL,
  shipmentPending,
  type Refund,
  type RefundState,
  type Shipment,
} from "./order";
import {
  canCloseFailedRefund,
  hasOpenRefund,
  OPEN_REFUND_STATES,
  refundNeedsAction,
  refundOperations,
} from "./payment";

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

describe("refundOperations (contract §2.12, §7 item 18)", () => {
  const refund = (
    id: number,
    state: RefundState,
    provider: Refund["provider"] = "payme",
  ): Refund => ({
    id,
    state,
    provider,
    amount: 185_000,
    requestedAt: "2026-10-24T12:00:00+05:00",
    updatedAt: "2026-10-24T12:00:00+05:00",
  });
  const paid = (...states: RefundState[]) => ({
    status: "paid" as const,
    refunds: states.map((state, i) => refund(states.length - i, state)),
  });
  const one = (state: RefundState) => refund(1, state);

  it("retries a failed refund of a paid payment and resolves unknown or manual ones", () => {
    expect(refundOperations(one("failed"), paid("failed"))).toEqual({
      retry: true,
      resolve: false,
      close: false,
    });
    expect(
      refundOperations(one("failed"), { status: "refunded", refunds: [refund(1, "failed")] }).retry,
    ).toBe(false);
    expect(refundOperations(one("manual_required"), paid("manual_required"))).toEqual({
      retry: false,
      resolve: true,
      close: false,
    });
    expect(refundOperations(one("unknown"), paid("unknown")).resolve).toBe(true);
    expect(refundOperations(one("requested"), paid("requested"))).toEqual({
      retry: false,
      resolve: false,
      close: false,
    });
    expect(refundOperations(one("succeeded"), { status: "refunded", refunds: [] }).resolve).toBe(
      false,
    );
  });

  it("offers no retry while another refund of the payment is open (409 conflict)", () => {
    // Payment 230 in api mode: #17 manual_required (newest), #16 failed.
    const payment = paid("manual_required", "failed");
    const [open, failed] = payment.refunds;
    expect(refundOperations(failed!, payment)).toEqual({
      retry: false,
      resolve: false,
      close: false,
    });
    expect(refundOperations(open!, payment)).toEqual({ retry: false, resolve: true, close: false });
    for (const state of OPEN_REFUND_STATES) {
      expect(hasOpenRefund(paid(state, "failed"))).toBe(true);
      expect(refundOperations(refund(1, "failed"), paid(state, "failed")).retry).toBe(false);
    }
    // Closed siblings (succeeded, failed) do not block it.
    expect(refundOperations(refund(2, "failed"), paid("failed", "failed")).retry).toBe(true);
    expect(hasOpenRefund(paid("failed", "succeeded"))).toBe(false);
  });

  it("closes only the newest failed Click refund of a paid payment with no open or settled sibling", () => {
    const click = (id: number, state: RefundState) => refund(id, state, "click");
    const failed = click(2, "failed");
    const payment = (...refunds: Refund[]) => ({ status: "paid" as const, refunds });
    expect(refundOperations(failed, payment(failed))).toEqual({
      retry: true,
      resolve: false,
      close: true,
    });
    expect(canCloseFailedRefund(failed, payment(failed, click(1, "failed")))).toBe(true);
    // Payme failures are retried, never closed by a Click status check.
    expect(canCloseFailedRefund(refund(2, "failed"), payment(refund(2, "failed")))).toBe(false);
    // Not the newest refund, a settled or open sibling, or no longer paid.
    expect(canCloseFailedRefund(failed, payment(click(3, "failed"), failed))).toBe(false);
    expect(canCloseFailedRefund(failed, payment(failed, click(1, "succeeded")))).toBe(false);
    expect(canCloseFailedRefund(failed, payment(failed, click(1, "unknown")))).toBe(false);
    expect(canCloseFailedRefund(failed, { status: "refunded", refunds: [failed] })).toBe(false);
    expect(canCloseFailedRefund(click(2, "unknown"), payment(click(2, "unknown")))).toBe(false);
  });
});

describe("refundNeedsAction (contract §2.10, §2.12, M2)", () => {
  const refund = (id: number, state: RefundState) => ({ id, state });
  it("leaves out a failed refund a later succeeded one superseded, or of a refunded payment", () => {
    const failed = refund(1, "failed");
    expect(refundNeedsAction(failed, { status: "paid", refunds: [failed] })).toBe(true);
    expect(
      refundNeedsAction(failed, {
        status: "paid",
        refunds: [refund(2, "succeeded"), failed],
      }),
    ).toBe(false);
    expect(refundNeedsAction(failed, { status: "refunded", refunds: [failed] })).toBe(false);
    // An earlier success does not supersede a later failure.
    const later = refund(3, "failed");
    expect(
      refundNeedsAction(later, { status: "paid", refunds: [later, refund(2, "succeeded")] }),
    ).toBe(true);
    for (const state of ["unknown", "manual_required"] as const) {
      expect(refundNeedsAction(refund(1, state), { status: "paid", refunds: [] })).toBe(true);
    }
    for (const state of ["requested", "submitting", "succeeded"] as const) {
      expect(refundNeedsAction(refund(1, state), { status: "paid", refunds: [] })).toBe(false);
    }
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

  it("picks a manual refund's line by manual_reason first, then by provider (M3)", () => {
    const manual = { state: "manual_required" as const };
    const PAYME = "Payme kabinetida qaytarish kerak";
    const CLICK = "Mijozga qo‘lda to‘lang, so‘ng «Qaytarildi» deb belgilang";
    expect(refundStateLine({ ...manual, provider: "payme", manualReason: "payme" })).toBe(PAYME);
    expect(refundStateLine({ ...manual, provider: "click", manualReason: "no_paydoc" })).toBe(
      CLICK,
    );
    expect(refundStateLine({ ...manual, provider: "click", manualReason: "fake_mode" })).toBe(
      CLICK,
    );
    // A Click reason is never worded as Payme, whatever the provider says.
    expect(refundStateLine({ ...manual, provider: "payme", manualReason: "no_paydoc" })).toBe(
      CLICK,
    );
    // Without a reason the provider decides (rows written before the field).
    expect(refundStateLine({ ...manual, provider: "payme" })).toBe(PAYME);
    expect(refundStateLine({ ...manual, provider: "click" })).toBe(CLICK);
    // The reason stays after the refund settled; the line follows the state.
    expect(
      refundStateLine({ state: "succeeded", provider: "click", manualReason: "no_paydoc" }),
    ).toBe("Qaytarildi");
  });

  it("notes why a manual Click refund is paid by hand, and nothing else", () => {
    expect(manualRefundNote({ state: "manual_required", manualReason: "no_paydoc" })).toBe(
      "Click to‘lov raqami yo‘q · qo‘lda to‘lanadi",
    );
    expect(manualRefundNote({ state: "manual_required", manualReason: "fake_mode" })).toBe(
      "Click sinov rejimida · qo‘lda to‘lanadi",
    );
    // Payme's line already names the cabinet; a settled or reason-less refund has no note.
    expect(manualRefundNote({ state: "manual_required", manualReason: "payme" })).toBeNull();
    expect(manualRefundNote({ state: "manual_required" })).toBeNull();
    expect(manualRefundNote({ state: "succeeded", manualReason: "no_paydoc" })).toBeNull();
  });

  it("reads Refund.manual_reason strictly: null and unknown values are no reason", () => {
    expect(refundManualReason("payme")).toBe("payme");
    expect(refundManualReason("no_paydoc")).toBe("no_paydoc");
    expect(refundManualReason("fake_mode")).toBe("fake_mode");
    expect(refundManualReason(null)).toBeUndefined();
    expect(refundManualReason(undefined)).toBeUndefined();
    expect(refundManualReason("later_reason")).toBeUndefined();
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
