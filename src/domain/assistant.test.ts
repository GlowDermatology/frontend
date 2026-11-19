import { describe, expect, it } from "vitest";

import { PRODUCTS } from "@/data/mock/catalog";

import {
  candidateKeys,
  formPathOf,
  isAwaitingReview,
  keyLanguage,
  keyMaxLength,
  keyOf,
  keyValue,
  parseKey,
  productKeys,
  suggestionProblem,
  withKeysFrom,
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

  it("reads values and offers empty keys, or filled ones for improve", () => {
    expect(keyValue(serum, "texts.uz.name")).toBe("Gialuron kislotali serum");
    expect(keyValue(serum, "images.img-1.alt.uz")).toContain("serum");
    expect(keyValue(serum, "images.nope.alt.uz")).toBeNull();
    const all = productKeys(serum);
    expect(all).toHaveLength(3 * 5 + 3 * 2 + serum.images.length * 3);
    const empty = candidateKeys(serum, "fill_missing", ["en"]);
    expect(empty).toContain("texts.en.description");
    expect(empty).not.toContain("texts.en.name");
    expect(empty.every((key) => keyLanguage(key) === "en")).toBe(true);
    const filled = candidateKeys(serum, "improve", ["uz"]);
    expect(filled).toContain("texts.uz.description");
    expect(filled).not.toContain("texts.uz.short_description");
  });

  it("re-bases only the applied keys", () => {
    const next = structuredClone(serum);
    next.texts.ru.shortDescription = "Кратко";
    next.texts.uz.name = "Changed elsewhere";
    next.images[1]!.alt = { uz: "Qadoq", ru: "", en: "" };
    const rebased = withKeysFrom(serum, next, [
      "texts.ru.short_description",
      "images.img-2.alt.uz",
    ]);
    expect(rebased.texts.ru.shortDescription).toBe("Кратко");
    expect(rebased.texts.uz.name).toBe(serum.texts.uz.name);
    expect(rebased.images[1]!.alt).toEqual({ uz: "Qadoq", ru: "", en: "" });
    expect(serum.texts.ru.shortDescription).toBe("");
  });

  it("checks review values and job states", () => {
    expect(suggestionProblem("  ", 10)).toBe("blank");
    expect(suggestionProblem("x".repeat(11), 10)).toBe("too_long");
    expect(suggestionProblem("ok", 10)).toBeNull();
    expect(isAwaitingReview({ state: "succeeded", outcome: "pending" })).toBe(true);
    expect(isAwaitingReview({ state: "succeeded", outcome: "partial" })).toBe(false);
  });
});
