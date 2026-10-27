import { describe, expect, it } from "vitest";

import {
  alternatePaths,
  equivalentPath,
  isNumericId,
  isPrivateRoute,
  parseShopPath,
  privatePathPrefixes,
  shopHref,
  shopPath,
} from "./routes";

describe("shopPath", () => {
  it("serves Uzbek at the root with Uzbek words", () => {
    expect(shopPath("uz", { kind: "home" })).toBe("/");
    expect(shopPath("uz", { kind: "catalog" })).toBe("/katalog");
    expect(shopPath("uz", { kind: "product", slug: "gialuron-serum" })).toBe(
      "/mahsulotlar/gialuron-serum",
    );
    expect(shopPath("uz", { kind: "category", slug: "serums" })).toBe("/kategoriyalar/serums");
    expect(shopPath("uz", { kind: "specialist", slug: "nodira" })).toBe("/mutaxassislar/nodira");
    expect(shopPath("uz", { kind: "services" })).toBe("/xizmatlar");
    expect(shopPath("uz", { kind: "bookingPolicy" })).toBe("/qabul-qoidalari");
  });

  it("serves Russian and English under their prefix with English words", () => {
    expect(shopPath("ru", { kind: "home" })).toBe("/ru");
    expect(shopPath("en", { kind: "product", slug: "x" })).toBe("/en/products/x");
    expect(shopPath("ru", { kind: "category", slug: "serums" })).toBe("/ru/categories/serums");
    expect(shopPath("ru", { kind: "specialists" })).toBe("/ru/specialists");
    expect(shopPath("en", { kind: "bookingPolicy" })).toBe("/en/booking-policy");
  });

  it("percent-encodes a slug segment", () => {
    expect(shopPath("uz", { kind: "product", slug: "a/b c" })).toBe("/mahsulotlar/a%2Fb%20c");
  });
});

describe("shopHref", () => {
  it("drops empty and false values and encodes the rest", () => {
    expect(
      shopHref("uz", { kind: "catalog" }, { q: "ko‘pik", page: 2, stock: false, sort: "" }),
    ).toBe("/katalog?q=ko%E2%80%98pik&page=2");
    expect(shopHref("ru", { kind: "catalog" }, {})).toBe("/ru/catalog");
    expect(shopHref("en", { kind: "catalog" }, { stock: true })).toBe("/en/catalog?stock=1");
  });
});

describe("parseShopPath", () => {
  it("round-trips every public route in every language", () => {
    const routes = [
      { kind: "home" },
      { kind: "catalog" },
      { kind: "category", slug: "serums" },
      { kind: "product", slug: "gialuron-serum" },
      { kind: "specialists" },
      { kind: "specialist", slug: "nodira-rahimova" },
      { kind: "services" },
      { kind: "terms" },
      { kind: "privacy" },
      { kind: "bookingPolicy" },
      { kind: "cart" },
      { kind: "signIn" },
      { kind: "orders" },
      { kind: "order", slug: "10248" },
    ] as const;
    for (const locale of ["uz", "ru", "en"] as const) {
      for (const route of routes) {
        expect(parseShopPath(shopPath(locale, route))).toEqual({ locale, route });
      }
    }
  });

  it("decodes a slug and ignores a trailing slash", () => {
    expect(parseShopPath("/mahsulotlar/a%20b/")).toEqual({
      locale: "uz",
      route: { kind: "product", slug: "a b" },
    });
  });

  it("refuses foreign, mixed and over-long paths", () => {
    expect(parseShopPath("/admin")).toBeNull();
    expect(parseShopPath("/api/shop/auth/refresh")).toBeNull();
    expect(parseShopPath("/ru/mahsulotlar/x")).toBeNull();
    expect(parseShopPath("/products/x")).toBeNull();
    expect(parseShopPath("/mahsulotlar/x/y")).toBeNull();
    expect(parseShopPath("/katalog/x")).toBeNull();
    expect(parseShopPath("/mahsulotlar/%E0%A4%A")).toBeNull();
    expect(parseShopPath("/uz/katalog")).toBeNull();
  });
});

describe("equivalentPath", () => {
  it("maps a page to the same page in another language", () => {
    expect(equivalentPath("/mahsulotlar/serum", "ru")).toBe("/ru/products/serum");
    expect(equivalentPath("/en/specialists/nodira", "uz")).toBe("/mutaxassislar/nodira");
    expect(equivalentPath("/ru", "en")).toBe("/en");
    expect(equivalentPath("/en/booking-policy", "uz")).toBe("/qabul-qoidalari");
  });

  it("falls back to the home page for anything unknown", () => {
    expect(equivalentPath("/nowhere", "ru")).toBe("/ru");
  });
});

describe("alternatePaths", () => {
  it("lists the three languages", () => {
    expect(alternatePaths({ kind: "category", slug: "sun" })).toEqual({
      uz: "/kategoriyalar/sun",
      ru: "/ru/categories/sun",
      en: "/en/categories/sun",
    });
  });
});

describe("private routes", () => {
  it("classifies cart, sign-in and account as private, catalog pages as public", () => {
    expect(isPrivateRoute({ kind: "cart" })).toBe(true);
    expect(isPrivateRoute({ kind: "signIn" })).toBe(true);
    expect(isPrivateRoute({ kind: "order", slug: "1" })).toBe(true);
    expect(isPrivateRoute({ kind: "product", slug: "x" })).toBe(false);
    expect(isPrivateRoute({ kind: "home" })).toBe(false);
  });

  it("lists every private prefix for robots.txt, in all languages", () => {
    const prefixes = privatePathPrefixes();
    expect(prefixes).toContain("/savat");
    expect(prefixes).toContain("/kirish");
    expect(prefixes).toContain("/buyurtmalar");
    expect(prefixes).toContain("/ru/cart");
    expect(prefixes).toContain("/en/sign-in");
    expect(prefixes).not.toContain("/katalog");
    expect(prefixes.every((prefix) => !prefix.endsWith("/x"))).toBe(true);
  });
});

describe("isNumericId", () => {
  it("accepts positive integers without a leading zero", () => {
    expect(isNumericId("12")).toBe(true);
    expect(isNumericId("012")).toBe(false);
    expect(isNumericId("0")).toBe(false);
    expect(isNumericId("serum-12")).toBe(false);
    expect(isNumericId("12345678901")).toBe(false);
  });
});
