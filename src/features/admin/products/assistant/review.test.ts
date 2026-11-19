import { describe, expect, it } from "vitest";

import type { AssistantSuggestion } from "@/domain/assistant";

import {
  applyItems,
  forgetJob,
  groupByLanguage,
  hasSelectedProblem,
  initialReview,
  itemErrors,
  rememberedJob,
  rememberJob,
} from "./review";

const suggestion = (key: string, over: Partial<AssistantSuggestion> = {}): AssistantSuggestion => ({
  key,
  current: "",
  suggested: `[s] ${key}`,
  warnings: [],
  origin: "ai",
  checked: true,
  maxLength: 120,
  ...over,
});

const list = [
  suggestion("texts.ru.name"),
  suggestion("texts.uz.short_description"),
  suggestion("images.3.alt.en", { origin: "image", checked: false }),
  suggestion("seo.ru.title"),
];

describe("assistant review", () => {
  it("keeps the server's pre-selection but never pre-selects a field with unsaved edits", () => {
    const state = initialReview(list, (key) => key === "seo.ru.title");
    expect(state["texts.ru.name"]).toEqual({ checked: true, value: "[s] texts.ru.name" });
    expect(state["images.3.alt.en"]!.checked).toBe(false);
    expect(state["seo.ru.title"]!.checked).toBe(false);
  });

  it("groups by language in uz, ru, en order", () => {
    expect(groupByLanguage(list).map((g) => [g.language, g.suggestions.length])).toEqual([
      ["uz", 1],
      ["ru", 2],
      ["en", 1],
    ]);
  });

  it("sends only the selected, unblocked rows with trimmed values", () => {
    const state = initialReview(list, () => false);
    state["texts.ru.name"]!.value = "  Сыворотка  ";
    state["images.3.alt.en"]!.checked = true;
    const blocked = (key: string) => key === "seo.ru.title";
    expect(applyItems(list, state, blocked)).toEqual([
      { key: "texts.ru.name", value: "Сыворотка" },
      { key: "texts.uz.short_description", value: "[s] texts.uz.short_description" },
      { key: "images.3.alt.en", value: "[s] images.3.alt.en" },
    ]);
    expect(hasSelectedProblem(list, state, blocked)).toBe(false);
    state["texts.ru.name"]!.value = " ";
    expect(hasSelectedProblem(list, state, blocked)).toBe(true);
    state["texts.ru.name"]!.checked = false;
    expect(hasSelectedProblem(list, state, blocked)).toBe(false);
  });

  it("maps apply field errors back to their keys", () => {
    const items = [
      { key: "texts.ru.name", value: "a" },
      { key: "seo.ru.title", value: "b" },
    ];
    expect(
      itemErrors(items, { "items.1.value": "Too long", "items.5.value": "x", items: "y" }),
    ).toEqual({ "seo.ru.title": "Too long" });
  });

  it("remembers one job per product", () => {
    const data = new Map<string, string>();
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
    rememberJob("12", "41", store);
    expect(rememberedJob("12", store)).toBe("41");
    expect(rememberedJob("13", store)).toBeNull();
    forgetJob("12", store);
    expect(rememberedJob("12", store)).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(() => rememberJob("1", "2", broken)).not.toThrow();
    expect(rememberedJob("1", broken)).toBeNull();
  });
});
