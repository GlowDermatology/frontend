import { describe, expect, it } from "vitest";

import { filterOptions, searchKey } from "./search";

describe("searchKey", () => {
  it("ignores case, diacritics and apostrophe variants", () => {
    expect(searchKey("  Ko‘z KREMI ")).toBe("ko'z kremi");
    expect(searchKey("Crème")).toBe("creme");
  });
});

describe("filterOptions", () => {
  const options = [
    { value: "none", text: "Ilovaning bosh sahifasi" },
    { value: "product:1", text: "Mahsulot: CeraVe yuvish geli 236 ml" },
    { value: "product:2", text: "Mahsulot: La Roche-Posay Effaclar" },
  ];

  it("returns every option for an empty query", () => {
    expect(filterOptions(options, "  ")).toBe(options);
  });

  it("matches every word anywhere in the text", () => {
    expect(filterOptions(options, "gel cerave").map((o) => o.value)).toEqual(["product:1"]);
    expect(filterOptions(options, "mahsulot").map((o) => o.value)).toEqual([
      "product:1",
      "product:2",
    ]);
    expect(filterOptions(options, "xyz")).toEqual([]);
  });
});
