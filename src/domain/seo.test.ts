import { describe, expect, it } from "vitest";

import categoriesFixture from "@/data/api/__fixtures__/categories.json";
import productFixture from "@/data/api/__fixtures__/product-1.json";
import pageFixture from "@/data/api/__fixtures__/products-page.json";
import { mapCategory } from "@/data/api/mappers/categories";
import { mapProduct } from "@/data/api/mappers/products";
import type { ApiCategory, ApiProduct } from "@/data/api/types";

import {
  categorySeoStatus,
  emptySeo,
  fillSeo,
  groupSeoIssues,
  isSeoComplete,
  lengthState,
  productSeoStatus,
  SEO_TITLE_IDEAL,
  seoPatch,
  SLUG_INVALID_MESSAGE,
  slugifyName,
  slugProblem,
  type SeoIssue,
} from "./seo";

describe("slugs", () => {
  it("accepts lower-case latin, digits and single dashes, never only digits", () => {
    expect(slugProblem("gialuron-serum-30", 140)).toBeNull();
    expect(slugProblem("spf50", 140)).toBeNull();
    for (const bad of [
      "12345",
      "Serum",
      "serum--30",
      "-serum",
      "serum-",
      "sérum",
      "serum 30",
      "",
    ]) {
      expect(slugProblem(bad, 140)).toBe(SLUG_INVALID_MESSAGE);
    }
    expect(slugProblem("a".repeat(141), 140)).toBe("140 belgidan oshmasin.");
  });

  it("derives slugs like the server's slugify_uz (apostrophes, Cyrillic, accents)", () => {
    // The backend's docstring examples (glowderma/core/slugs.py).
    expect(slugifyName("Ko‘pikli yuvish geli 150 ml")).toBe("kopikli-yuvish-geli-150-ml");
    expect(slugifyName("Сыворотка с гиалуроновой кислотой")).toBe(
      "syvorotka-s-gialuronovoy-kislotoy",
    );
    expect(slugifyName("Gʻallaorol O'g'il")).toBe("gallaorol-ogil");
    expect(slugifyName("Crème hydratante")).toBe("creme-hydratante");
    expect(slugifyName("Шўх қизлар ҳаёти")).toBe("shox-qizlar-hayoti");
    expect(slugifyName("  !!  ")).toBe("");
    // Cut at a word boundary.
    expect(slugifyName("alpha beta gamma", 12)).toBe("alpha-beta");
    // The recorded products carry the slug the server derived from their name.
    const fresh = mapProduct(productFixture as ApiProduct);
    expect(slugifyName(fresh.texts.uz.name)).toBe(fresh.slug);
  });
});

describe("SEO texts", () => {
  it("fills missing languages and leaves", () => {
    expect(fillSeo({ ru: { title: "T" } })).toEqual({
      uz: { title: "", description: "" },
      ru: { title: "T", description: "" },
      en: { title: "", description: "" },
    });
    expect(fillSeo(null)).toEqual(emptySeo());
  });

  it("rates lengths against the ideal bounds", () => {
    expect(lengthState(0, SEO_TITLE_IDEAL)).toBe("empty");
    expect(lengthState(14, SEO_TITLE_IDEAL)).toBe("short");
    expect(lengthState(15, SEO_TITLE_IDEAL)).toBe("ideal");
    expect(lengthState(60, SEO_TITLE_IDEAL)).toBe("ideal");
    expect(lengthState(61, SEO_TITLE_IDEAL)).toBe("long");
  });

  it("patches the changed leaves only", () => {
    const before = emptySeo();
    const after = emptySeo();
    expect(seoPatch(before, after)).toBeUndefined();
    after.en.description = "Night serum.";
    after.uz.title = "Serum";
    expect(seoPatch(before, after)).toEqual({
      uz: { title: "Serum" },
      en: { description: "Night serum." },
    });
    // Without a baseline every leaf is sent.
    expect(Object.keys(seoPatch(null, after) ?? {})).toEqual(["uz", "ru", "en"]);
  });

  it("marks a language complete when both fields are filled", () => {
    expect(isSeoComplete({ title: "T", description: "" })).toBe(false);
    expect(isSeoComplete({ title: "T", description: "D" })).toBe(true);
  });
});

describe("«SEO holati»", () => {
  it("computes the product checklist exactly as the server sent it", () => {
    const products = [
      productFixture as ApiProduct,
      ...(pageFixture.results as unknown as ApiProduct[]),
    ];
    for (const api of products) {
      const product = mapProduct(api);
      const computed = productSeoStatus({
        texts: product.texts,
        imageCount: product.images.length,
        category: product.category,
        seo: product.seo,
      });
      expect(computed, `product ${product.id}`).toEqual(product.seoStatus);
    }
  });

  it("computes the category checklist exactly as the server sent it", () => {
    for (const api of categoriesFixture.results as ApiCategory[]) {
      const category = mapCategory(api);
      const computed = categorySeoStatus({
        name: category.name,
        hasImage: category.imageUrl !== null,
        // Every recorded category has active products (the seed).
        activeProducts: category.productCount,
        seo: category.seo,
      });
      expect(computed, category.slug).toEqual(category.seoStatus);
    }
  });

  it("is ok with hints only, and orders errors, warnings, hints", () => {
    const seo = {
      uz: { title: "Gialuron serum — 30 ml", description: "d".repeat(100) },
      ru: { title: "Сыворотка", description: "" },
      en: { title: "x".repeat(70), description: "e".repeat(200) },
    };
    const status = productSeoStatus({
      texts: {
        uz: { name: "", description: "u".repeat(90) },
        ru: { name: "Сыворотка", description: "r".repeat(90) },
        en: { name: "Serum", description: "e".repeat(90) },
      },
      imageCount: 1,
      category: "serums",
      seo,
    });
    expect(status.ok).toBe(false);
    expect(status.issues.map((i) => [i.code, i.severity, i.language])).toEqual([
      ["name_missing", "error", "uz"],
      ["alt_text_fallback", "warning", "uz"],
      ["seo_title_short", "warning", "ru"],
      ["seo_title_long", "warning", "en"],
      ["seo_description_long", "warning", "en"],
      ["seo_description_missing", "info", "ru"],
    ]);
    const hintsOnly = categorySeoStatus({
      name: { uz: "Serumlar", ru: "Сыворотки", en: "Serums" },
      hasImage: true,
      activeProducts: 3,
      seo: emptySeo(),
    });
    expect(hintsOnly.ok).toBe(true);
    expect(hintsOnly.issues.every((i) => i.severity === "info")).toBe(true);
  });

  it("groups by severity in the panel's order and drops empty groups", () => {
    const issue = (severity: SeoIssue["severity"], code: SeoIssue["code"]): SeoIssue => ({
      code,
      severity,
      language: null,
      message: code,
    });
    const groups = groupSeoIssues([
      issue("info", "seo_title_missing"),
      issue("error", "images_missing"),
      issue("info", "seo_description_missing"),
    ]);
    expect(groups.map((g) => [g.severity, g.issues.map((i) => i.code)])).toEqual([
      ["error", ["images_missing"]],
      ["info", ["seo_title_missing", "seo_description_missing"]],
    ]);
  });
});
