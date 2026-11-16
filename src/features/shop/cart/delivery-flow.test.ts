import { describe, expect, it } from "vitest";

import { deliveryConflictDetails } from "@/data/api/customer/delivery-mappers";
import { mapQuote } from "@/data/api/customer/account-mappers";
import {
  QUOTE_EXPRESS,
  QUOTE_STANDARD,
  btsAvailable,
  deliveryPriceChangedDetails,
  deliveryUnavailableDetails,
  expressQuote,
  optionsQuote,
  standardOption,
} from "@/data/mock/shop-delivery";
import type { ActionFailure } from "@/data/types";
import type { ShopQuote } from "@/domain/shop-account";

import {
  checkoutTerms,
  compareQuotes,
  conflictOptions,
  displayedChoice,
  optionProblem,
  outcomeNotice,
  placeable,
  readConflict,
  seenTerms,
  selectedChoice,
} from "./delivery-flow";

const standard = mapQuote(optionsQuote);
const express = mapQuote(expressQuote);
const bts = mapQuote({
  ...optionsQuote,
  delivery_fee: 25_000,
  expected_total: 337_000,
  provider: "bts",
  method: null,
  quote_id: null,
  quote_expires_at: null,
  options: [
    { ...standardOption, available: false, unavailable_reason: "out_of_zone" },
    btsAvailable,
  ],
});
const none: ShopQuote = {
  ...standard,
  provider: null,
  method: null,
  quoteId: null,
  quoteExpiresAt: null,
  options: standard.options.map((option) => ({
    ...option,
    available: false,
    unavailableReason: "provider_unavailable",
    fee: null,
    quoteId: null,
    expectedTotal: null,
  })),
};

const failure = (code: string, details: unknown): ActionFailure => ({
  ok: false,
  error: "Xabar",
  code,
  details: deliveryConflictDetails(code, details) ?? details,
});

describe("selection", () => {
  it("follows the server's selection (its default until the customer picks)", () => {
    expect(selectedChoice(standard)).toEqual({ provider: "yandex", method: "standard" });
    expect(selectedChoice(bts)).toEqual({ provider: "bts", method: null });
    expect(selectedChoice(null)).toBeNull();
    expect(selectedChoice({ ...standard, fulfilment: "pickup" })).toBeNull();
  });

  it("marks the customer's pick at once while its quote is on the way", () => {
    const pick = { provider: "yandex", method: "express" } as const;
    expect(displayedChoice(standard, pick, true)).toEqual(pick);
    // Answered: the server's selection wins (the pick, or its fallback).
    expect(displayedChoice(standard, pick, false)).toEqual({
      provider: "yandex",
      method: "standard",
    });
    // A refused option cannot be marked.
    expect(displayedChoice(bts, { provider: "yandex", method: "standard" }, true)).toEqual({
      provider: "bts",
      method: null,
    });
  });

  it("places Yandex with its quote id and BTS or pickup without one", () => {
    expect(checkoutTerms(express)).toEqual({
      expectedTotal: 353_500,
      deliveryQuoteId: QUOTE_EXPRESS,
    });
    expect(checkoutTerms(standard).deliveryQuoteId).toBe(QUOTE_STANDARD);
    expect(checkoutTerms(bts)).toEqual({ expectedTotal: 337_000, deliveryQuoteId: null });
    expect(checkoutTerms({ ...standard, fulfilment: "pickup" }).deliveryQuoteId).toBeNull();
    // The selected option's own total is the one sent.
    const options = standard.options.map((option) =>
      option.method === "standard" ? { ...option, expectedTotal: 340_100 } : option,
    );
    expect(checkoutTerms({ ...standard, options }).expectedTotal).toBe(340_100);
    expect(checkoutTerms({ ...standard, options: [] }).expectedTotal).toBe(340_000);
  });

  it("can place pickup, BTS, the released answer and a Yandex quote, not an all-refused list", () => {
    expect(placeable(standard)).toBe(true);
    expect(placeable(bts)).toBe(true);
    expect(placeable({ ...standard, options: [], provider: null, quoteId: null })).toBe(true);
    expect(placeable({ ...standard, fulfilment: "pickup", options: [] })).toBe(true);
    expect(placeable(none)).toBe(false);
    expect(placeable(null)).toBe(false);
  });
});

