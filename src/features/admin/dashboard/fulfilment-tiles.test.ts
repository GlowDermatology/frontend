import { describe, expect, it } from "vitest";

import type { FulfilmentCounters } from "@/domain/dashboard";

import { parseOrderQuery } from "../orders/query";
import { fulfilmentTiles } from "./fulfilment-tiles";

const counters: FulfilmentCounters = {
  paidToPrepare: 4,
  toHandToCourier: 2,
  inDelivery: 7,
  returning: 1,
  completedToday: 12,
  needsAction: 3,
  urgent: 1,
};

const params = (href: string) => Object.fromEntries(new URL(href, "http://x").searchParams);

describe("fulfilmentTiles (plan §3.10 / §4)", () => {
  it("shows the seven counters with the design's labels, in order", () => {
    expect(fulfilmentTiles(counters).map((tile) => [tile.label, tile.value])).toEqual([
      ["To‘langan · tayyorlash", 4],
      ["Kuryerga berish kerak", 2],
      ["Yetkazilmoqda", 7],
      ["Qaytarilmoqda", 1],
      ["Bugun yakunlangan", 12],
      ["Harakat kerak", 3],
      ["Shoshilinch", 1],
    ]);
  });

  it("links each tile to the filtered orders list, over every date", () => {
    expect(fulfilmentTiles(counters).map((tile) => tile.href)).toEqual([
      "/admin/orders?status=processing&period=all",
      "/admin/orders?status=processing&period=all&provider=yandex",
      "/admin/orders?status=handed_to_courier&period=all",
      "/admin/orders?period=all&provider=yandex&stage=returning",
      "/admin/orders?status=delivered&period=all",
      "/admin/orders?period=all&attention=open",
      "/admin/orders?period=all&attention=urgent",
    ]);
  });

  it("produces links the orders screen reads back as the same filters", () => {
    const [prepare, courier, , returning, , open, urgent] = fulfilmentTiles(counters);
    expect(parseOrderQuery(params(prepare!.href))).toMatchObject({
      status: "processing",
      period: "all",
    });
    expect(parseOrderQuery(params(courier!.href))).toMatchObject({
      status: "processing",
      provider: "yandex",
    });
    expect(parseOrderQuery(params(returning!.href))).toMatchObject({
      provider: "yandex",
      stage: "returning",
    });
    expect(parseOrderQuery(params(open!.href)).attention).toBe("open");
    expect(parseOrderQuery(params(urgent!.href)).attention).toBe("urgent");
  });

  it("turns waiting work amber and urgent work red, calm counters neutral", () => {
    const tone = (c: FulfilmentCounters) =>
      Object.fromEntries(fulfilmentTiles(c).map((tile) => [tile.key, tile.tone]));
    expect(tone(counters)).toMatchObject({
      paidToPrepare: "neutral",
      toHandToCourier: "warning",
      returning: "warning",
      needsAction: "warning",
      urgent: "danger",
    });
    const calm = { ...counters, toHandToCourier: 0, returning: 0, needsAction: 0, urgent: 0 };
    expect(new Set(Object.values(tone(calm)))).toEqual(new Set(["neutral"]));
  });
});
