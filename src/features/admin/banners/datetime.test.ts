import { describe, expect, it } from "vitest";

import { fromLocalInput, toLocalInput } from "./datetime";

describe("banner datetime inputs (Tashkent)", () => {
  it("renders an aware ISO as a Tashkent datetime-local value", () => {
    expect(toLocalInput("2026-11-01T00:00:00+05:00")).toBe("2026-11-01T00:00");
    expect(toLocalInput("2026-10-31T19:30:00Z")).toBe("2026-11-01T00:30");
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("garbage")).toBe("");
  });

  it("reads a datetime-local value as +05:00 and empty as null", () => {
    expect(fromLocalInput("2026-11-01T00:00")).toBe("2026-11-01T00:00:00+05:00");
    expect(fromLocalInput("2026-11-01T09:15:30")).toBe("2026-11-01T09:15:30+05:00");
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("2026-13-01T00:00")).toBeNull();
    expect(fromLocalInput("tomorrow")).toBeNull();
  });

  it("round-trips", () => {
    const iso = "2026-11-20T18:45:00+05:00";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
});
