import { describe, expect, it } from "vitest";

import customFixture from "../__fixtures__/dashboard-custom.json";
import weekFixture from "../__fixtures__/dashboard-week.json";
import order10248Fixture from "../__fixtures__/order-10248.json";
import paymentsFixture from "../__fixtures__/payments-page.json";
import { isAllowedMediaUrl } from "../media";
import type { ApiDashboard, ApiOrderDetail, ApiOrderEvent, ApiPayment } from "../types";
import { dashboardParams, mapDashboard, windowBuckets } from "./dashboard";
import {
  foldOrderHistory,
  formatPercent,
  manualRefundReasons,
  mapOrder,
  mapOrderCashback,
  mapOrderSummary,
  mapShipment,
  orderExportParams,
  orderListParams,
} from "./orders";
import { mapPayment, paymentFilterParams, paymentListParams } from "./payments";

/**
 * Orders, payments and dashboard mappers (contract §2.2, §2.10, §2.12, §4,
 * §5.1, §5.7) against recorded answers of the M1 backend (acd1534).
 */

const order10248 = order10248Fixture as unknown as ApiOrderDetail;

/** `formatNumber` separates thousands with NBSP; the expectations are written with spaces. */
const plain = (text: string) => text.replace(/\u00a0/g, " ");

const event = (
  id: number,
  type: string,
  data: Record<string, unknown>,
  extra: Partial<ApiOrderEvent> = {},
): ApiOrderEvent =>
  ({
    id,
    type,
    at: `2026-10-24T12:${String(id).padStart(2, "0")}:00+05:00`,
    source: "system",
    status_after: null,
    actor: null,
    data,
    ...extra,
  }) as ApiOrderEvent;

describe("order №10248 (contract §4 test vector)", () => {
  it("folds the seven API events into the four design rows", () => {
    const order = mapOrder(order10248);
    expect(order.history.map(({ title, note }) => ({ title, note: plain(note) }))).toEqual([
      { title: "Kuryerga topshirildi", note: "Webhook · mijozga push yuborildi" },
      { title: "BTS buyurtmasi yaratildi", note: "Yetkazish raqami 48213907" },
      {
        title: "Jarayonda",
        note: "Click to‘lovi tasdiqlandi · band qilish savdoga aylantirildi · Billz’ga yozildi · cashback +5 680",
      },
      {
        title: "To‘lov kutilmoqda",
        note: "Qoldiq qayta tekshirildi · 3 ta mahsulot 15 daqiqaga band qilindi",
      },
    ]);
    expect(order.history.map((e) => e.id)).toEqual([7, 6, 3, 1]);
    expect(order.history.map((e) => e.status)).toEqual([
      "handed_to_courier",
      undefined,
      "processing",
      "awaiting_payment",
    ]);
  });

  it("maps the money, payment, cashback and actions", () => {
    const order = mapOrder(order10248);
    expect(order.total).toBe(784_400);
    expect(order.payment).toEqual({
      status: "paid",
      provider: "click",
      amount: 784_400,
      transactionId: "CLK-7741920385",
      confirmedAt: "2026-10-23T14:05:00+05:00",
    });
    expect(order.cashback.map((e) => ({ ...e, label: plain(e.label) }))).toEqual([
      { kind: "debit", amount: -48_600, label: "Ishlatildi" },
      { kind: "credit", amount: 5680, label: "1% × 568 000" },
    ]);
    expect(order.availableActions).toEqual({
      transitions: ["delivered"],
      cancel: true,
      retryShipment: false,
    });
    expect(order.refunds).toEqual([]);
    expect(order.cashbackHold).toBeUndefined();
    expect(order.customer).toEqual({ id: "5", name: "Malika Karimova", phone: "+998901234567" });
    expect(order.items[0]).toMatchObject({ art: null, productId: "4", quantity: 1 });
  });

  it("drops item photos whose host next/image may not load", () => {
    const keep = mapOrder(order10248);
    expect(keep.items.every((item) => typeof item.imageUrl === "string")).toBe(true);
    const filtered = mapOrder(order10248, {
      imageUrl: (url) => (isAllowedMediaUrl(url, ["localhost:8001"]) ? url : undefined),
    });
    expect(filtered.items.map((item) => item.imageUrl)).toEqual(
      order10248.items.map((item) =>
        item.image_url?.startsWith("http://localhost:8001/") ? item.image_url : undefined,
      ),
    );
  });
});

