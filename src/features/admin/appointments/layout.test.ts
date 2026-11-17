import { describe, expect, it } from "vitest";

import type { AppointmentRangeDay } from "@/data/appointments";

import {
  assignLanes,
  capLanes,
  heightOf,
  hourMarks,
  laneBox,
  monthCells,
  nowMinute,
  offsetOf,
  statusPills,
  timeWindow,
  unavailableSpans,
  visitSpan,
  type LaneItem,
} from "./layout";

const item = (id: string, from: string, to: string): LaneItem => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return { id, from: m(from), to: m(to) };
};
const lanesOf = (items: LaneItem[]) =>
  Object.fromEntries(
    assignLanes(items).map((e) => [e.item.id, `${e.lane}/${e.lanes}#${e.cluster}`]),
  );

describe("assignLanes", () => {
  it("keeps visits that do not overlap in one lane, each its own cluster", () => {
    expect(
      lanesOf([
        item("a", "09:00", "09:30"),
        item("b", "09:30", "10:00"),
        item("c", "11:00", "12:00"),
      ]),
    ).toEqual({ a: "0/1#0", b: "0/1#1", c: "0/1#2" });
  });

  it("puts overlapping visits side by side and reuses a freed lane", () => {
    // a 9–10, b 9:15–9:45, c 9:50–10:30 → c reuses b's lane; all three form one cluster of 2.
    expect(
      lanesOf([
        item("c", "09:50", "10:30"),
        item("b", "09:15", "09:45"),
        item("a", "09:00", "10:00"),
      ]),
    ).toEqual({ a: "0/2#0", b: "1/2#0", c: "1/2#0" });
  });

  it("chains a cluster through overlaps and gives all of it the widest lane count", () => {
    const result = lanesOf([
      item("a", "09:00", "11:00"),
      item("b", "09:00", "09:30"),
      item("c", "09:00", "09:30"),
      item("d", "10:30", "12:00"),
      item("e", "13:00", "13:30"),
    ]);
    expect(result).toEqual({ a: "0/3#0", b: "1/3#0", c: "2/3#0", d: "1/3#0", e: "0/1#1" });
  });

  it("orders longer visits first on equal starts and ids on full ties", () => {
    expect(
      lanesOf([
        item("y", "09:00", "09:30"),
        item("x", "09:00", "09:30"),
        item("z", "09:00", "10:00"),
      ]),
    ).toEqual({
      z: "0/3#0",
      x: "1/3#0",
      y: "2/3#0",
    });
  });

  it("returns nothing for nothing", () => {
    expect(assignLanes([])).toEqual([]);
  });
});

describe("capLanes", () => {
  const five = [
    item("a", "09:00", "10:00"),
    item("b", "09:00", "10:00"),
    item("c", "09:00", "10:00"),
    item("d", "09:10", "09:40"),
    item("e", "09:20", "10:20"),
    item("f", "14:00", "14:30"),
  ];

  it("keeps clusters up to the cap untouched", () => {
    const { placed, overflow } = capLanes(assignLanes(five.slice(0, 3)), 3);
    expect(placed.map((p) => [p.item.id, p.lane, p.columns])).toEqual([
      ["a", 0, 3],
      ["b", 1, 3],
      ["c", 2, 3],
    ]);
    expect(overflow).toEqual([]);
  });

  it("turns the lanes beyond the cap into one +N chip in the last column", () => {
    const { placed, overflow } = capLanes(assignLanes(five), 3);
    expect(placed.map((p) => p.item.id).sort()).toEqual(["a", "b", "f"]);
    expect(placed.find((p) => p.item.id === "f")).toMatchObject({ columns: 1, lane: 0 });
    expect(overflow).toEqual([
      { cluster: 0, column: 2, columns: 3, from: 9 * 60, to: 10 * 60 + 20, ids: ["c", "d", "e"] },
    ]);
  });
});

