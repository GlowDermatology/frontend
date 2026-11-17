import { describe, expect, it } from "vitest";

import { isWithin, parseDisplayDate } from "@/lib/datetime";

import { settleDraft, typedDraft } from "./picker-field";

const rules = (strict = false) => ({
  parse: parseDisplayDate,
  isAllowed: (iso: string) => isWithin(iso, "2026-11-01", "2026-11-30"),
  strict,
});

describe("typedDraft (each keystroke)", () => {
  it("hands every whole day on at once in change mode", () => {
    const change = { ...rules(), commit: "change" as const, current: "" };
    expect(typedDraft("17.11.2026", change)).toEqual({ emit: "2026-11-17" });
    // A test's fill("2026-11-17") is a whole value too.
    expect(typedDraft("2026-11-17", change)).toEqual({ emit: "2026-11-17" });
  });

  it("empties the value for a partial draft only when one was set (like a native input)", () => {
    expect(typedDraft("17.11.20", { ...rules(), commit: "change", current: "" })).toEqual({});
    expect(typedDraft("17.11.20", { ...rules(), commit: "change", current: "2026-11-17" })).toEqual(
      { emit: "" },
    );
    expect(typedDraft("", { ...rules(), commit: "change", current: "2026-11-17" })).toEqual({
      emit: "",
    });
  });

  it("hands out-of-range days on unless strict", () => {
    expect(typedDraft("17.12.2026", { ...rules(), commit: "change", current: "" })).toEqual({
      emit: "2026-12-17",
    });
    expect(typedDraft("17.12.2026", { ...rules(true), commit: "change", current: "" })).toEqual({});
    expect(
      typedDraft("17.12.2026", { ...rules(true), commit: "change", current: "2026-11-17" }),
    ).toEqual({ emit: "" });
  });

  it("only schedules whole, new days in settle mode (a half-typed year never navigates)", () => {
    const settle = { ...rules(true), commit: "settle" as const, current: "2026-11-02" };
    expect(typedDraft("17.11.2026", settle)).toEqual({ schedule: "2026-11-17" });
    expect(typedDraft("17.11.202", settle)).toEqual({});
    expect(typedDraft("02.11.2026", settle)).toEqual({});
    expect(typedDraft("", settle)).toEqual({});
    expect(typedDraft("17.12.2026", settle)).toEqual({});
  });
});

describe("settleDraft (Enter and blur)", () => {
  it("applies a whole day or an empty field", () => {
    expect(settleDraft("2026-11-17", rules())).toEqual({ kind: "value", value: "2026-11-17" });
    expect(settleDraft("  ", rules())).toEqual({ kind: "value", value: "" });
  });

  it("names an unreadable draft", () => {
    expect(settleDraft("17.11.", rules())).toEqual({ kind: "invalid" });
    expect(settleDraft("31.11.2026", rules())).toEqual({ kind: "invalid" });
  });

  it("refuses out-of-range days only when strict", () => {
    expect(settleDraft("01.12.2026", rules())).toEqual({ kind: "value", value: "2026-12-01" });
    expect(settleDraft("01.12.2026", rules(true))).toEqual({ kind: "outOfRange" });
  });
});
