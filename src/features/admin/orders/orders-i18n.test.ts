import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { ToastProvider } from "@/components/ui/toast";
import order10248Fixture from "@/data/api/__fixtures__/order-10248.json";
import {
  DELETED_CUSTOMER_NAME,
  foldOrderHistory,
  formatPercent,
  mapOrder,
  mapOrderCashback,
} from "@/data/api/mappers/orders";
import type { ApiOrderDetail, ApiOrderEvent } from "@/data/api/types";
import { ORDER_SEEDS } from "@/data/mock/orders";
import { getOrder } from "@/data/mock/orders.queries";
import { orderHistoryCopy, orderLabelsCopy } from "@/domain/copy/orders";
import { issueDetailLines } from "@/domain/delivery-issue";
import { carrierLabel, issueKindLabel, refundStateLine } from "@/domain/order";
import { parseParcelWeight, reviewReasonLabel } from "@/domain/order-dispatch";
import { createFormatter } from "@/lib/format";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { cancellationEffects } from "./cancel-order-dialog";
import { cancelOutcome, confirmReturnRefusal, dispatchRefusal } from "./carrier-refusals";
import { ordersCopy } from "./copy";
import { OrderDeliveryCard } from "./delivery-card";
import { customerName } from "./labels";
import { OrderDetailView } from "./order-detail-view";
import { OrdersTable } from "./orders-table";
import { pageRangeLabel, periodLabel } from "./query";

const CYRILLIC = /[Ѐ-ӿ]/;
const UZBEK = /[‘’]|\b(buyurtma|mijoz|kuryer|yetkaz)/i;
const order10248 = order10248Fixture as unknown as ApiOrderDetail;

/** `AdminLocaleProvider` with its children passed as `createElement` arguments. */
const LocaleProvider = AdminLocaleProvider as (props: {
  locale: Locale;
  children?: ReactNode;
}) => ReactNode;

const inLocale = (locale: Locale, node: ReactNode) =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );

const event = (
  id: number,
  type: string,
  data: Record<string, unknown>,
  extra: Partial<ApiOrderEvent> = {},
): ApiOrderEvent =>
  ({
    id,
    type,
    at: "2026-10-23T09:00:00Z",
    source: "system",
    data,
    status_after: null,
    actor: null,
    ...extra,
  }) as ApiOrderEvent;

describe("order history in the admin language", () => {
  it("keeps the Uzbek rows and words them in Russian and English", () => {
    const history = [
      event(3, "status_changed", { to: "delivered", push_sent: true }, { source: "admin" }),
      event(2, "refund_requested", {
        refund_id: 1,
        amount: 120_000,
        provider: "click",
        manual: true,
      }),
      event(1, "payment_failed", { provider: "payme" }),
    ];
    const uz = foldOrderHistory(history, "delivery");
    expect(uz[0]).toMatchObject({
      title: "Yetkazildi",
      note: "Administrator · holat qo‘lda o‘zgartirildi · mijozga push yuborildi",
    });
    const ru = foldOrderHistory(history, "delivery", null, "ru");
    expect(ru.map((row) => row.title)).toEqual([
      "Доставлен",
      "Запрошен возврат платежа",
      "Оплата не прошла",
    ]);
    expect(ru[0]!.note).toBe("Администратор · статус изменён вручную · клиенту отправлен push");
    // `manual` without `manual_reason` is an M1 row: a Payme cabinet refund (§4).
    expect(ru[1]!.note.replace(/\u00a0/g, " ")).toBe(
      "Click · 120 000 сум · Возврат вручную в кабинете Payme",
    );
    const en = foldOrderHistory(history, "delivery", null, "en");
    expect(en[1]!.note.replace(/\u00a0/g, " ")).toBe(
      "Click · 120,000 UZS · Refunded by hand in the Payme cabinet",
    );
    expect(en[2]).toMatchObject({ title: "Payment failed", note: "Payme · payment declined" });
    for (const row of en) expect(`${row.title} ${row.note}`).not.toMatch(UZBEK);
  });

  it("maps the contract's №10248 vector in every language", () => {
    for (const locale of ["ru", "en"] as const) {
      const order = mapOrder(order10248, { locale });
      const text = order.history.map((row) => `${row.title} ${row.note}`).join(" ");
      expect(text).not.toMatch(/[‘’]/);
      if (locale === "ru") expect(text).toMatch(CYRILLIC);
      else expect(text).not.toMatch(CYRILLIC);
    }
    expect(mapOrder(order10248).history).toEqual(mapOrder(order10248, { locale: "uz" }).history);
  });

  it("labels cashback entries and percentages per language", () => {
    const entries = [
      { kind: "debit", amount: -48_600 },
      { kind: "credit", amount: 5_680, percent: "1.50", base: 568_000 },
    ] as unknown as Parameters<typeof mapOrderCashback>[0];
    expect(mapOrderCashback(entries, null).map((e) => e.label.replace(/\u00a0/g, " "))).toEqual([
      "Ishlatildi",
      "1,5% × 568 000",
    ]);
    expect(mapOrderCashback(entries, null, "en").map((e) => e.label)).toEqual([
      "Used",
      "1.5% × 568,000",
    ]);
    expect(formatPercent("0.57", "en")).toBe("0.57");
  });

  it("builds the mock order in the admin language (demo mode)", async () => {
    const seed = ORDER_SEEDS.find(
      (s) => s.status === "cancelled" && s.cancellation?.reason === "admin",
    )!;
    const ru = (await getOrder(seed.id, "ru"))!;
    expect(ru.history.some((row) => row.title === orderLabelsCopy.ru.status.cancelled)).toBe(true);
    expect(ru.history.map((row) => row.note).join(" ")).toContain(orderHistoryCopy.ru.admin);
    const uz = (await getOrder(seed.id))!;
    expect(uz.history.map((row) => row.title)).toContain("Bekor qilindi");
  });
});

