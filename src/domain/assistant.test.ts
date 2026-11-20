import { describe, expect, it } from "vitest";

import { PRODUCTS } from "@/data/mock/catalog";

import {
  buildDraft,
  fieldMode,
  fillTargets,
  formPathOf,
  hasAnyName,
  improveTargets,
  isAwaitingReview,
  isPlaceholder,
  keyLanguage,
  keyMaxLength,
  keyOf,
  keyValue,
  needsSource,
  parseKey,
  productKeys,
} from "./assistant";

const serum = PRODUCTS[0]!;

describe("assistant keys", () => {
  it("parses the three key shapes and writes them back", () => {
    for (const key of [
      "texts.ru.short_description",
      "texts.uz.name",
      "seo.en.description",
      "images.img-1.alt.uz",
      "images.17.alt.en",
    ]) {
      const parsed = parseKey(key);
      expect(parsed).not.toBeNull();
      expect(keyOf(parsed!)).toBe(key);
    }
    expect(parseKey("texts.ru.shortDescription")).toBeNull();
    expect(parseKey("texts.de.name")).toBeNull();
    expect(parseKey("price")).toBeNull();
    expect(parseKey("seo.uz.slug")).toBeNull();
    expect(parseKey("images..alt.uz")).toBeNull();
    expect(keyLanguage("images.7.alt.ru")).toBe("ru");
  });

  it("knows the API limits", () => {
    expect(keyMaxLength(parseKey("texts.uz.short_description")!)).toBe(300);
    expect(keyMaxLength(parseKey("texts.uz.ingredients")!)).toBe(1000);
    expect(keyMaxLength(parseKey("seo.uz.title")!)).toBe(120);
    expect(keyMaxLength(parseKey("images.1.alt.uz")!)).toBe(160);
  });

  it("maps keys to editor form paths (alt texts by the photo's place)", () => {
    const images = [{ id: "9" }, { id: "7" }];
    expect(formPathOf("texts.ru.short_description", images)).toBe("texts.ru.shortDescription");
    expect(formPathOf("seo.en.title", images)).toBe("seo.en.title");
    expect(formPathOf("images.7.alt.uz", images)).toBe("images.1.alt.uz");
    expect(formPathOf("images.8.alt.uz", images)).toBeNull();
  });

  it("reads saved values and lists every key in the editor's order", () => {
    expect(keyValue(serum, "texts.uz.name")).toBe("Gialuron kislotali serum");
    expect(keyValue(serum, "images.img-1.alt.uz")).toContain("serum");
    expect(keyValue(serum, "images.nope.alt.uz")).toBeNull();
    const all = productKeys(serum);
    expect(all).toHaveLength(3 * 5 + 3 * 2 + serum.images.length * 3);
  });

  it("checks job states", () => {
    expect(isAwaitingReview({ state: "succeeded", outcome: "pending" })).toBe(true);
    expect(isAwaitingReview({ state: "succeeded", outcome: "partial" })).toBe(false);
  });
});

describe("placeholders", () => {
  it.each([
    "",
    "   ",
    "Test",
    " TEST ",
    "test2",
    "Тест",
    "тест12",
    "asdf",
    "asddd",
    "qwerty",
    "qwe",
    "Lorem ipsum dolor sit amet",
    "lorem   ipsum",
    "xxx",
    "XXXX",
    "todo",
    "TBD",
    "placeholder",
    "Sample",
    "example",
    "Пример",
    "образец",
    "namuna",
    "...",
    "---",
    "???",
    "123",
    "1–2",
    "!!!",
  ])("%j is a placeholder", (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each([
    "Testosterone-free cream",
    "test cream",
    "Gialuron kislotali serum",
    "Сыворотка",
    "SPF 50",
    "Aqua",
    "x",
    "examples of use",
  ])("%j is content", (value) => {
    expect(isPlaceholder(value)).toBe(false);
  });

  it("treats null and undefined as empty", () => {
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder(null)).toBe(true);
  });
});

describe("the draft and what each command targets", () => {
  const form = () => {
    const values = structuredClone({
      texts: serum.texts,
      seo: serum.seo,
      images: [...serum.images, { id: "upload-1", label: "new" }],
    });
    return values;
  };

  it("maps every key to the form's current value, saved photos only, clipped to the limit", () => {
    const values = form();
    values.texts.ru.shortDescription = "Test";
    values.seo.en.title = "x".repeat(500);
    const draft = buildDraft(
      values,
      serum.images.map((image) => image.id),
    );
    expect(Object.keys(draft)).toEqual(productKeys(serum));
    expect(draft["texts.ru.short_description"]).toBe("Test");
    expect(draft["texts.uz.name"]).toBe(serum.texts.uz.name);
    expect(draft["seo.en.title"]).toHaveLength(120);
    expect(Object.keys(draft).some((key) => key.includes("upload-1"))).toBe(false);
    expect(draft[`images.${serum.images[0]!.id}.alt.uz`]).toBe(serum.images[0]!.alt!.uz);
  });

  it("decides a field's mode by its current value (placeholders count as empty)", () => {
    const values = form();
    values.texts.uz.description = "  test ";
    const draft = buildDraft(values, []);
    expect(fieldMode(draft, "texts.uz.description")).toBe("fill_missing");
    expect(fieldMode(draft, "texts.ru.description")).toBe("improve");
    expect(fieldMode(draft, "texts.ru.short_description")).toBe("fill_missing");
  });

  it("needs a source language for names, ingredients and usage", () => {
    const values = form();
    for (const language of ["uz", "ru", "en"] as const) values.texts[language].usage = "";
    values.texts.ru.name = "Test";
    const draft = buildDraft(values, []);
    expect(needsSource(draft, "texts.en.usage")).toBe(true);
    expect(needsSource(draft, "texts.ru.name")).toBe(false);
    expect(needsSource(draft, "texts.en.description")).toBe(false);
    expect(needsSource(draft, "seo.en.title")).toBe(false);
    expect(hasAnyName(draft)).toBe(true);
    for (const language of ["uz", "ru", "en"] as const) values.texts[language].name = " ";
    expect(hasAnyName(buildDraft(values, []))).toBe(false);
  });

  it("fills empty and placeholder keys the AI can write", () => {
    const values = form();
    values.texts.uz.description = "asdf";
    for (const language of ["uz", "ru", "en"] as const) values.texts[language].usage = "";
    const draft = buildDraft(
      values,
      serum.images.map((image) => image.id),
    );
    const keys = fillTargets(draft);
    expect(keys).toContain("texts.uz.description");
    expect(keys).toContain("texts.uz.short_description");
    expect(keys).toContain("seo.en.title");
    expect(keys).not.toContain("texts.uz.name");
    expect(keys).not.toContain("texts.en.usage");
    expect(keys.every((key) => !draft[key] || draft[key] === "asdf")).toBe(true);
  });

  it("improves filled descriptions, usage and SEO only", () => {
    const values = form();
    values.texts.ru.usage = "Test";
    const draft = buildDraft(
      values,
      serum.images.map((image) => image.id),
    );
    const keys = improveTargets(draft);
    expect(keys).toContain("texts.uz.description");
    expect(keys).toContain("texts.uz.usage");
    expect(keys).toContain("seo.uz.title");
    expect(keys).not.toContain("texts.ru.usage");
    expect(keys.some((key) => key.endsWith(".name") || key.endsWith(".ingredients"))).toBe(false);
    expect(keys.some((key) => key.startsWith("images."))).toBe(false);
    expect(keys).not.toContain("seo.en.title");
  });
});
