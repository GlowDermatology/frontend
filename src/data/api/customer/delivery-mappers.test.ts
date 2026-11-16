import { describe, expect, it } from "vitest";

import {
  QUOTE_EXPRESS,
  QUOTE_STANDARD,
  QUOTE_STANDARD_FRESH,
  btsAvailable,
  deliveryPriceChangedDetails,
  deliveryUnavailableDetails,
  expressOption,
  optionsQuote,
  returnedOrder,
  standardOption,
  yandexOrder,
} from "@/data/mock/shop-delivery";

import { mapOrder, mapOrderSummary, mapQuote } from "./account-mappers";
import type { ApiDeliveryQuote, ApiOrderDelivery } from "./account-types";
import {
  deliveryConflictDetails,
  mapDeliveryOption,
  mapDeliveryOptions,
  mapOrderDelivery,
} from "./delivery-mappers";

const HOSTS = ["media.glowderma.uz"];

describe("mapDeliveryOption", () => {
  it("maps an available Yandex option with the server's fee, window and quote", () => {
    expect(mapDeliveryOption(standardOption)).toEqual({
      provider: "yandex",
      method: "standard",
      label: "Yandex Standart",
      available: true,
      unavailableReason: null,
      fee: 28_000,
      etaFrom: "2026-11-15T14:30:00+05:00",
      etaTo: "2026-11-15T16:30:00+05:00",
      scheduled: false,
      quoteId: QUOTE_STANDARD,
      expiresAt: "2026-11-15T12:15:00+05:00",
      expectedTotal: 340_000,
    });
    expect(mapDeliveryOption(expressOption)?.scheduled).toBe(true);
  });

  it("keeps BTS without a method or quote id", () => {
    expect(mapDeliveryOption({ ...btsAvailable, quote_id: QUOTE_STANDARD })).toMatchObject({
      provider: "bts",
      method: null,
      available: true,
      fee: 25_000,
      quoteId: null,
    });
  });

  it("never carries a price for an unavailable option and keeps its reason", () => {
    const refused = mapDeliveryOption({
      ...standardOption,
      available: false,
      unavailable_reason: "coordinates_required",
    });
    expect(refused).toMatchObject({
      available: false,
      unavailableReason: "coordinates_required",
      fee: null,
      expectedTotal: null,
      quoteId: null,
      etaFrom: null,
      scheduled: false,
    });
  });

  it("refuses an 'available' option it could not place (no fee, total or quote id)", () => {
    expect(mapDeliveryOption({ ...standardOption, fee: null })).toMatchObject({
      available: false,
      unavailableReason: "provider_unavailable",
      fee: null,
    });
    expect(mapDeliveryOption({ ...standardOption, quote_id: "not-a-uuid" })).toMatchObject({
      available: false,
    });
    expect(mapDeliveryOption({ ...standardOption, expected_total: null })?.available).toBe(false);
  });

  it("drops what the storefront cannot name, reads an unknown reason as not configured", () => {
    expect(mapDeliveryOption({ ...standardOption, provider: "dhl" })).toBeNull();
    expect(mapDeliveryOption({ ...standardOption, method: "drone" })).toBeNull();
    expect(mapDeliveryOption({ ...standardOption, method: null })).toBeNull();
    expect(mapDeliveryOption(null)).toBeNull();
    expect(
      mapDeliveryOption({ ...btsAvailable, available: false, unavailable_reason: "storm" }),
    ).toMatchObject({ available: false, unavailableReason: "not_configured" });
  });

  it("keeps the API's order and drops duplicates and garbage", () => {
    const options = mapDeliveryOptions([standardOption, "x", expressOption, standardOption]);
    expect(options.map((option) => option.method)).toEqual(["standard", "express"]);
    expect(mapDeliveryOptions(undefined)).toEqual([]);
  });
});

describe("mapQuote", () => {
  it("reads the selected option and every option of a with_options answer", () => {
    const quote = mapQuote(optionsQuote);
    expect(quote).toMatchObject({
      fulfilment: "delivery",
      deliveryFee: 28_000,
      expectedTotal: 340_000,
      provider: "yandex",
      method: "standard",
      quoteId: QUOTE_STANDARD,
      quoteExpiresAt: "2026-11-15T12:15:00+05:00",
      quotedAt: "2026-11-15T12:00:00+05:00",
    });
    expect(quote.options.map((option) => `${option.provider}:${option.available}`)).toEqual([
      "yandex:true",
      "yandex:true",
      "bts:false",
    ]);
  });

  it("keeps the released answer (no options) as the BTS path", () => {
    const released = {
      fulfilment: "delivery",
      delivery_fee: 25_000,
      region_code: "1",
      city_code: "12",
      weight_g: 1000,
      pickup_address: null,
      quoted_at: "2026-11-15T12:00:00+05:00",
      items_subtotal: 312_000,
      cashback_max: 0,
      cashback_to_use: 0,
      expected_total: 337_000,
    } satisfies ApiDeliveryQuote;
    expect(mapQuote(released)).toMatchObject({
      provider: null,
      method: null,
      quoteId: null,
      quoteExpiresAt: null,
      options: [],
    });
  });

  it("reads a BTS selection without a quote id, and pickup without options", () => {
    expect(
      mapQuote({ ...optionsQuote, provider: "bts", method: null, quote_id: null }),
    ).toMatchObject({ provider: "bts", method: null, quoteId: null, quoteExpiresAt: null });
    expect(
      mapQuote({ ...optionsQuote, fulfilment: "pickup", provider: null, options: [] }),
    ).toMatchObject({ fulfilment: "pickup", provider: null, options: [] });
  });

  it("does not select a Yandex option it could not send to checkout", () => {
    expect(mapQuote({ ...optionsQuote, quote_id: null })).toMatchObject({
      provider: null,
      method: null,
      quoteId: null,
    });
  });
});

