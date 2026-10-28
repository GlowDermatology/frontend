import { describe, expect, it } from "vitest";

import { localizeVolume } from "./volume";

describe("localizeVolume", () => {
  it("translates the unit after a number", () => {
    expect(localizeVolume("30 ml", "ru")).toBe("30 мл");
    expect(localizeVolume("50g", "ru")).toBe("50 г");
    expect(localizeVolume("2 dona", "en")).toBe("2 pcs");
    expect(localizeVolume("30 мл", "uz")).toBe("30 ml");
    expect(localizeVolume("1,5 l", "ru")).toBe("1,5 л");
  });

  it("keeps unknown words and text without a number", () => {
    expect(localizeVolume("30 ml + 10 ml", "ru")).toBe("30 мл + 10 мл");
    expect(localizeVolume("Travel size", "ru")).toBe("Travel size");
    expect(localizeVolume("2 x", "ru")).toBe("2 x");
  });
});