describe("media hosts", () => {
  it("matches host and port like images.remotePatterns", () => {
    expect(isAllowedMediaUrl("http://localhost:8001/media/a.webp", ["localhost:8001"])).toBe(true);
    expect(isAllowedMediaUrl("http://127.0.0.1:8000/media/a.webp", ["localhost:8001"])).toBe(false);
    expect(isAllowedMediaUrl("https://media.example.uz/a.webp", ["media.example.uz"])).toBe(true);
    expect(isAllowedMediaUrl("https://media.example.uz:444/a.webp", ["media.example.uz"])).toBe(
      true,
    );
    expect(isAllowedMediaUrl("javascript:alert(1)", ["alert(1)"])).toBe(false);
    expect(isAllowedMediaUrl("not a url", ["localhost"])).toBe(false);
    expect(isAllowedMediaUrl("http://localhost/a.webp", [])).toBe(false);
  });
});

describe("history folding (§5.1)", () => {
  it("folds the refund request named by the cancellation and words the cancel row", () => {
    const rows = foldOrderHistory(
      [
        event(9, "refund_succeeded", { refund_id: 4, amount: 120_000, provider: "click" }),
        event(8, "refund_requested", { refund_id: 4, amount: 120_000, provider: "click" }),
        event(
          7,
          "cancelled",
          {
            reason: "admin",
            note: "Mijoz so‘rovi bilan",
            refund_id: 4,
            cashback_reversed: true,
            stock_released: true,
            bts_cancelled: false,
            push_sent: true,
          },
          { source: "admin", status_after: "cancelled", actor: { id: 1, display_name: "Ali" } },
        ),
        event(6, "refund_requested", {
          refund_id: 3,
          amount: 5000,
          provider: "payme",
          manual: true,
        }),
      ],
      "delivery",
    );
    expect(rows.map(({ title, note }) => ({ title, note: plain(note) }))).toEqual([
      { title: "To‘lov qaytarildi", note: "Click · 120 000 so‘m" },
      {
        title: "Bekor qilindi",
        note: "Ali · to‘lov qaytarish so‘rovi yuborildi, cashback yozuvlari qaytarildi · Mijoz so‘rovi bilan",
      },
      {
        title: "To‘lov qaytarish so‘raldi",
        note: "Payme · 5 000 so‘m · Payme kabinetida qo‘lda qaytariladi",
      },
    ]);
  });

  it("words the remaining event types", () => {
    const rows = foldOrderHistory(
      [
        event(8, "refund_failed", { refund_id: 2, amount: 1, provider: "click", state: "unknown" }),
        event(7, "refund_failed", { refund_id: 1, amount: 1, provider: "payme", state: "failed" }),
        event(
          6,
          "status_changed",
          { from: "processing", to: "delivered", push_sent: true },
          { source: "admin", actor: null },
        ),
        event(5, "shipment_failed", { attempt: 2, manual: true, error_code: null }),
        event(4, "shipment_created", { tracking_number: "77", tariff: 1, manual: true }),
        event(3, "payment_failed", { provider: "payme", transaction_id: null, error_code: "x" }),
        event(2, "reservation_expired", { released_item_count: 2, payment_failed: true }),
        event(1, "order_created", { channel: "ios", item_count: 2, total: 1 }),
      ],
      "pickup",
    );
    expect(rows.map((r) => plain(`${r.title} — ${r.note}`))).toEqual([
      "To‘lov qaytarilmadi — Click · holat noma’lum, tekshirish kerak",
      "To‘lov qaytarilmadi — Payme · xato, administrator tekshiruvi kerak",
      "Yetkazildi — Administrator · mijozga topshirildi",
      "BTS ga yuborilmadi — Qo‘lda urinish muvaffaqiyatsiz",
      "BTS buyurtmasi yaratildi — Qo‘lda yuborildi · yetkazish raqami 77",
      "To‘lov o‘tmadi — Payme · to‘lov rad etildi",
      "Bekor qilindi — Band muddati tugadi · mahsulotlar bo‘shatildi",
      "To‘lov kutilmoqda — Buyurtma yaratildi · 2 ta mahsulot",
    ]);
    const delivery = foldOrderHistory(
      [
        event(
          1,
          "status_changed",
          { from: "processing", to: "handed_to_courier", push_sent: false },
          { source: "admin", actor: { id: 2, display_name: "Dilnoza" } },
        ),
      ],
      "delivery",
    );
    expect(delivery[0]).toMatchObject({
      title: "Kuryerga topshirildi",
      note: "Dilnoza · holat qo‘lda o‘zgartirildi",
    });
  });
});

