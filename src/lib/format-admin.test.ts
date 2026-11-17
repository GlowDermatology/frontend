import { describe, expect, it } from "vitest";

import {
  createFormatter,
  formatDateTimeShort,
  formatDayMonthWeekday,
  formatMillions,
  formatNumber,
  formatRelativeDateTime,
  formatSigned,
  formatSom,
  formatWeekdayDayMonth,
  formatWeekdayShortDateTime,
} from "./format";

const NBSP = "\u00A0";
// Sat 24 Oct 2026, 14:02 in Tashkent.
const AT = "2026-10-24T09:02:00Z";

describe("createFormatter (admin, DESIGN §G)", () => {
  const uz = createFormatter("uz");
  const ru = createFormatter("ru");
  const en = createFormatter("en");

  it("is memoised per language", () => {
    expect(createFormatter("ru")).toBe(ru);
    expect(ru.locale).toBe("ru");
  });

  it("formats numbers and money per language", () => {
    expect(uz.number(1128000)).toBe(`1${NBSP}128${NBSP}000`);
    expect(en.number(1128000)).toBe("1,128,000");
    expect(ru.number(-48600)).toBe(`−48${NBSP}600`);
    expect(uz.som(784400)).toBe(`784${NBSP}400${NBSP}so‘m`);
    expect(ru.som(784400)).toBe(`784${NBSP}400${NBSP}сум`);
    expect(en.som(784400)).toBe(`784,400${NBSP}UZS`);
    expect(en.signed(5680)).toBe("+5,680");
    expect(ru.millions(6_420_000)).toBe(`6,42${NBSP}млн`);
    expect(en.millions(6_420_000)).toBe("6.42M");
    expect(ru.percent(12.5)).toBe(`12,5${NBSP}%`);
    expect(en.percent(12.5)).toBe("12.5%");
  });

  it("formats Tashkent dates per language", () => {
    expect(uz.dateTimeShort(AT)).toBe("24-okt, 14:02");
    expect(ru.dateTimeShort(AT)).toBe(`24${NBSP}окт, 14:02`);
    expect(en.dateTimeShort(AT)).toBe(`24${NBSP}Oct, 14:02`);
    expect(ru.dateLong(AT)).toBe(`24${NBSP}октября 2026`);
    expect(en.dateTimeLong(AT)).toBe(`24${NBSP}October 2026, 14:02`);
    expect(ru.dayMonthWeekday(AT)).toBe(`24${NBSP}октября, суббота`);
    expect(en.weekdayDayMonth(AT)).toBe(`Saturday, 24${NBSP}October`);
    expect(ru.weekdayShortDateTime(AT)).toBe(`Сб, 24${NBSP}окт, 14:02`);
    expect(uz.monthYear(AT)).toBe("oktabr 2026");
    expect(ru.monthYear(AT)).toBe("октябрь 2026");
    expect(en.monthYear(AT)).toBe("October 2026");
    expect(ru.weekdaysShort[1]).toBe("Пн");
    expect(en.months[0]).toBe("January");
  });

  it("formats relative times", () => {
    const now = "2026-10-24T10:00:00Z";
    expect(ru.relativeDateTime(AT, now)).toBe("Сегодня, 14:02");
    expect(en.relativeDateTime("2026-10-22T09:02:00Z", now)).toBe(`22${NBSP}Oct, 14:02`);
    expect(uz.ago("2026-10-24T09:59:30Z", now)).toBe("hozirgina");
    expect(uz.ago("2026-10-24T09:50:00Z", now)).toBe("10 daqiqa oldin");
    expect(ru.ago("2026-10-24T09:59:00Z", now)).toBe("1 минуту назад");
    expect(ru.ago("2026-10-24T09:58:00Z", now)).toBe("2 минуты назад");
    expect(ru.ago("2026-10-24T09:00:00Z", now)).toBe("1 час назад");
    expect(ru.ago("2026-10-24T05:00:00Z", now)).toBe("5 часов назад");
    expect(en.ago("2026-10-24T07:00:00Z", now)).toBe("3 h ago");
    expect(en.ago("2026-10-22T09:02:00Z", now)).toBe(`22${NBSP}Oct, 14:02`);
  });

  it("chooses plural forms and counts", () => {
    const orders = { one: "buyurtma" };
    expect(uz.count(5, orders)).toBe("5 ta buyurtma");
    const ruOrders = { one: "заказ", few: "заказа", many: "заказов" };
    expect(ru.count(1, ruOrders)).toBe("1 заказ");
    expect(ru.count(3, ruOrders)).toBe("3 заказа");
    expect(ru.count(11, ruOrders)).toBe("11 заказов");
    expect(ru.count(21, ruOrders)).toBe("21 заказ");
    expect(en.count(1, { one: "order", other: "orders" })).toBe("1 order");
    expect(en.count(1200, { one: "order", other: "orders" })).toBe("1,200 orders");
    expect(ru.duration(90)).toBe(`1${NBSP}ч 30${NBSP}мин`);
    expect(en.duration(45)).toBe(`45${NBSP}min`);
  });
});

describe("Uzbek functions delegate to the uz formatter (behaviour unchanged)", () => {
  it("keeps every existing output", () => {
    expect(formatNumber(1128000)).toBe(`1${NBSP}128${NBSP}000`);
    expect(formatNumber(-48600)).toBe(`−48${NBSP}600`);
    expect(formatSom(784400)).toBe(`784${NBSP}400${NBSP}so‘m`);
    expect(formatSigned(-48600)).toBe(`−48${NBSP}600`);
    expect(formatSigned(0)).toBe("0");
    expect(formatMillions(6_420_000)).toBe(`6,42${NBSP}mln`);
    expect(formatMillions(20_000_000)).toBe(`20${NBSP}mln`);
    expect(formatDateTimeShort(AT)).toBe("24-okt, 14:02");
    expect(formatDayMonthWeekday(AT)).toBe("24-oktabr, shanba");
    expect(formatWeekdayDayMonth("2026-10-26T04:00:00Z")).toBe("Dushanba, 26-oktabr");
    expect(formatWeekdayShortDateTime("2026-10-26T04:00:00Z")).toBe("Du, 26-okt, 09:00");
    expect(formatRelativeDateTime(AT, "2026-10-24T12:00:00Z")).toBe("Bugun, 14:02");
  });
});
