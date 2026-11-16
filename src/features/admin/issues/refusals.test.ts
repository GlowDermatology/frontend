import { describe, expect, it } from "vitest";

import { issueRefusal, noteError } from "./refusals";
import { localInputValue, suspensionLine, untilFromLocal } from "./suspension";

describe("issueRefusal", () => {
  it("puts a field error next to its field first", () => {
    expect(
      issueRefusal(
        {
          ok: false,
          error: "Maydonlarni tekshiring.",
          code: "validation_error",
          fieldErrors: { note: "Kamida 3 ta belgi kiriting." },
        },
        ["note"],
      ),
    ).toEqual({ kind: "field", field: "note", message: "Kamida 3 ta belgi kiriting." });
    expect(
      issueRefusal(
        {
          ok: false,
          error: "x",
          code: "validation_error",
          fieldErrors: { until: "Kelajakdagi vaqtni tanlang." },
        },
        ["until", "note"],
      ),
    ).toMatchObject({ kind: "field", field: "until" });
  });

  it("reads 404 and 409 as a changed row, everything else as a retry with the same key", () => {
    expect(
      issueRefusal({ ok: false, error: "Bu muammo allaqachon hal qilingan.", code: "conflict" }, [
        "note",
      ]),
    ).toEqual({ kind: "stale", message: "Bu muammo allaqachon hal qilingan." });
    expect(issueRefusal({ ok: false, error: "Topilmadi.", code: "not_found" }, ["note"]).kind).toBe(
      "stale",
    );
    for (const code of [
      "network_error",
      "provider_unavailable",
      "throttled",
      "validation_error",
      undefined,
    ]) {
      expect(issueRefusal({ ok: false, error: "e", code }, ["note"])).toEqual({
        kind: "retry",
        message: "e",
      });
    }
  });
});

describe("noteError (3..1000 after trimming, the backend's messages)", () => {
  it("checks the note like the API", () => {
    expect(noteError("   ")).toBe("Majburiy maydon.");
    expect(noteError(" ab ")).toBe("Kamida 3 ta belgi kiriting.");
    expect(noteError("abc")).toBeNull();
    expect(noteError("x".repeat(1000))).toBeNull();
    expect(noteError("x".repeat(1001))).toBe("1000 belgidan oshmasin.");
  });
});

describe("the dispatch switch's time", () => {
  it("turns a Tashkent datetime-local value into an aware instant", () => {
    expect(untilFromLocal("2026-11-16T09:30")).toBe("2026-11-16T09:30:00+05:00");
    expect(untilFromLocal("  ")).toBeNull();
    expect(untilFromLocal("2026-02-30T09:30")).toBeUndefined();
    expect(untilFromLocal("16.11.2026 09:30")).toBeUndefined();
    expect(untilFromLocal("2026-11-16T25:00")).toBeUndefined();
  });

  it("shows an instant in the picker in Tashkent time", () => {
    expect(localInputValue("2026-11-16T04:30:00Z")).toBe("2026-11-16T09:30");
    expect(untilFromLocal(localInputValue("2026-11-16T04:30:00Z"))).toBe(
      "2026-11-16T09:30:00+05:00",
    );
  });

  it("words the switch's state", () => {
    const base = { note: "", updatedAt: "2026-11-15T10:00:00+05:00" };
    expect(suspensionLine({ ...base, suspended: false, until: null })).toBe(
      "Kuryer chaqirish ishlayapti",
    );
    expect(suspensionLine({ ...base, suspended: true, until: null })).toBe(
      "To‘xtatilgan · qo‘lda yoqilguncha",
    );
    expect(suspensionLine({ ...base, suspended: true, until: "2026-11-16T09:30:00+05:00" })).toBe(
      "To‘xtatilgan · 16-noy, 09:30 gacha",
    );
  });
});
