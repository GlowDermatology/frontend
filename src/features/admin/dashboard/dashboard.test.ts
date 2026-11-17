import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

import weekFixture from "@/data/api/__fixtures__/dashboard-week.json";
import { mapDashboard } from "@/data/api/mappers/dashboard";
import type { ApiDashboard } from "@/data/api/types";
import { getDashboard } from "@/data/mock/dashboard.queries";
import { ORDER_SUMMARIES } from "@/data/mock/orders";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { validateCustomRange, type DashboardData } from "@/domain/dashboard";
import { billzImportSummary } from "@/domain/job";
import { createFormatter } from "@/lib/format";

import { attentionItems } from "./attention-items";
import { AttentionList } from "./attention-list";
import { dashboardCopy } from "./copy";
import { FulfilmentBoard } from "./fulfilment-board";
import { fulfilmentTiles } from "./fulfilment-tiles";
import { customRangeLabel } from "./range-control";
import { RecentOrders } from "./recent-orders";

/**
 * The dashboard in the admin languages (DESIGN §G): the data's bucket labels and notes, the
 * presets of the demo (same labels as the design in Uzbek), the attention items and tiles, the
 * range check, and the server-rendered blocks.
 */

const en = dashboardCopy.en;
const ru = dashboardCopy.ru;
const fmtEn = createFormatter("en");
const fmtRu = createFormatter("ru");

const busy: DashboardData["attention"] = {
  btsFailed: 2,
  pendingAppointments: 1,
  nextAppointmentAt: "2026-10-26T10:00:00+05:00",
  newFromBillz: 3,
  refundsNeedingAction: 1,
  btsPollingFailing: true,
  cashbackPolicyMissing: true,
  yandexFailing: true,
};

describe("dashboard data in the admin language", () => {
  it("labels a week's buckets and notes per language", () => {
    const week = weekFixture as unknown as ApiDashboard;
    const uz = mapDashboard(week);
    expect(uz.series[0]?.label).toBe("Se, 20-okt");
    const english = mapDashboard(week, "en");
    expect(english.axisNote).toBe("By day");
    expect(english.stats.ordersNote).toBe(`Last week: ${week.previous_period_orders}`);
    expect(english.series.map((p) => p.label)).not.toContain(uz.series[0]?.label);
    expect(mapDashboard(week, "ru").axisNote).toBe("По дням");
  });

  it("keeps the design's Uzbek preset labels and translates them", async () => {
    const today = await getDashboard({ range: "today" });
    expect(today.axisLabels).toEqual(["09:00", "15:00", "21:00"]);
    expect(today.stats.ordersNote).toBe("Kecha: 41 ta");
    expect(today.axisNote).toBe("Soatlar bo‘yicha");
    const week = await getDashboard({ range: "week" });
    expect(week.series.map((p) => p.label)).toEqual([
      "Ya, 18-okt",
      "Du, 19-okt",
      "Se, 20-okt",
      "Ch, 21-okt",
      "Pa, 22-okt",
      "Ju, 23-okt",
      "Sh, 24-okt",
    ]);
    expect(week.axisLabels).toEqual(["18-okt", "21-okt", "24-okt"]);
    expect(week.stats.orders).toBe(230);
    const month = await getDashboard({ range: "month" }, "ru");
    expect(month.series).toHaveLength(30);
    expect(month.from).toBe("2026-09-25");
    expect(month.stats.ordersNote).toBe("Прошлый месяц: 905");
  });

  it("checks a custom range with messages in the admin language", () => {
    expect(validateCustomRange("2026-10-24", "2026-10-20", "2026-10-24", "en")).toEqual({
      from: "Invalid value.",
    });
    expect(validateCustomRange(undefined, "2026-10-20", "2026-10-24", "ru")).toEqual({
      from: "Обязательное поле.",
    });
  });

  it("labels a custom range with the formatter's month names", () => {
    expect(customRangeLabel(createFormatter("uz"), "2026-10-23", "2026-10-24")).toBe(
      "23-okt – 24-okt",
    );
    expect(customRangeLabel(fmtEn, "2026-10-24", "2026-10-24")).not.toMatch(/okt/);
  });

  it("summarises a Billz import in each language", () => {
    const result = { created: 1, updated: 2, unchanged: 5, newFromBillz: 1, hidden: 0 };
    expect(billzImportSummary(result, "en")).toBe("1 new · 2 updated · 5 unchanged · 0 hidden");
    expect(billzImportSummary(result, "ru")).toBe(
      "1 новый · 2 обновлено · 5 без изменений · 0 скрыто",
    );
  });
});

describe("attention and order state", () => {
  it("words every attention item in English, links kept", () => {
    const items = attentionItems(busy, en.attention, fmtEn);
    expect(items.map((item) => item.title)).toEqual([
      "2 orders were not sent to BTS",
      en.attention.btsPolling,
      en.attention.yandex,
      en.attention.cashbackPolicy,
      "1 appointment is waiting for confirmation",
      "1 refund is waiting for a check",
      "3 new products from Billz",
    ]);
    expect(items.find((item) => item.key === "appointments")?.body).toMatch(/^Next: /);
    expect(attentionItems(busy).map((item) => item.href)).toEqual(items.map((item) => item.href));
  });

  it("names the tiles in Russian with the same links and tones", () => {
    const counters = {
      paidToPrepare: 4,
      toHandToCourier: 1,
      inDelivery: 2,
      returning: 0,
      completedToday: 5,
      needsAction: 1,
      urgent: 1,
    };
    const tiles = fulfilmentTiles(counters, ru.fulfilment.tiles);
    expect(tiles.map((tile) => tile.label)).toContain("Передать курьеру");
    expect(tiles.map((tile) => tile.href)).toEqual(fulfilmentTiles(counters).map((t) => t.href));
    const html = renderToStaticMarkup(
      createElement(FulfilmentBoard, { counters, t: ru.fulfilment, fmt: fmtRu }),
    );
    expect(html).toContain("Состояние заказов");
    expect(html).toContain("Срочно");
  });

  it("renders the attention list and the recent orders without Uzbek in English", () => {
    const attention = renderToStaticMarkup(
      createElement(AttentionList, { attention: busy, t: en.attention, fmt: fmtEn }),
    );
    expect(attention).toContain("Needs attention");
    const calm = renderToStaticMarkup(
      createElement(AttentionList, {
        attention: {
          ...busy,
          btsFailed: 0,
          pendingAppointments: 0,
          newFromBillz: 0,
          refundsNeedingAction: 0,
          btsPollingFailing: false,
          cashbackPolicyMissing: false,
          yandexFailing: false,
        },
        t: en.attention,
        fmt: fmtEn,
      }),
    );
    expect(calm).toContain(en.attention.empty);
    const recent = renderToStaticMarkup(
      createElement(RecentOrders, {
        orders: ORDER_SUMMARIES.slice(0, 3),
        now: new Date("2026-10-24T12:00:00+05:00"),
        t: en.recent,
        labels: orderLabelsCopy.en,
        fmt: fmtEn,
      }),
    );
    expect(recent).toContain("Recent orders");
    expect(recent).toContain("CUSTOMER");
    expect(recent).not.toMatch(/Yetkazib berish|Olib ketish|Jarayonda|MIJOZ/);
    const none = renderToStaticMarkup(
      createElement(RecentOrders, {
        orders: [],
        now: new Date(),
        t: ru.recent,
        labels: orderLabelsCopy.ru,
        fmt: fmtRu,
      }),
    );
    expect(none).toContain("Заказов пока нет");
    expect(none).not.toContain("<table");
  });
});
