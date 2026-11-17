import { describe, expect, it } from "vitest";

import { homeHrefs, languageHref, languageHrefs } from "./language-href";

describe("languageHref", () => {
  it("keeps the page and the catalog's filters, nothing else", () => {
    expect(languageHref("/katalog", "q=krem&utm_source=x&sort=price&page=2", "ru")).toBe(
      "/ru/catalog?q=krem&sort=price&page=2",
    );
    expect(languageHref("/ru/catalog", "q=крем", "uz")).toBe(
      `/katalog?q=${encodeURIComponent("крем")}`,
    );
  });

  it("maps detail pages and falls back to the home page", () => {
    expect(languageHref("/mahsulotlar/serum", "", "en")).toBe("/en/products/serum");
    expect(languageHref("/en/no-such-page", "", "uz")).toBe("/");
    expect(languageHref("/", "", "ru")).toBe("/ru");
  });

  it("lists every language", () => {
    expect(languageHrefs("/kirish", "next=%2Fsavat")).toEqual({
      uz: "/kirish",
      ru: "/ru/sign-in",
      en: "/en/sign-in",
    });
    expect(homeHrefs()).toEqual({ uz: "/", ru: "/ru", en: "/en" });
  });
});
