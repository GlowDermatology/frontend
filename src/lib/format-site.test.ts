import { describe, expect, it } from "vitest";

import { formatDuration, formatLongDate, formatPrice, pluralRu } from "./format";

const NBSP = " ";

describe("formatPrice", () => {
  it("formats so‘m per language with non-breaking grouping", () => {
    expect(formatPrice(185000, "uz")).toBe(`185${NBSP}000${NBSP}so‘m`);
    expect(formatPrice(1250000, "ru")).toBe(`1${NBSP}250${NBSP}000${NBSP}сум`);
    expect(formatPrice(1250000, "en")).toBe(`1,250,000${NBSP}UZS`);
    expect(formatPrice(0, "en")).toBe(`0${NBSP}UZS`);
  });
});

describe("formatLongDate", () => {
  it("uses the Tashkent calendar day", () => {
    // 20:30 UTC on 30 Sep is already 1 Oct in Tashkent.
    expect(formatLongDate("2026-09-30T20:30:00Z", "uz")).toBe("1-oktabr 2026");
    expect(formatLongDate("2026-09-30T20:30:00Z", "ru")).toBe(`1${NBSP}октября 2026`);
    expect(formatLongDate("2026-09-30T20:30:00Z", "en")).toBe(`1${NBSP}October 2026`);
  });
});

describe("formatDuration", () => {
  it("reads minutes and hours", () => {
    expect(formatDuration(30, "uz")).toBe(`30${NBSP}daqiqa`);
    expect(formatDuration(90, "ru")).toBe(`1${NBSP}ч 30${NBSP}мин`);
    expect(formatDuration(60, "en")).toBe(`1${NBSP}h`);
  });
});

describe("pluralRu", () => {
  it("picks one, few or many", () => {
    const forms = ["товар", "товара", "товаров"] as const;
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => pluralRu(n, forms))).toEqual([
      "товар",
      "товара",
      "товаров",
      "товаров",
      "товаров",
      "товар",
      "товара",
      "товаров",
      "товаров",
    ]);
  });
});
