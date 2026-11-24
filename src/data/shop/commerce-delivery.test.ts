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
  apiPay: vi.fn(),
}));

vi.mock("@/data/customer-auth/session", () => ({
  guardCustomerAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/data/api/customer/commerce", () => api);

const { placeOrder, quoteCheckout, startPayment } = await import("./commerce.actions");

const conflict = (code: string, details: unknown) =>
  new ApiError(409, { code, message: "Xabar", errors: [], request_id: "r" }, { details });

beforeEach(() => {
  api.apiDeliveryQuote.mockReset();
  api.apiCheckout.mockReset();
  api.apiPay.mockReset();
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

  it("sends the chosen provider as it is, and refuses one it does not know", async () => {
    api.apiCheckout.mockResolvedValue({ data: { id: 10_312 } });
    for (const provider of ["click", "payme", "uzum"] as const) {
      await placeOrder({ ...base, provider, deliveryQuoteId: null });
      expect(api.apiCheckout.mock.lastCall?.[1]).toMatchObject({ payment_provider: provider });
    }
    const calls = api.apiCheckout.mock.calls.length;
    const result = await placeOrder({ ...base, provider: "cash" as never, deliveryQuoteId: null });
    expect(result.ok).toBe(false);
    expect(api.apiCheckout.mock.calls).toHaveLength(calls);
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

describe("startPayment", () => {
  const base = {
    locale: "uz",
    orderId: 10_311,
    idempotencyKey: "0d7f4b0c-5a5e-4f0e-9a43-6c1e9b2f8a12",
    csrf: "c",
  };
  const link = (provider: string, webUrl: string) => ({
    data: {
      order_id: 10_311,
      payment_id: 412,
      provider,
      amount: 353_500,
      pay_by: "2026-10-24T12:15:00+05:00",
      account_ref: "10311",
      web_url: webUrl,
      app_url: null,
      return_url: "https://glowderma.uz/buyurtmalar/10311?paid=1",
    },
  });

  it("sends Uzum as chosen and hands back its hosted card form", async () => {
    api.apiPay.mockResolvedValue(link("uzum", "https://checkout.uzumbank.uz/pay/abc"));
    const result = await startPayment({ ...base, provider: "uzum" });
    expect(api.apiPay).toHaveBeenCalledWith("uz", 10_311, "uzum", base.idempotencyKey);
    expect(result).toEqual({ ok: true, data: { url: "https://checkout.uzumbank.uz/pay/abc" } });
  });

  it("keeps null (the order's provider) and refuses an unknown provider", async () => {
    api.apiPay.mockResolvedValue(link("click", "https://my.click.uz/services/pay?x=1"));
    await startPayment({ ...base, provider: null });
    expect(api.apiPay.mock.lastCall?.[2]).toBeNull();
    const refused = await startPayment({ ...base, provider: "cash" as never });
    expect(refused).toMatchObject({ ok: false, code: "validation_error" });
    expect(api.apiPay).toHaveBeenCalledTimes(1);
  });

  it("hands Uzum's 503 over as a retryable failure with the backend's text", async () => {
    api.apiPay.mockRejectedValue(
      new ApiError(503, {
        code: "provider_unavailable",
        message: "Tashqi xizmat javob bermadi. Qayta urinib ko‘ring.",
        errors: [],
        request_id: "r",
      }),
    );
    const result = await startPayment({ ...base, provider: "uzum" });
    expect(result).toEqual({
      ok: false,
      code: "provider_unavailable",
      error: "Tashqi xizmat javob bermadi. Qayta urinib ko‘ring.",
    });
  });
});
