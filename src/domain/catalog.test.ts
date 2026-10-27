import { describe, expect, it } from "vitest";

import { bannerScheduleState, isValidBannerWindow } from "./banner";
import {
  canDeleteCategory,
  categoryLabel,
  isReservedCategorySlug,
  moveItem,
  suggestSlug,
  type Category,
} from "./category";
import { billzImportSummary, isJobDone } from "./job";

const category = (slug: string, uz: string, productCount = 0): Category => ({
  slug,
  name: { uz, ru: "", en: "" },
  imageUrl: null,
  position: 0,
  isActive: true,
  productCount,
  createdAt: "",
  updatedAt: "",
});

describe("categories", () => {
  it("labels by slug and falls back to the slug", () => {
    const list = [category("serums", "Serumlar")];
    expect(categoryLabel(list, "serums")).toBe("Serumlar");
    expect(categoryLabel(list, "masks")).toBe("masks");
  });

  it("reserves order and none, and only empty categories can be deleted", () => {
    expect(isReservedCategorySlug("order")).toBe(true);
    expect(isReservedCategorySlug("none")).toBe(true);
    expect(isReservedCategorySlug("serums")).toBe(false);
    expect(canDeleteCategory(category("a", "A", 0))).toBe(true);
    expect(canDeleteCategory(category("a", "A", 3))).toBe(false);
  });

  it("suggests slugs from Uzbek Latin names", () => {
    expect(suggestSlug("Quyoshdan himoya")).toBe("quyoshdan-himoya");
    expect(suggestSlug("O‘zbek  niqoblari!")).toBe("ozbek-niqoblari");
    expect(suggestSlug("  Tonerlar ")).toBe("tonerlar");
    expect(suggestSlug("Сыворотки")).toBe("");
    expect(suggestSlug("a".repeat(50))).toHaveLength(40);
  });

  it("moves items without mutating the source", () => {
    const source = ["a", "b", "c", "d"];
    expect(moveItem(source, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(source, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(source, 1, 1)).toEqual(source);
    expect(moveItem(source, 1, 9)).toEqual(source);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });
});

describe("banners", () => {
  const now = new Date("2026-10-24T12:00:00+05:00");
  it("derives the schedule state", () => {
    expect(bannerScheduleState({ isActive: true, startsAt: null, endsAt: null }, now)).toBe("live");
    expect(
      bannerScheduleState(
        { isActive: true, startsAt: "2026-11-01T00:00:00+05:00", endsAt: null },
        now,
      ),
    ).toBe("scheduled");
    expect(
      bannerScheduleState(
        { isActive: true, startsAt: null, endsAt: "2026-10-24T12:00:00+05:00" },
        now,
      ),
    ).toBe("ended");
    expect(
      bannerScheduleState(
        {
          isActive: true,
          startsAt: "2026-10-01T00:00:00+05:00",
          endsAt: "2026-12-01T00:00:00+05:00",
        },
        now,
      ),
    ).toBe("live");
    expect(bannerScheduleState({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(
      "inactive",
    );
  });

  it("requires ends after starts when both are set", () => {
    expect(isValidBannerWindow(null, null)).toBe(true);
    expect(isValidBannerWindow("2026-11-01T00:00:00+05:00", null)).toBe(true);
    expect(isValidBannerWindow("2026-11-01T00:00:00+05:00", "2026-11-02T00:00:00+05:00")).toBe(
      true,
    );
    expect(isValidBannerWindow("2026-11-01T00:00:00+05:00", "2026-11-01T00:00:00+05:00")).toBe(
      false,
    );
    expect(isValidBannerWindow("2026-11-02T00:00:00+05:00", "2026-11-01T00:00:00+05:00")).toBe(
      false,
    );
  });
});

describe("jobs", () => {
  it("knows terminal states and summarises an import in Uzbek", () => {
    expect(isJobDone("queued")).toBe(false);
    expect(isJobDone("running")).toBe(false);
    expect(isJobDone("succeeded")).toBe(true);
    expect(isJobDone("failed")).toBe(true);
    expect(billzImportSummary({ created: 3, updated: 245, unchanged: 0, newFromBillz: 3 })).toBe(
      "3 ta yangi · 245 ta yangilandi · 0 ta o‘zgarmadi",
    );
    // A full run also reports what it hid (M3), zero included.
    expect(
      billzImportSummary({ created: 0, updated: 240, unchanged: 5, newFromBillz: 0, hidden: 3 }),
    ).toBe("0 ta yangi · 240 ta yangilandi · 5 ta o‘zgarmadi · 3 ta yashirildi");
    expect(
      billzImportSummary({ created: 0, updated: 1, unchanged: 0, newFromBillz: 0, hidden: 0 }),
    ).toBe("0 ta yangi · 1 ta yangilandi · 0 ta o‘zgarmadi · 0 ta yashirildi");
  });
});
