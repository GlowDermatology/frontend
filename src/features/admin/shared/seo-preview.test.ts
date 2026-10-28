import { describe, expect, it } from "vitest";

import { emptySeo } from "@/domain/seo";

import {
  buildSnippet,
  categoryFallback,
  idealHint,
  productFallback,
  publicPath,
  publicUrlLabel,
  seoCounter,
  siteHost,
} from "./seo-preview";

describe("public URLs", () => {
  it("uses the storefront's route table per language", () => {
    expect(publicPath("product", "gialuron-serum")).toBe("/mahsulotlar/gialuron-serum");
    expect(publicPath("product", "gialuron-serum", "ru")).toBe("/ru/products/gialuron-serum");
    expect(publicPath("category", "serums", "en")).toBe("/en/categories/serums");
    expect(publicPath("specialist", "dilnoza-yusupova")).toBe("/mutaxassislar/dilnoza-yusupova");
  });

  it("shows the address without the scheme", () => {
    expect(siteHost("https://glowderma.uz/")).toBe("glowderma.uz");
    expect(publicUrlLabel("product", "serum", "uz", "https://glowderma.uz")).toBe(
      "glowderma.uz/mahsulotlar/serum",
    );
  });
});

describe("search snippet", () => {
  it("prefers the SEO texts and adds the brand to the title", () => {
    const snippet = buildSnippet({
      seo: { title: "Gialuron serum 30 ml", description: "Chuqur namlantiruvchi serum." },
      fallbackTitle: "Gialuron kislotali serum, 30 ml",
      fallbackDescription: "Uzun tavsif",
    });
    expect(snippet).toEqual({
      title: "Gialuron serum 30 ml | Glow Derma",
      description: "Chuqur namlantiruvchi serum.",
      titleSource: "seo",
      descriptionSource: "seo",
    });
  });

  it("falls back to the page's own texts, cut like a search engine", () => {
    const snippet = buildSnippet({
      seo: { title: "  ", description: "" },
      fallbackTitle: "Juda uzun nomli gialuron kislotali namlantiruvchi serum, 30 ml",
      fallbackDescription: "so‘z ".repeat(60),
    });
    expect(snippet.titleSource).toBe("fallback");
    expect(snippet.title.length).toBeLessThanOrEqual(60);
    expect(snippet.title.endsWith("…")).toBe(true);
    expect(snippet.descriptionSource).toBe("fallback");
    expect(snippet.description.length).toBeLessThanOrEqual(160);
    expect(
      buildSnippet({ seo: emptySeo().uz, fallbackTitle: "", fallbackDescription: "" }),
    ).toMatchObject({ title: "Glow Derma", descriptionSource: "none" });
  });

  it("builds the website's fallbacks for products and categories", () => {
    const short = productFallback("uz", {
      name: "Serum",
      volume: "30 ml",
      description: "Qisqa.",
      categoryName: "Serumlar",
      price: 185_000,
    });
    expect(short.title).toBe("Serum, 30 ml");
    expect(short.description).toContain("Serumlar toifasidan");
    expect(short.description).toContain("185");
    const long = "Gialuron kislotasining uch xil molekulasi terini namlaydi va tiklaydi.";
    expect(
      productFallback("ru", {
        name: "Сыворотка",
        volume: "",
        description: long,
        categoryName: null,
        price: Number.NaN,
      }),
    ).toEqual({ title: "Сыворотка", description: long });
    expect(categoryFallback("uz", { name: "Serumlar", productCount: 4 }).title).toBe(
      "Serumlar — parvarish vositalari",
    );
    expect(categoryFallback("uz", { name: "", productCount: 0 })).toEqual({
      title: "",
      description: "",
    });
  });
});

describe("counters", () => {
  it("rates the trimmed length and names the state", () => {
    expect(seoCounter("", "title", 120)).toMatchObject({ count: 0, state: "empty" });
    expect(seoCounter(" qisqa ", "title", 120)).toMatchObject({ count: 5, state: "short" });
    expect(seoCounter("x".repeat(40), "title", 120)).toMatchObject({
      state: "ideal",
      note: "Ideal uzunlik",
    });
    expect(seoCounter("x".repeat(170), "description", 300)).toMatchObject({
      state: "long",
      note: "Qidiruvda kesiladi",
    });
    expect(idealHint("description")).toBe("Ideal: 50–160 belgi.");
  });
});
