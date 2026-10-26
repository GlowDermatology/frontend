import { describe, expect, it } from "vitest";

import { dashboardHref, parseDashboardQuery } from "./query";

describe("parseDashboardQuery / dashboardHref", () => {
  it("reads the presets, today by default", () => {
    expect(parseDashboardQuery({})).toEqual({ range: "today" });
    expect(parseDashboardQuery({ range: "week" })).toEqual({ range: "week" });
    expect(parseDashboardQuery({ range: "year" })).toEqual({ range: "today" });
    expect(dashboardHref({ range: "today" })).toBe("/admin");
    expect(dashboardHref({ range: "month" })).toBe("/admin?range=month");
  });

  it("round-trips a custom range and drops a malformed day", () => {
    const href = dashboardHref({ range: "custom", from: "2026-10-20", to: "2026-10-24" });
    expect(href).toBe("/admin?range=custom&from=2026-10-20&to=2026-10-24");
    expect(parseDashboardQuery(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual(
      { range: "custom", from: "2026-10-20", to: "2026-10-24" },
    );
    expect(parseDashboardQuery({ range: "custom", from: "2026-02-30", to: "0002-10-20" })).toEqual({
      range: "custom",
      from: undefined,
      to: undefined,
    });
  });
});
