import { describe, expect, it } from "vitest";

import {
  boardHref,
  boardRange,
  dayHref,
  parseBoard,
  parseDay,
  shiftDate,
  showsToday,
} from "./query";

const TODAY = "2026-10-26";

describe("parseDay", () => {
  it("falls back to today without a date or with a malformed one", () => {
    expect(parseDay({}, TODAY)).toBe(TODAY);
    expect(parseDay({ date: "" }, TODAY)).toBe(TODAY);
    expect(parseDay({ date: "26.10.2026" }, TODAY)).toBe(TODAY);
    expect(parseDay({ date: "2026-13-01" }, TODAY)).toBe(TODAY);
    expect(parseDay({ date: "2026-02-30" }, TODAY)).toBe(TODAY);
    expect(parseDay({ date: ["2026-10-27", "2026-10-28"] }, TODAY)).toBe("2026-10-27");
  });

  it("keeps a valid ISO date, including one in another month than today", () => {
    expect(parseDay({ date: "2026-10-27" }, TODAY)).toBe("2026-10-27");
    expect(parseDay({ date: "2027-01-01" }, "2026-12-31")).toBe("2027-01-01");
  });
});

describe("dayHref", () => {
  it("uses the bare route for today and ?date= otherwise", () => {
    expect(dayHref(TODAY, TODAY)).toBe("/admin/appointments");
    expect(dayHref("2026-10-27", TODAY)).toBe("/admin/appointments?date=2026-10-27");
    // The same day is the bare route only when it is today's default.
    expect(dayHref(TODAY, "2026-10-25")).toBe(`/admin/appointments?date=${TODAY}`);
  });
});

describe("parseBoard / boardHref", () => {
  it("defaults to the day view of today for everyone", () => {
    expect(parseBoard({}, TODAY)).toEqual({ view: "day", date: TODAY, specialist: "" });
    expect(parseBoard({ view: "year", specialist: "../x" }, TODAY)).toEqual({
      view: "day",
      date: TODAY,
      specialist: "",
    });
  });

  it("reads the view, the date and the specialist, and spells out only what differs", () => {
    const board = parseBoard({ view: "week", date: "2026-11-03", specialist: "s-2" }, TODAY);
    expect(board).toEqual({ view: "week", date: "2026-11-03", specialist: "s-2" });
    expect(boardHref(board, TODAY)).toBe(
      "/admin/appointments?view=week&date=2026-11-03&specialist=s-2",
    );
    expect(boardHref({ view: "day", date: TODAY, specialist: "" }, TODAY)).toBe(
      "/admin/appointments",
    );
    expect(boardHref({ view: "month", date: TODAY, specialist: "" }, TODAY)).toBe(
      "/admin/appointments?view=month",
    );
    expect(dayHref("2026-10-27", TODAY, "s-1")).toBe(
      "/admin/appointments?date=2026-10-27&specialist=s-1",
    );
  });
});

describe("shiftDate / boardRange / showsToday", () => {
  it("steps by a day, a week or a month (clamped to the month's end)", () => {
    expect(shiftDate("day", "2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDate("week", "2026-10-26", -1)).toBe("2026-10-19");
    expect(shiftDate("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftDate("month", "2026-03-15", -1)).toBe("2026-02-15");
  });

  it("covers the day, the Monday–Sunday week and the month's six-week page", () => {
    expect(boardRange("day", "2026-10-28")).toEqual({ from: "2026-10-28", to: "2026-10-28" });
    expect(boardRange("week", "2026-10-28")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(boardRange("week", "2026-11-01")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    // October 2026 starts on a Thursday: the page runs Mon 28 Sep … Sun 8 Nov (42 days).
    expect(boardRange("month", "2026-10-15")).toEqual({ from: "2026-09-28", to: "2026-11-08" });
  });

  it("knows when the shown period already holds today", () => {
    expect(showsToday("day", TODAY, TODAY)).toBe(true);
    expect(showsToday("day", "2026-10-27", TODAY)).toBe(false);
    expect(showsToday("week", "2026-11-01", TODAY)).toBe(true);
    expect(showsToday("week", "2026-11-02", TODAY)).toBe(false);
    expect(showsToday("month", "2026-10-01", TODAY)).toBe(true);
    expect(showsToday("month", "2026-11-01", TODAY)).toBe(false);
  });
});