describe("order domain labels", () => {
  it("names refund lines, carriers and issue kinds per language", () => {
    expect(refundStateLine({ state: "manual_required", provider: "payme" }, "ru")).toBe(
      "Верните деньги в кабинете Payme",
    );
    expect(refundStateLine({ state: "failed", provider: "click" }, "en")).toBe("Refund failed");
    expect(carrierLabel({ fulfilment: "pickup", delivery: null }, "en")).toBe("Pickup");
    expect(issueKindLabel("return_pending", "ru")).toBe("Ожидается возврат посылки");
    expect(issueKindLabel("brand_new_kind", "en")).toBe("brand_new_kind");
  });

  it("never reads an inherited Object member as a label", () => {
    expect(issueKindLabel("constructor")).toBe("constructor");
    expect(reviewReasonLabel("toString")).toBe("Narx avtomatik qabul qilinmadi (toString).");
    expect(issueDetailLines({ constructor: 3, offer_price: 45_000 }, "en")).toEqual([
      { key: "constructor", label: "constructor", value: 3, kind: "text" },
      { key: "offer_price", label: "Yandex offer", value: 45_000, kind: "money" },
    ]);
  });

  it("words the weight field and review reasons per language", () => {
    expect(parseParcelWeight("", "ru")).toEqual({ ok: false, message: "Укажите вес." });
    expect(parseParcelWeight("20001", "en")).toEqual({
      ok: false,
      message: "No more than 20,000 g.",
    });
    expect(reviewReasonLabel("above_approved", "en")).toBe(
      "The new offer is above the price approved earlier.",
    );
  });

  it("shows the deleted-customer token in the admin language", () => {
    expect(customerName(DELETED_CUSTOMER_NAME, orderLabelsCopy.en)).toBe("Deleted customer");
    expect(customerName("  ", orderLabelsCopy.ru)).toBe("Удалённый клиент");
    expect(customerName("Malika", orderLabelsCopy.en)).toBe("Malika");
  });
});

describe("refusals and effects in the admin language", () => {
  it("translates the dispatch, return and cancel refusals", () => {
    const refusal = dispatchRefusal({ ok: false, error: "x", code: "closed" }, "en");
    expect(refusal).toEqual({
      kind: "blocked",
      code: "closed",
      message: "The warehouse is closed now. Call a courier during working hours.",
      reload: true,
    });
    expect(dispatchRefusal({ ok: false, error: "srv", code: "conflict" }, "ru")).toMatchObject({
      kind: "stale",
      title: "Курьер не вызван",
    });
    expect(confirmReturnRefusal({ ok: false, error: "x", code: "not_found" }, "en")).toEqual({
      kind: "stale",
      title: "Return not confirmed",
      message: "Order not found.",
    });
    // A code like "constructor" is not a known refusal: the server's message stays.
    expect(confirmReturnRefusal({ ok: false, error: "srv", code: "constructor" })).toEqual({
      kind: "retry",
      message: "srv",
    });
    expect(
      cancelOutcome({ ok: false, error: "", code: "provider_unavailable" }, true, "en"),
    ).toEqual({
      kind: "retry",
      title: "Yandex did not answer",
      message: "Yandex did not answer, so the order was not cancelled. Try again.",
    });
  });

  it("lists the cancel effects per language", async () => {
    const order = (await getOrder(10248))!;
    const en = cancellationEffects(order, "en");
    expect(en[0]!.replace(/\u00a0/g, " ")).toBe(
      "784,400 UZS goes back to the customer through Click.",
    );
    expect(en.join(" ")).not.toMatch(/[‘’]/);
    expect(cancellationEffects(order, "ru").join(" ")).toMatch(CYRILLIC);
    expect(cancellationEffects(order)).toEqual(cancellationEffects(order, "uz"));
  });
});

