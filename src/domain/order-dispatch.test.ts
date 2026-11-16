import { describe, expect, it } from "vitest";

import type { DeliveryIssue } from "./delivery-issue";
import type { DeliveryIssueRef, OrderDelivery } from "./order";
import {
  approvableOffer,
  DISPATCH_POLL_INTERVAL_MS,
  DISPATCH_POLL_WINDOW_MS,
  dispatchInput,
  dispatchPhase,
  dispatchReviewOf,
  initialWeightText,
  methodChoice,
  parseParcelWeight,
  pollProgressLabel,
  reviewReasonLabel,
} from "./order-dispatch";

const delivery = (patch: Partial<OrderDelivery> = {}): OrderDelivery => ({
  provider: "yandex",
  method: "standard",
  stage: "awaiting_dispatch",
  promisedFrom: null,
  promisedTo: null,
  quoteFee: 22_000,
  carrierPrice: 19_000,
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

const issueRef = (kind: DeliveryIssueRef["kind"], code = "x"): DeliveryIssueRef => ({
  id: 1,
  kind,
  code,
  urgent: false,
  openedAt: "2026-11-15T10:00:00+05:00",
});

const reviewIssue = (details: Record<string, unknown>, patch: Partial<DeliveryIssue> = {}) =>
  ({
    id: 77,
    orderId: 10240,
    kind: "dispatch_review",
    code: "increase_over_limit",
    urgent: false,
    details,
    note: "",
    state: "open",
    openedAt: "2026-11-15T10:00:00+05:00",
    updatedAt: "2026-11-15T10:00:00+05:00",
    remindedAt: null,
    reminders: 0,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: "",
    ...patch,
  }) satisfies DeliveryIssue;

describe("parseParcelWeight (DispatchRequest.weight_g 1..20000)", () => {
  it("accepts whole grams, with spaces as staff type them", () => {
    expect(parseParcelWeight("650")).toEqual({ ok: true, grams: 650 });
    expect(parseParcelWeight(" 1 250 ")).toEqual({ ok: true, grams: 1250 });
    expect(parseParcelWeight("20 000")).toEqual({ ok: true, grams: 20_000 });
    expect(parseParcelWeight("1")).toEqual({ ok: true, grams: 1 });
  });

  it("refuses empty, fractional, signed and out-of-range values with Uzbek messages", () => {
    expect(parseParcelWeight("")).toEqual({ ok: false, message: "Og‘irlikni kiriting." });
    expect(parseParcelWeight("0,5")).toMatchObject({
      ok: false,
      message: "Grammda butun son kiriting.",
    });
    expect(parseParcelWeight("-3")).toMatchObject({ ok: false });
    expect(parseParcelWeight("1e3")).toMatchObject({ ok: false });
    expect(parseParcelWeight("0")).toEqual({ ok: false, message: "Kamida 1 g bo‘lsin." });
    expect(parseParcelWeight("20001")).toEqual({ ok: false, message: "20 000 g dan oshmasin." });
  });

  it("prefills the server's weight only when it is a valid one", () => {
    expect(initialWeightText({ delivery: delivery({ parcelWeightG: 850 }) })).toBe("850");
    expect(initialWeightText({ delivery: delivery() })).toBe("");
    expect(initialWeightText({ delivery: delivery({ parcelWeightG: 0 }) })).toBe("");
    expect(initialWeightText({ delivery: null })).toBe("");
  });
});

describe("dispatchReviewOf (the server's review amounts)", () => {
  it("reads the amounts the dispatch handler writes, never computing one", () => {
    const review = dispatchReviewOf(
      reviewIssue({
        order_id: 10240,
        claim_number: 2,
        offer_price: 44_500,
        estimate_price: 29_500,
        paid_fee: 34_000,
        approved_price: null,
        increase: 15_000,
        loss: 10_500,
        warnings: ["price_changed", 3, ""],
      }),
    );
    expect(review).toEqual({
      issueId: 77,
      code: "increase_over_limit",
      claimNumber: 2,
      offerPrice: 44_500,
      estimatePrice: 29_500,
      paidFee: 34_000,
      approvedPrice: null,
      increase: 15_000,
      loss: 10_500,
      warnings: ["price_changed"],
    });
    expect(approvableOffer(review)).toBe(44_500);
  });

  it("ignores odd values and anything but an open dispatch_review", () => {
    const odd = dispatchReviewOf(reviewIssue({ offer_price: "44500", loss: -1, increase: 1.5 }));
    expect(odd).toMatchObject({ offerPrice: null, loss: null, increase: null, warnings: [] });
    expect(approvableOffer(odd)).toBeNull();
    expect(dispatchReviewOf(reviewIssue({ offer_price: 1 }, { state: "resolved" }))).toBeNull();
    expect(
      dispatchReviewOf(reviewIssue({ offer_price: 1 }, { kind: "dispatch_failed" })),
    ).toBeNull();
    expect(dispatchReviewOf(null)).toBeNull();
  });

  it("names the exceeded limit, an unknown code by itself", () => {
    expect(reviewReasonLabel("increase_over_limit")).toContain("chegaradan");
    expect(reviewReasonLabel("loss_over_limit")).toContain("zarar");
    expect(reviewReasonLabel("offer_missing")).toContain("yubormadi");
    expect(reviewReasonLabel("brand_new")).toContain("brand_new");
  });
});

describe("methodChoice (only when the server points to a switch)", () => {
  it("offers no choice for a plain dispatch", () => {
    expect(
      methodChoice({ current: "standard", review: false, tooHeavy: false, disabled: [] }),
    ).toBeNull();
  });

  it("offers the other method during a price review or after too_heavy", () => {
    expect(
      methodChoice({ current: "standard", review: true, tooHeavy: false, disabled: [] }),
    ).toEqual(["standard", "express"]);
    expect(
      methodChoice({ current: "express", review: false, tooHeavy: true, disabled: [] }),
    ).toEqual(["express", "standard"]);
  });

  it("drops a method the server refused as disabled, and needs a known current method", () => {
    expect(
      methodChoice({ current: "standard", review: true, tooHeavy: false, disabled: ["express"] }),
    ).toBeNull();
    expect(methodChoice({ current: null, review: true, tooHeavy: true, disabled: [] })).toBeNull();
  });
});

describe("dispatchInput", () => {
  it("sends the approval with the same method, the switch without it", () => {
    expect(
      dispatchInput({ weightG: 650, current: "standard", method: "standard", approve: null }),
    ).toEqual({ contentsVerified: true, weightG: 650 });
    expect(
      dispatchInput({ weightG: 650, current: "standard", method: "standard", approve: 44_500 }),
    ).toEqual({ contentsVerified: true, weightG: 650, approvedPrice: 44_500 });
    expect(
      dispatchInput({ weightG: 650, current: "standard", method: "express", approve: 44_500 }),
    ).toEqual({ contentsVerified: true, weightG: 650, method: "express" });
  });
});

describe("dispatchPhase (the poll's stop rule)", () => {
  it("keeps polling only while Yandex searches without a dispatch issue", () => {
    expect(dispatchPhase({ delivery: delivery({ stage: "courier_requested" }) })).toEqual({
      kind: "searching",
    });
    expect(dispatchPhase({ delivery: delivery({ stage: "courier_assigned" }) })).toEqual({
      kind: "moved",
      stage: "courier_assigned",
    });
    expect(dispatchPhase({ delivery: delivery({ stage: "cancelled" }) })).toEqual({
      kind: "moved",
      stage: "cancelled",
    });
  });

  it("stops on a failure or any dispatch issue, whatever the stage", () => {
    expect(
      dispatchPhase({
        delivery: delivery({ stage: "failed", failureCode: "performer_not_found" }),
      }),
    ).toEqual({ kind: "issue", issueKind: null, code: "performer_not_found" });
    expect(
      dispatchPhase({
        delivery: delivery({
          stage: "awaiting_dispatch",
          openIssues: [issueRef("dispatch_review", "loss_over_limit")],
        }),
      }),
    ).toEqual({ kind: "issue", issueKind: "dispatch_review", code: "loss_over_limit" });
    expect(
      dispatchPhase({
        delivery: delivery({
          stage: "courier_requested",
          openIssues: [issueRef("dispatch_unknown", "accept_unconfirmed")],
        }),
      }),
    ).toMatchObject({ kind: "issue", issueKind: "dispatch_unknown" });
    // An incident does not end a courier search.
    expect(
      dispatchPhase({
        delivery: delivery({ stage: "courier_requested", openIssues: [issueRef("incident")] }),
      }),
    ).toEqual({ kind: "searching" });
  });

  it("shows the poll's time out of its 3-minute window", () => {
    expect(DISPATCH_POLL_WINDOW_MS / DISPATCH_POLL_INTERVAL_MS).toBe(18);
    expect(pollProgressLabel(0)).toBe("0:00 / 3:00");
    expect(pollProgressLabel(40_000)).toBe("0:40 / 3:00");
    expect(pollProgressLabel(400_000)).toBe("3:00 / 3:00");
  });
});