describe("manual refunds by reason and provider (§4, §5.1, M2)", () => {
  const requested = (id: number, data: Record<string, unknown>) =>
    event(id, "refund_requested", { refund_id: id, amount: 120_000, ...data });

  it("words a manual refund request by its manual_reason, an M1 row as Payme", () => {
    const rows = foldOrderHistory(
      [
        requested(6, { provider: "click", manual: true, manual_reason: "fake_mode" }),
        requested(5, { provider: "click", manual: true, manual_reason: "no_paydoc" }),
        requested(4, { provider: "payme", manual: true, manual_reason: "payme" }),
        requested(3, { provider: "payme", manual: true }),
        requested(2, { provider: "click", manual: false, manual_reason: null }),
        requested(1, { provider: "click", manual: true, manual_reason: "later_reason" }),
      ],
      "delivery",
    );
    expect(rows.map((r) => plain(r.note))).toEqual([
      "Click · 120 000 so‘m · Click sinov rejimida · qo‘lda to‘lanadi",
      "Click · 120 000 so‘m · Click to‘lov raqami yo‘q · qo‘lda to‘lanadi",
      "Payme · 120 000 so‘m · Payme kabinetida qo‘lda qaytariladi",
      "Payme · 120 000 so‘m · Payme kabinetida qo‘lda qaytariladi",
      "Click · 120 000 so‘m",
      "Click · 120 000 so‘m · qo‘lda qaytariladi",
    ]);
  });

  it("gives the order's refunds the reason of their request, also when it is folded", () => {
    const refund = (id: number, provider: "click" | "payme", state: string) => ({
      id,
      state,
      provider,
      amount: 120_000,
      requested_at: "2026-10-24T12:00:00+05:00",
      updated_at: "2026-10-24T12:00:00+05:00",
      completed_at: null,
    });
    const order = mapOrder({
      ...order10248,
      status: "cancelled",
      refunds: [refund(12, "click", "manual_required"), refund(11, "click", "failed")],
      history: [
        requested(12, { provider: "click", manual: true, manual_reason: "no_paydoc" }),
        event(
          10,
          "cancelled",
          { reason: "admin", note: null, refund_id: 11, cashback_reversed: false },
          { source: "admin", status_after: "cancelled" },
        ),
        requested(11, { provider: "click", manual: false, manual_reason: null }),
      ],
    } as unknown as ApiOrderDetail);
    expect(order.refunds.map((r) => [r.id, r.manualReason])).toEqual([
      [12, "no_paydoc"],
      [11, undefined],
    ]);
    expect(manualRefundReasons([requested(3, { provider: "payme", manual: true })])).toEqual(
      new Map([[3, "payme"]]),
    );
  });
});

describe("shipment, cashback and percent", () => {
  it("camel-cases every shipment state and keeps pending", () => {
    expect(mapShipment({ state: "not_required" })).toEqual({ state: "not_required" });
    expect(mapShipment({ state: "not_created", pending: true })).toEqual({
      state: "not_created",
      pending: true,
    });
    expect(
      mapShipment({
        state: "failed",
        last_attempt_at: "2026-10-24T10:09:00+05:00",
        attempts: 2,
        pending: false,
      }),
    ).toEqual({
      state: "failed",
      lastAttemptAt: "2026-10-24T10:09:00+05:00",
      attempts: 2,
      pending: false,
    });
  });

  it("prepends the active hold when there is no debit entry", () => {
    expect(
      mapOrderCashback([], {
        amount: 1200,
        state: "active",
        expires_at: "2026-10-24T12:17:00+05:00",
      }),
    ).toEqual([{ kind: "debit", amount: -1200, label: "Ishlatildi" }]);
    expect(
      mapOrderCashback(
        [
          {
            ledger_entry_id: 1,
            kind: "reversal",
            amount: 400,
            at: "2026-10-24T12:00:00+05:00",
            base: null,
            percent: null,
            reverses_id: 9,
          },
        ],
        { amount: 1200, state: "released", expires_at: "2026-10-24T12:17:00+05:00" },
      ),
    ).toEqual([{ kind: "reversal", amount: 400, label: "Qarama-qarshi yozuv" }]);
  });

  it("formats the percent string per PCT", () => {
    expect(formatPercent("1.00")).toBe("1");
    expect(formatPercent("1.50")).toBe("1,5");
    expect(formatPercent("0.57")).toBe("0,57");
    expect(formatPercent(null)).toBe("");
  });

  it("names a deleted customer", () => {
    const summary = mapOrderSummary({
      ...order10248,
      customer: { id: 13, name: "", phone: "+998900000013" },
    });
    expect(summary.customer.name).toBe("O‘chirilgan mijoz");
  });
});

