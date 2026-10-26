import { describe, expect, it } from "vitest";

import { droppedLinesMessage, pasteMemberLines, SEGMENT_MEMBERS_MAX } from "./segment";

const caretAtEnd = (text: string) => ({ start: text.length, end: text.length });

describe("pasteMemberLines", () => {
  it("splits a pasted list into lines at the pasted line, dropping blank lines after it", () => {
    expect(pasteMemberLines(["", "", ""], 0, "5,13\n90 123 45 67", caretAtEnd(""))).toEqual({
      rows: ["5", "13", "90 123 45 67"],
      focus: 2,
      dropped: 0,
    });
    expect(pasteMemberLines(["7", "", "9"], 1, "1;2", caretAtEnd(""))).toEqual({
      rows: ["7", "1", "2", "9"],
      focus: 2,
      dropped: 0,
    });
  });

  it("keeps the text already in the line it is pasted into", () => {
    // Caret after "105": 105 stays as its own line, then the pasted entries.
    expect(pasteMemberLines(["105", ""], 0, "288,300", caretAtEnd("105")).rows).toEqual([
      "105",
      "288",
      "300",
    ]);
    // Caret before "105": the pasted entries go first.
    expect(pasteMemberLines(["105"], 0, "288,300", { start: 0, end: 0 }).rows).toEqual([
      "288",
      "300",
      "105",
    ]);
    // A selection is replaced, the text around it stays.
    expect(pasteMemberLines(["12 34"], 0, "5,6", { start: 2, end: 3 }).rows).toEqual([
      "12",
      "5",
      "6",
      "34",
    ]);
  });

  it("counts the lines over the limit instead of losing them silently", () => {
    const phones = Array.from({ length: 600 }, (_, i) => `+99890${String(i).padStart(7, "0")}`);
    const pasted = pasteMemberLines([""], 0, phones.join("\n"), caretAtEnd(""));
    expect(pasted.rows).toHaveLength(SEGMENT_MEMBERS_MAX);
    expect(pasted.dropped).toBe(100);
    expect(pasted.focus).toBe(SEGMENT_MEMBERS_MAX - 1);
    expect(droppedLinesMessage(pasted.dropped)).toBe(
      "100 ta qator qo‘shilmadi: ko‘pi bilan 500 ta.",
    );

    // Existing lines after the paste point that no longer fit are counted too.
    const full = Array.from({ length: 499 }, (_, i) => String(i + 1));
    const nearlyFull = pasteMemberLines(
      [...full.slice(0, 10), "", ...full.slice(10)],
      10,
      "a,b",
      caretAtEnd(""),
      500,
    );
    expect(nearlyFull.rows).toHaveLength(500);
    expect(nearlyFull.dropped).toBe(1);
    expect(pasteMemberLines(["1"], 0, "2,3", caretAtEnd("1"), 500).dropped).toBe(0);
  });
});