describe("optionProblem", () => {
  const address = { regionCode: "", cityCode: "" };
  const [pinless, , btsRefused] = mapQuote({
    ...optionsQuote,
    options: deliveryUnavailableDetails.options,
  }).options;

  it("offers the map pin for coordinates_required", () => {
    expect(optionProblem(pinless!, address)).toEqual({
      reason: "coordinates_required",
      action: "pin",
    });
    expect(optionProblem(pinless!, null)).toEqual({ reason: "coordinates_required", action: null });
  });

  it("asks to complete the address when BTS lacks its region and city", () => {
    expect(optionProblem(btsRefused!, address)).toEqual({
      reason: "region_required",
      action: "edit",
    });
    expect(optionProblem(btsRefused!, { regionCode: "1", cityCode: "12" })).toEqual({
      reason: "out_of_zone",
      action: null,
    });
  });

  it("offers a retry when the carrier did not answer, nothing for the rest", () => {
    expect(optionProblem(none.options[0]!, address)).toEqual({
      reason: "provider_unavailable",
      action: "retry",
    });
    for (const reason of [
      "out_of_zone",
      "too_heavy",
      "warehouse_closed",
      "dispatch_suspended",
      "not_configured",
      "method_disabled",
    ] as const) {
      expect(optionProblem({ ...pinless!, unavailableReason: reason }, address)).toEqual({
        reason,
        action: null,
      });
    }
    expect(optionProblem(standard.options[0]!, address)).toBeNull();
  });
});

describe("compareQuotes", () => {
  it("lets an unchanged re-quote go ahead", () => {
    expect(compareQuotes(seenTerms(standard), { ...standard, quoteId: QUOTE_EXPRESS })).toEqual({
      kind: "same",
    });
  });

  it("reports a new fee of the same option", () => {
    expect(
      compareQuotes(seenTerms(standard), {
        ...standard,
        deliveryFee: 33_000,
        expectedTotal: 345_000,
      }),
    ).toEqual({ kind: "fee_changed", from: 28_000, to: 33_000 });
  });

  it("reports another total at the same fee", () => {
    expect(compareQuotes(seenTerms(standard), { ...standard, expectedTotal: 339_000 })).toEqual({
      kind: "total_changed",
    });
  });

  it("reports the option replaced by the server's fallback, and nothing available", () => {
    expect(compareQuotes(seenTerms(express), standard)).toEqual({
      kind: "replaced",
      label: "Yandex Standart",
    });
    expect(compareQuotes(seenTerms(standard), none)).toEqual({ kind: "none" });
  });
});

describe("readConflict", () => {
  it("tells a Yandex price change from the released one", () => {
    expect(readConflict(failure("price_changed", deliveryPriceChangedDetails))).toMatchObject({
      kind: "delivery_price_changed",
      fee: 33_000,
    });
    expect(readConflict(failure("price_changed", { total: 1, cart: {} }))).toEqual({
      kind: "price_changed",
    });
  });

  it("reads quote_expired and delivery_unavailable with or without options", () => {
    expect(readConflict(failure("quote_expired", null))).toEqual({
      kind: "quote_expired",
      options: null,
    });
    const unavailable = readConflict(failure("delivery_unavailable", deliveryUnavailableDetails));
    expect(unavailable?.kind).toBe("delivery_unavailable");
    expect(conflictOptions(unavailable!, standard.options)).toHaveLength(3);
    expect(conflictOptions({ kind: "quote_expired", options: null }, standard.options)).toEqual(
      standard.options,
    );
  });

  it("leaves every other refusal to the generic handling", () => {
    expect(readConflict(failure("open_order_exists", { order_id: 5 }))).toBeNull();
    expect(readConflict(failure("OUT_OF_STOCK", null))).toBeNull();
  });
});

describe("outcomeNotice", () => {
  const texts = {
    priceChanged: "items",
    deliveryPriceChanged: (from: string, to: string) => `fee ${from}→${to}`,
    optionReplaced: (label: string) => `now ${label}`,
    quoteExpired: "expired",
    none: "none",
  };
  const money = (amount: number) => String(amount);

  it("shows the new price, the replacement or the refusal, and nothing when unchanged", () => {
    expect(outcomeNotice({ kind: "fee_changed", from: 1, to: 2 }, texts, money)).toBe("fee 1→2");
    expect(outcomeNotice({ kind: "replaced", label: "BTS" }, texts, money)).toBe("now BTS");
    expect(outcomeNotice({ kind: "replaced", label: "" }, texts, money)).toBe("expired");
    expect(outcomeNotice({ kind: "total_changed" }, texts, money)).toBe("items");
    expect(outcomeNotice({ kind: "none" }, texts, money)).toBe("none");
    expect(outcomeNotice({ kind: "same" }, texts, money)).toBeNull();
  });
});