describe("list parameters (§7.15)", () => {
  it("translates the orders URL state", () => {
    expect(
      orderListParams({
        q: "  malika ",
        status: "delivered",
        fulfilment: "pickup",
        payment: "refunded",
        period: "today",
        sort: "date_desc",
        page: 3,
        pageSize: 50,
      }),
    ).toEqual({
      search: "malika",
      status: "delivered",
      fulfilment: "pickup",
      payment: "refunded",
      period: "today",
      date_from: undefined,
      date_to: undefined,
      customer: undefined,
      ordering: "-created_at",
      page: 3,
      page_size: 50,
    });
    expect(orderExportParams({ period: "all", sort: "date_asc" })).not.toHaveProperty("page");
  });

  it("translates the payments URL state; needs_action never reaches the API as a value", () => {
    expect(
      paymentListParams({
        q: "CLK",
        status: "paid",
        provider: "payme",
        refund: "manual_required",
        period: "week",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-24",
        sort: "date_asc",
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({
      search: "CLK",
      status: "paid",
      provider: "payme",
      refund_state: "manual_required",
      period: "week",
      date_from: "2026-10-01",
      date_to: "2026-10-24",
      ordering: "created_at",
      page: 2,
      page_size: 50,
    });
    expect(
      paymentFilterParams({ refund: "needs_action", period: "all", sort: "date_desc" })
        .refund_state,
    ).toBeUndefined();
  });

  it("maps a payment row", () => {
    const payment = mapPayment(paymentsFixture.results[0] as unknown as ApiPayment);
    expect(payment).toMatchObject({
      id: 244,
      orderId: 10244,
      provider: "click",
      status: "refunded",
      customer: { id: "9" },
    });
    expect(payment.refunds[0]).toMatchObject({ id: 9, state: "succeeded" });
    expect(payment.refunds[0]?.completedAt).toBeDefined();
  });
});

describe("dashboard (§5.7)", () => {
  it("labels a week by weekday and day and notes the previous week", () => {
    const data = mapDashboard(weekFixture as unknown as ApiDashboard);
    expect(data.series.map((p) => p.label)).toEqual([
      "Se, 20-okt",
      "Ch, 21-okt",
      "Pa, 22-okt",
      "Ju, 23-okt",
      "Sh, 24-okt",
      "Ya, 25-okt",
      "Du, 26-okt",
    ]);
    expect(data.axisLabels).toEqual(["20-okt", "23-okt", "26-okt"]);
    expect(data.axisNote).toBe("Kunlar bo‘yicha");
    expect(data.stats.ordersNote).toBe(`O‘tgan hafta: ${weekFixture.previous_period_orders} ta`);
    expect(data.stats.orders).toBe(weekFixture.stats.orders);
    expect(data.attention.refundsNeedingAction).toBe(weekFixture.attention.refunds_needing_action);
    expect(data.attention.btsPollingFailing).toBe(false);
    const failing = mapDashboard({
      ...weekFixture,
      attention: { ...weekFixture.attention, bts_polling_failing: true },
    } as unknown as ApiDashboard);
    expect(failing.attention.btsPollingFailing).toBe(true);
  });

  it("keeps every hour of a two-day custom range, with the day in the label", () => {
    const data = mapDashboard(customFixture as unknown as ApiDashboard);
    expect(data.bucket).toBe("hour");
    expect(data.series).toHaveLength(48);
    expect(data.series[0]?.label).toBe("23-okt, 00:00");
    expect(data.axisNote).toBe("Soatlar bo‘yicha");
    expect(data.stats.ordersNote).toBe(`Oldingi davr: ${customFixture.previous_period_orders} ta`);
  });

  it("windows one day of hours to 09:00–21:00 unless orders fall outside", () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      start: `2026-10-24T${String(h).padStart(2, "0")}:00:00+05:00`,
      revenue: 0,
      orders: h === 7 || h === 12 ? 1 : 0,
    }));
    const window = windowBuckets(hours, "hour");
    expect(window[0]?.start).toBe("2026-10-24T07:00:00+05:00");
    expect(window.at(-1)?.start).toBe("2026-10-24T21:00:00+05:00");
    const quiet = windowBuckets(
      hours.map((b) => ({ ...b, orders: 0 })),
      "hour",
    );
    expect(quiet).toHaveLength(13);
    const data = mapDashboard({
      range: "today",
      from: "2026-10-24",
      to: "2026-10-24",
      bucket: "hour",
      buckets: hours,
      previous_period_orders: 4,
      stats: {
        orders: 2,
        revenue: 0,
        new_customers: 0,
        total_customers: 1,
        deleted_customers: 0,
        out_of_stock: 0,
      },
      attention: {
        bts_failed: 0,
        pending_appointments: 0,
        next_appointment_at: null,
        new_from_billz: 0,
        refunds_needing_action: 0,
        bts_polling_failing: false,
      },
      generated_at: "2026-10-24T12:05:00+05:00",
    });
    expect(data.series[0]?.label).toBe("07:00");
    expect(data.axisLabels).toEqual(["07:00", "14:00", "21:00"]);
    expect(data.stats.ordersNote).toBe("Kecha: 4 ta");
  });

  it("asks for presets without days and custom ranges with them", () => {
    expect(dashboardParams({ range: "month" })).toEqual({ range: "month" });
    expect(dashboardParams({ range: "custom", from: "2026-10-01", to: "2026-10-24" })).toEqual({
      range: "custom",
      from: "2026-10-01",
      to: "2026-10-24",
    });
  });
});