describe("mapOrderDelivery", () => {
  it("maps the courier view without ever passing a phone number on", () => {
    const api = {
      ...yandexOrder.delivery!,
      courier_phone: "+998901234567",
    } as ApiOrderDelivery;
    const mapped = mapOrderDelivery(api);
    expect(mapped).toEqual({
      provider: "yandex",
      method: "express",
      methodLabel: "Ekspress",
      stage: "in_transit",
      stageLabel: "Yo‘lda",
      etaFrom: "2026-11-15T11:30:00+05:00",
      etaTo: "2026-11-15T12:30:00+05:00",
      courierName: "Akmal",
      courierVehicle: "Chevrolet Cobalt, 01 A 123 BC",
      trackingUrl: "https://dostavka.yandex.ru/route/abc123",
    });
    expect(JSON.stringify(mapped)).not.toContain("+998");
  });

  it("drops a non-https tracking link and an unknown stage", () => {
    expect(
      mapOrderDelivery({
        ...yandexOrder.delivery!,
        tracking_url: "javascript:alert(1)",
        stage: "teleported" as never,
      }),
    ).toMatchObject({ trackingUrl: null, stage: null, stageLabel: null });
  });

  it("keeps a BTS order to its provider, and pickup or an older API to null", () => {
    expect(
      mapOrderDelivery({ ...yandexOrder.delivery!, provider: "bts", courier_name: "X" }),
    ).toMatchObject({ provider: "bts", courierName: null, stage: null });
    expect(mapOrderDelivery(null)).toBeNull();
    expect(mapOrderDelivery(undefined)).toBeNull();
  });

  it("reaches the order and summary view models", () => {
    expect(mapOrder(yandexOrder, HOSTS).delivery?.stage).toBe("in_transit");
    expect(mapOrderSummary(returnedOrder, HOSTS).delivery).toMatchObject({
      stage: "returned",
      courierName: null,
      trackingUrl: null,
    });
    expect(mapOrder({ ...yandexOrder, fulfilment: "pickup" }, HOSTS).delivery).toBeNull();
    const older = { ...yandexOrder } as Partial<typeof yandexOrder>;
    delete older.delivery;
    expect(mapOrder(older as typeof yandexOrder, HOSTS).delivery).toBeNull();
    expect(
      mapOrder(returnedOrder, HOSTS)
        .timeline.map((entry) => entry.type)
        .slice(0, 2),
    ).toEqual(["shipment_returned", "delivery_failed"]);
  });
});

describe("deliveryConflictDetails", () => {
  it("maps a Yandex price change with the fresh quote and options", () => {
    expect(deliveryConflictDetails("price_changed", deliveryPriceChangedDetails)).toMatchObject({
      kind: "delivery",
      quoteId: QUOTE_STANDARD_FRESH,
      deliveryFee: 33_000,
      total: 345_000,
      options: [
        { method: "standard", fee: 33_000, quoteId: QUOTE_STANDARD_FRESH },
        { method: "express", quoteId: QUOTE_EXPRESS },
        { provider: "bts", available: false },
      ],
    });
  });

  it("leaves the released price_changed (no options) as sent", () => {
    expect(
      deliveryConflictDetails("price_changed", { total: 1, items_subtotal: 1, cart: {} }),
    ).toBeNull();
  });

  it("maps quote_expired with and without fresh options", () => {
    expect(deliveryConflictDetails("quote_expired", null)).toEqual({
      kind: "delivery",
      options: null,
      quoteId: null,
      deliveryFee: null,
      total: null,
    });
    expect(
      deliveryConflictDetails("quote_expired", { options: [standardOption] })?.options,
    ).toHaveLength(1);
  });

  it("maps delivery_unavailable with every option refused", () => {
    const conflict = deliveryConflictDetails("delivery_unavailable", deliveryUnavailableDetails);
    expect(conflict?.options?.map((option) => option.unavailableReason)).toEqual([
      "coordinates_required",
      "coordinates_required",
      "out_of_zone",
    ]);
    expect(deliveryConflictDetails("delivery_unavailable", null)?.options).toBeNull();
  });

  it("ignores every other code", () => {
    expect(deliveryConflictDetails("open_order_exists", { order_id: 4 })).toBeNull();
    expect(deliveryConflictDetails(undefined, deliveryUnavailableDetails)).toBeNull();
  });
});
