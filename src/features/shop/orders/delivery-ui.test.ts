import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { mapOrder, mapQuote } from "@/data/api/customer/account-mappers";
import {
  deliveryUnavailableDetails,
  optionsQuote,
  returnedOrder,
  yandexOrder,
} from "@/data/mock/shop-delivery";
import type { ShopAddress } from "@/domain/shop-account";

import { DeliveryOptions } from "../cart/delivery-options";
import { DeliveryStatus } from "./delivery-status";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const NOW = Date.parse("2026-11-15T12:00:00+05:00");
const address: ShopAddress = {
  id: 7,
  label: "Uy",
  text: "Chilonzor 9",
  regionCode: "",
  cityCode: "",
  comment: "",
  isDefault: true,
  latitude: null,
  longitude: null,
};

/** The `<input>` tag of one radio. */
function radio(html: string, value: string): string {
  return html.match(new RegExp(`<input[^>]*value="${value}"[^>]*>`))?.[0] ?? "";
}

function options(props: Partial<Parameters<typeof DeliveryOptions>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(DeliveryOptions, {
      locale: "uz",
      name: "d",
      options: mapQuote(optionsQuote).options,
      chosen: { provider: "yandex", method: "standard" },
      address: { ...address, latitude: 41.3, longitude: 69.2 },
      pending: false,
      nowMs: NOW,
      onChoose: () => undefined,
      onFixAddress: () => undefined,
      onRetry: () => undefined,
      ...props,
    }),
  );
}

describe("DeliveryOptions", () => {
  it("lists the server's prices and windows, the chosen option checked", () => {
    const html = options();
    expect(html).toContain("Yandex Standart");
    expect(html).toContain("28 000 so‘m");
    expect(html).toContain("Yetkazib berish: Bugun, 14:30–16:30");
    expect(html).toContain("Yetkazib berish: Ertaga, 09:30–10:30");
    expect(html).toContain("Ombor ochilgach jo‘natiladi");
    expect(radio(html, "yandex:standard")).toContain('checked=""');
    expect(radio(html, "yandex:express")).not.toContain('checked=""');
    expect(radio(html, "bts")).toContain('disabled=""');
  });

  it("disables a refused option with its reason and the way to fix it", () => {
    const html = options({
      options: mapQuote({ ...optionsQuote, options: deliveryUnavailableDetails.options }).options,
      chosen: null,
      address,
    });
    expect(html.match(/disabled=""/g)?.length).toBe(3);
    expect(html).toContain("Kuryer uchun manzil xaritada belgilanmagan.");
    expect(html).toContain("Xaritada belgilash");
    // BTS refuses an address without its region and city: complete it.
    expect(html).toContain("Pochta uchun manzilda viloyat va tuman tanlanmagan.");
    expect(html).toContain("Manzilni tahrirlash");
    expect(html).toContain("Mavjud emas");
    expect(html).not.toContain("so‘m");
  });

  it("offers a recalculation when the carrier did not answer", () => {
    const quote = mapQuote(optionsQuote);
    const html = options({
      locale: "en",
      options: [
        {
          ...quote.options[0]!,
          available: false,
          unavailableReason: "provider_unavailable",
          fee: null,
          expectedTotal: null,
          quoteId: null,
        },
      ],
    });
    expect(html).toContain("The delivery service is not responding right now.");
    expect(html).toContain("Recalculate");
  });
});

describe("DeliveryStatus", () => {
  const order = mapOrder(yandexOrder, ["media.glowderma.uz"]);

  it("shows the method, stage, window, courier and tracking link of a parcel on its way", () => {
    const html = renderToStaticMarkup(
      createElement(DeliveryStatus, {
        locale: "uz",
        order,
        delivery: order.delivery!,
        carrier: "Yandex",
      }),
    );
    expect(html).toContain("Yandex · Ekspress");
    expect(html).toContain("Yo‘lda");
    expect(html).toContain("15-noy, 11:30–12:30");
    expect(html).toContain("Akmal · Chevrolet Cobalt, 01 A 123 BC");
    expect(html).toMatch(
      /<a href="https:\/\/dostavka\.yandex\.ru\/route\/abc123" rel="noopener" target="_blank"/,
    );
    expect(html).toContain("Holat avtomatik yangilanadi");
    expect(html).not.toMatch(/\+998|tel:/);
  });

  it("stops the live refresh and hides the courier once the parcel came back", () => {
    const returned = mapOrder(returnedOrder, ["media.glowderma.uz"]);
    const html = renderToStaticMarkup(
      createElement(DeliveryStatus, {
        locale: "ru",
        order: returned,
        delivery: returned.delivery!,
        carrier: "Yandex",
      }),
    );
    expect(html).toContain("Do‘konga qaytarildi");
    expect(html).not.toContain("Статус обновляется автоматически");
    expect(html).not.toContain("Akmal");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Ожидаемое время");
  });

  it("drops the tracking link and the window once the order is delivered", () => {
    const delivered = mapOrder(
      {
        ...yandexOrder,
        status: "delivered",
        delivery: { ...yandexOrder.delivery!, stage: "delivered", stage_label: "Yetkazildi" },
      },
      ["media.glowderma.uz"],
    );
    const html = renderToStaticMarkup(
      createElement(DeliveryStatus, {
        locale: "en",
        order: delivered,
        delivery: delivered.delivery!,
        carrier: "Yandex",
      }),
    );
    expect(html).toContain("Yetkazildi");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Expected");
    expect(html).not.toContain("The status updates automatically");
  });
});
