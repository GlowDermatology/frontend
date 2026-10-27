import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

import { parseSitemapName, productEntries, sitemapIndexXml, urlsetXml } from "./sitemap";

const ORIGIN = "https://glowderma.uz";

describe("sitemaps", () => {
  it("indexes one file per type and language", () => {
    const xml = sitemapIndexXml(ORIGIN);
    expect(xml.match(/<sitemap>/g)).toHaveLength(12);
    expect(xml).toContain(`<loc>${ORIGIN}/sitemaps/products-ru.xml</loc>`);
  });

  it("parses only known names", () => {
    expect(parseSitemapName("products-en.xml")).toEqual({ type: "products", locale: "en" });
    expect(parseSitemapName("orders-uz.xml")).toBeNull();
    expect(parseSitemapName("products-de.xml")).toBeNull();
    expect(parseSitemapName("products-uz")).toBeNull();
  });

  it("lists localized URLs with hreflang, lastmod and image, escaped", () => {
    const entries = productEntries([
      {
        id: 1,
        segment: "serum-a-b",
        hasSlug: true,
        name: "x",
        volume: "",
        price: 1,
        promo: false,
        category: null,
        image: null,
        imageUrl: "https://media.glowderma.uz/a.webp?x=1&y=2",
        available: 1,
        inStock: true,
        brand: null,
        updatedAt: "2026-10-20T10:00:00+05:00",
      },
    ]);
    const xml = urlsetXml(ORIGIN, "ru", entries);
    expect(xml).toContain(`<loc>${ORIGIN}/ru/products/serum-a-b</loc>`);
    expect(xml).toContain("<lastmod>2026-10-20T05:00:00.000Z</lastmod>");
    expect(xml).toContain(`hreflang="uz" href="${ORIGIN}/mahsulotlar/serum-a-b"`);
    expect(xml).toContain(`hreflang="x-default" href="${ORIGIN}/mahsulotlar/serum-a-b"`);
    expect(xml).toContain("a.webp?x=1&amp;y=2");
  });
});

describe("robots", () => {
  it("disallows the admin, the BFF and private pages in every language", () => {
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toEqual(
      expect.arrayContaining(["/admin", "/api/", "/savat", "/kirish", "/ru/cart", "/en/sign-in"]),
    );
    expect(rules.disallow).not.toContain("/katalog");
  });
});
