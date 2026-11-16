import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/data/api/errors";
import {
  QUOTE_EXPRESS,
  deliveryPriceChangedDetails,
  deliveryUnavailableDetails,
  optionsQuote,
} from "@/data/mock/shop-delivery";
import { isDeliveryConflict } from "@/domain/shop-delivery";

const api = vi.hoisted(() => ({
  apiDeliveryQuote: vi.fn(),
  apiCheckout: vi.fn(),
}));

vi.mock("@/data/customer-auth/session", () => ({
  guardCustomerAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/data/api/customer/commerce", () => api);

const { placeOrder, quoteCheckout } = await import("./commerce.actions");

const conflict = (code: string, details: unknown) =>
  new ApiError(409, { code, message: "Xabar", errors: [], request_id: "r" }, { details });

beforeEach(() => {
  api.apiDeliveryQuote.mockReset();
  api.apiCheckout.mockReset();
});

describe("quoteCheckout", () => {
  it("asks for every delivery option and names the customer's pick", async () => {
    api.apiDeliveryQuote.mockResolvedValue({ data: optionsQuote });
    const result = await quoteCheckout({
      locale: "uz",
      selection: { fulfilment: "delivery", addressId: 7, cashbackToUse: 0 },
      delivery: { provider: "yandex", method: "express" },
      csrf: "c",
    });
    expect(api.apiDeliveryQuote).toHaveBeenCalledWith("uz", {
      fulfilment: "delivery",
      address_id: 7,
      cashback_to_use: 0,
      with_options: true,
      delivery_provider: "yandex",
      delivery_method: "express",
    });
    expect(result.ok && result.data.options).toHaveLength(3);
  });

  it("lets the server choose without a pick, never sends a method for BTS or junk", async () => {
    api.apiDeliveryQuote.mockResolvedValue({ data: optionsQuote });
    await quoteCheckout({
      locale: "ru",
      selection: { fulfilment: "delivery", addressId: 7, cashbackToUse: 0 },
      delivery: null,
      csrf: "c",
    });
    expect(api.apiDeliveryQuote.mock.calls[0]?.[1]).toMatchObject({
      with_options: true,
      delivery_provider: null,
      delivery_method: null,
    });
    await quoteCheckout({
      locale: "ru",
      selection: { fulfilment: "delivery", addressId: 7, cashbackToUse: 0 },
      delivery: { provider: "bts", method: "express" },
      csrf: "c",
    });
    expect(api.apiDeliveryQuote.mock.calls[1]?.[1]).toMatchObject({
      delivery_provider: "bts",
      delivery_method: null,
    });
    await quoteCheckout({
      locale: "ru",
      selection: { fulfilment: "delivery", addressId: 7, cashbackToUse: 0 },
      delivery: { provider: "dhl", method: "drone" } as never,
      csrf: "c",
    });
    expect(api.apiDeliveryQuote.mock.calls[2]?.[1]).toMatchObject({ delivery_provider: null });
  });

  it("keeps the released pickup request", async () => {
    api.apiDeliveryQuote.mockResolvedValue({ data: { ...optionsQuote, fulfilment: "pickup" } });
    await quoteCheckout({
      locale: "en",
      selection: { fulfilment: "pickup", addressId: 7, cashbackToUse: 5 },
      delivery: { provider: "yandex", method: "standard" },
      csrf: "c",
    });
    expect(api.apiDeliveryQuote).toHaveBeenCalledWith("en", {
      fulfilment: "pickup",
      address_id: null,
      cashback_to_use: 5,
    });
  });

  it("hands delivery_unavailable over with its options mapped", async () => {
    api.apiDeliveryQuote.mockRejectedValue(
      conflict("delivery_unavailable", deliveryUnavailableDetails),
    );
    const result = await quoteCheckout({
      locale: "uz",
      selection: { fulfilment: "delivery", addressId: 7, cashbackToUse: 0 },
      csrf: "c",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("delivery_unavailable");
    expect(isDeliveryConflict(result.details) && result.details.options).toHaveLength(3);
  });
});

describe("placeOrder", () => {
  const base = {
    locale: "uz",
    selection: { fulfilment: "delivery" as const, addressId: 7, cashbackToUse: 0 },
    provider: "click" as const,
    expectedTotal: 353_500,
    note: "",
    idempotencyKey: "0d7f4b0c-5a5e-4f0e-9a43-6c1e9b2f8a11",
    csrf: "c",
  };

  it("sends a Yandex quote id, and the released request for BTS", async () => {
    api.apiCheckout.mockResolvedValue({ data: { id: 10_311 } });
    await placeOrder({ ...base, deliveryQuoteId: QUOTE_EXPRESS });
    expect(api.apiCheckout.mock.calls[0]?.[1]).toMatchObject({
      expected_total: 353_500,
      delivery_quote_id: QUOTE_EXPRESS,
    });
    await placeOrder({ ...base, deliveryQuoteId: null });
    expect(api.apiCheckout.mock.calls[1]?.[1]).not.toHaveProperty("delivery_quote_id");
    await placeOrder({
      ...base,
      selection: { ...base.selection, fulfilment: "pickup" },
      deliveryQuoteId: QUOTE_EXPRESS,
    });
    expect(api.apiCheckout.mock.calls[2]?.[1]).not.toHaveProperty("delivery_quote_id");
  });

  it("refuses a malformed quote id without calling the API", async () => {
    const result = await placeOrder({ ...base, deliveryQuoteId: "../../x" });
    expect(result).toMatchObject({ ok: false, code: "validation_error" });
    expect(api.apiCheckout).not.toHaveBeenCalled();
  });

  it("maps the delivery refusals and keeps the others as sent", async () => {
    api.apiCheckout.mockRejectedValueOnce(conflict("price_changed", deliveryPriceChangedDetails));
    const changed = await placeOrder({ ...base, deliveryQuoteId: QUOTE_EXPRESS });
    expect(!changed.ok && changed.details).toMatchObject({ kind: "delivery", deliveryFee: 33_000 });

    api.apiCheckout.mockRejectedValueOnce(conflict("quote_expired", null));
    const expired = await placeOrder({ ...base, deliveryQuoteId: QUOTE_EXPRESS });
    expect(!expired.ok && expired.details).toMatchObject({ kind: "delivery", options: null });

    api.apiCheckout.mockRejectedValueOnce(conflict("open_order_exists", { order_id: 4 }));
    const open = await placeOrder({ ...base, deliveryQuoteId: QUOTE_EXPRESS });
    expect(!open.ok && open.details).toEqual({ order_id: 4 });
  });
});
