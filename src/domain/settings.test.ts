import { describe, expect, it } from "vitest";

import { characterCount, hasVisibleText, nextTermsVersion } from "./settings";

describe("terms versions (contract §2.11)", () => {
  it("starts each Tashkent day at 1 and counts on within the day", () => {
    expect(nextTermsVersion(null, "2026-10-27")).toBe("20261027-1");
    expect(nextTermsVersion("20261026-3", "2026-10-27")).toBe("20261027-1");
    expect(nextTermsVersion("20261027-1", "2026-10-27")).toBe("20261027-2");
    // A stored version of a later day (a clock set back) keeps its day.
    expect(nextTermsVersion("20261030-2", "2026-10-27")).toBe("20261030-3");
  });

  it("counts characters and visible text as the server does", () => {
    expect(characterCount("o‘z 😀")).toBe(5);
    expect(hasVisibleText(" ​﻿\n")).toBe(false);
    expect(hasVisibleText(" a ")).toBe(true);
  });
});
