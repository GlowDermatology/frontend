import { describe, expect, it } from "vitest";

import { formatEtaWindow, stageTone } from "./delivery-format";

const NOW = Date.parse("2026-11-15T12:00:00+05:00");
const relative = { nowMs: NOW, today: "Bugun", tomorrow: "Ertaga" };

describe("formatEtaWindow", () => {
  it("writes a same-day window once, in Tashkent time", () => {
    expect(formatEtaWindow("2026-11-15T14:30:00+05:00", "2026-11-15T16:00:00+05:00", "uz")).toBe(
      "15-noy, 14:30–16:00",
    );
    expect(formatEtaWindow("2026-11-15T09:30:00Z", "2026-11-15T11:00:00Z", "en")).toBe(
      "15 Nov, 14:30–16:00",
    );
  });

  it("names today and tomorrow when asked to", () => {
    expect(
      formatEtaWindow("2026-11-15T14:30:00+05:00", "2026-11-15T16:00:00+05:00", "uz", relative),
    ).toBe("Bugun, 14:30–16:00");
    expect(
      formatEtaWindow("2026-11-16T09:30:00+05:00", "2026-11-16T10:30:00+05:00", "ru", {
        ...relative,
        today: "Сегодня",
        tomorrow: "Завтра",
      }),
    ).toBe("Завтра, 09:30–10:30");
    expect(
      formatEtaWindow("2026-11-18T09:30:00+05:00", "2026-11-18T10:30:00+05:00", "ru", relative),
    ).toBe("18 ноя, 09:30–10:30");
  });

  it("spells out both days of a window across midnight", () => {
    expect(
      formatEtaWindow("2026-11-15T22:00:00+05:00", "2026-11-16T10:00:00+05:00", "en", relative),
    ).toBe("Bugun, 22:00 – Ertaga, 10:00");
  });

  it("copes with half a window or none", () => {
    expect(formatEtaWindow(null, "2026-11-15T16:00:00+05:00", "uz")).toBe("15-noy, 16:00");
    expect(formatEtaWindow(null, null, "uz")).toBeNull();
    expect(formatEtaWindow("soon", null, "uz")).toBeNull();
  });
});

describe("stageTone", () => {
  it("colours the stage by how it went", () => {
    expect(stageTone("delivered")).toBe("success");
    expect(stageTone("returning")).toBe("warning");
    expect(stageTone("failed")).toBe("warning");
    expect(stageTone("cancelled")).toBe("muted");
    expect(stageTone("in_transit")).toBe("gold");
    expect(stageTone(null)).toBe("gold");
  });
});
