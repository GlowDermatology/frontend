import { describe, expect, it } from "vitest";

import { dayHref, parseDay } from "./query";

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