describe("time window and geometry", () => {
  it("never draws less than 09:00–18:00 and widens to whole hours", () => {
    expect(timeWindow([])).toEqual({ start: 540, end: 1080 });
    expect(timeWindow([{ from: 8 * 60 + 30, to: 19 * 60 + 15 }, null])).toEqual({
      start: 480,
      end: 1200,
    });
    expect(hourMarks({ start: 540, end: 720 })).toEqual([9, 10, 11]);
  });

  it("maps minutes to pixels and keeps short visits tall enough to click", () => {
    const window = { start: 540, end: 1080 };
    expect(offsetOf(600, window, 60)).toBe(60);
    expect(heightOf({ from: 600, to: 610 }, 60, 22)).toBe(22);
    expect(heightOf({ from: 600, to: 690 }, 60, 22)).toBe(90);
  });

  it("reads a visit's Tashkent minutes and clamps one that runs past midnight", () => {
    expect(
      visitSpan({ start: "2026-10-26T09:30:00+05:00", end: "2026-10-26T10:00:00+05:00" }),
    ).toEqual({
      from: 570,
      to: 600,
    });
    expect(
      visitSpan({ start: "2026-10-26T23:30:00+05:00", end: "2026-10-27T00:30:00+05:00" }),
    ).toEqual({
      from: 1410,
      to: 1440,
    });
  });

  it("hatches the hours outside work and the blocks, merged and clipped", () => {
    const window = { start: 480, end: 1140 };
    expect(unavailableSpans({ from: 540, to: 1080 }, window)).toEqual([
      { from: 480, to: 540 },
      { from: 1080, to: 1140 },
    ]);
    expect(
      unavailableSpans({ from: 540, to: 1080 }, window, [
        { from: 780, to: 840 },
        { from: 1050, to: 1100 },
      ]),
    ).toEqual([
      { from: 480, to: 540 },
      { from: 780, to: 840 },
      { from: 1050, to: 1140 },
    ]);
    expect(unavailableSpans(null, window)).toEqual([{ from: 480, to: 1140 }]);
  });

  it("draws the now-line only on its own day inside the window", () => {
    const window = { start: 540, end: 1080 };
    const now = "2026-10-26T06:15:00Z"; // 11:15 in Tashkent
    expect(nowMinute(now, "2026-10-26", window)).toBe(675);
    expect(nowMinute(now, "2026-10-27", window)).toBeNull();
    expect(nowMinute("2026-10-26T15:00:00Z", "2026-10-26", window)).toBeNull();
  });

  it("splits a day column into equal lane boxes with a gutter", () => {
    expect(laneBox(1, 3)).toEqual({
      left: `calc(${100 / 3}% + 2px)`,
      width: `calc(${100 / 3}% - 4px)`,
    });
    expect(laneBox(0, 0, 0)).toEqual({ left: "calc(0% + 0px)", width: "calc(100% - 0px)" });
  });
});

describe("month page", () => {
  const day = (date: string, total: number): AppointmentRangeDay => ({
    date,
    counts: { requested: 0, confirmed: total, attended: 0, rejected: 0, cancelled: 0 },
    total,
    working: true,
    hours: { start: "09:00", end: "18:00" },
  });

  it("lays out six Monday-first weeks joined with the range days", () => {
    const weeks = monthCells(
      "2026-10-26",
      [day("2026-09-28", 1), day("2026-10-26", 8)],
      "2026-10-26",
    );
    expect(weeks).toHaveLength(6);
    expect(weeks[0]![0]).toMatchObject({ iso: "2026-09-28", inMonth: false, weekday: 0 });
    expect(weeks[0]![0]!.data?.total).toBe(1);
    const design = weeks.flat().find((cell) => cell.iso === "2026-10-26")!;
    expect(design).toMatchObject({ isToday: true, inMonth: true, day: 26 });
    expect(design.data?.total).toBe(8);
    expect(weeks.flat().find((cell) => cell.iso === "2026-10-27")!.data).toBeNull();
  });

  it("lists the statuses with visits in board order", () => {
    expect(
      statusPills({ requested: 2, confirmed: 0, attended: 1, rejected: 0, cancelled: 3 }),
    ).toEqual([
      { status: "requested", count: 2 },
      { status: "attended", count: 1 },
      { status: "cancelled", count: 3 },
    ]);
  });
});
