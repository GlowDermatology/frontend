import { describe, expect, it } from "vitest";

import { tickerItems } from "./ticker";

describe("home ticker", () => {
  it("states only what settings/public says", () => {
    expect(
      tickerItems(
        {
          deliveryProviders: ["yandex", "bts"],
          fulfilmentMethods: ["delivery", "pickup"],
          paymentProviders: ["click", "payme"],
        },
        "uz",
      ),
    ).toEqual([
      "Toshkent bo‘ylab yetkazib berish — Yandex orqali",
      "Viloyatlarga — BTS pochta orqali",
      "Buyurtmani do‘kondan olib ketish",
      "Click · Payme bilan to‘lov",
    ]);
    expect(
      tickerItems({ deliveryProviders: [], fulfilmentMethods: [], paymentProviders: [] }, "en"),
    ).toEqual([]);
    expect(
      tickerItems(
        { deliveryProviders: ["bts"], fulfilmentMethods: [], paymentProviders: ["uzum"] },
        "en",
      ),
    ).toEqual(["To the regions — by BTS post", "Pay with Uzum"]);
  });
});
