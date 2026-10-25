import { describe, expect, it } from "vitest";

import { staffInitials } from "./initials";

describe("staffInitials", () => {
  it("takes the first letters of the first two words", () => {
    expect(staffInitials("Malika Yusupova")).toBe("MY");
    expect(staffInitials("  dilnoza   karimova  rahimova")).toBe("DK");
  });

  it("falls back to the first two letters of a single word", () => {
    expect(staffInitials("Administrator")).toBe("AD");
    expect(staffInitials("admin")).toBe("AD");
    expect(staffInitials("A")).toBe("A");
  });

  it("handles empty names", () => {
    expect(staffInitials("")).toBe("");
    expect(staffInitials("   ")).toBe("");
  });
});