describe("list helpers", () => {
  it("formats the page range and the month-to-date period per language", () => {
    const en = createFormatter("en");
    expect(pageRangeLabel(2, 10, 1_234, en)).toBe("11–20 / 1,234");
    expect(pageRangeLabel(5, 10, 12, en)).toBe("12–12 / 12");
    expect(pageRangeLabel(1, 10, 0, en)).toBe("0 / 0");
    const now = new Date("2026-10-24T09:00:00+05:00");
    expect(periodLabel("month", now, ordersCopy.uz, createFormatter("uz"))).toBe("1–24-oktabr");
    expect(periodLabel("month", now, ordersCopy.en, en).replace(/\u00a0/g, " ")).toBe(
      "1–24 October",
    );
    expect(periodLabel("week", now, ordersCopy.ru, createFormatter("ru"))).toBe("Последние 7 дней");
    const first = new Date("2026-11-01T09:00:00+05:00");
    expect(periodLabel("month", first, ordersCopy.uz, createFormatter("uz"))).toBe("1-noyabr");
  });

  it("has one export header per column in every language", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      expect(ordersCopy[locale].exportHeader).toHaveLength(10);
    }
  });
});

describe("order screens in English and Russian (static markup)", () => {
  it("renders the list table without Uzbek words", async () => {
    const orders = [(await getOrder(10248, "en"))!, (await getOrder(10251, "en"))!];
    const html = renderToStaticMarkup(
      createElement(OrdersTable, {
        orders,
        sortHref: "/admin/orders",
        sortedAscending: false,
        t: ordersCopy.en,
        labels: orderLabelsCopy.en,
        fmt: createFormatter("en"),
      }),
    );
    expect(html).toContain("CUSTOMER");
    expect(html).toContain("With the courier");
    expect(html).toContain("Pickup");
    expect(html).toContain('aria-label="Open order 10248"');
    expect(html).not.toMatch(/[‘’]|Yetkaz|Mijoz/);
  });

  it("renders the detail page and the delivery card in the chosen language", async () => {
    const order = (await getOrder(10248, "ru"))!;
    const html = inLocale(
      "ru",
      createElement(OrderDetailView, { initialOrder: order, now: "2026-10-24T09:00:00Z" }),
    );
    expect(html).toContain("Заказ №10248");
    expect(html).toContain("История статусов");
    expect(html).toContain("Изменить статус");
    expect(html).toContain("Передан в BTS");
    // Only the fixture's own content (product names, the address) stays Uzbek.
    expect(html).not.toMatch(/Holat|Buyurtma|Mijoz|To‘lov|Yetkaz|Bekor/);

    const seed = ORDER_SEEDS.find((s) => s.yandex?.stage === "courier_assigned")!;
    const yandex = (await getOrder(seed.id, "en"))!;
    const card = inLocale("en", createElement(OrderDeliveryCard, { order: yandex }));
    expect(card).toContain("Courier assigned");
    expect(card).toContain("Delivery price");
    expect(card).not.toMatch(/Yetkaz|Kuryer|Mijoz|narx/);
  });

  it("explains every unavailable header action instead of a bare disabled button", async () => {
    const seed = ORDER_SEEDS.find(
      (s) => s.fulfilment === "delivery" && s.shipment.state === "created" && !s.yandex,
    )!;
    const order = (await getOrder(seed.id))!;
    const html = inLocale(
      "uz",
      createElement(OrderDetailView, { initialOrder: order, now: "2026-10-24T09:00:00Z" }),
    );
    expect(html).toContain("BTS ga yuborilgan");
    expect(html).toContain(ordersCopy.uz.detail.sentToBtsReason);
    expect(html).not.toMatch(/<button[^>]* disabled=""/);
  });
});
