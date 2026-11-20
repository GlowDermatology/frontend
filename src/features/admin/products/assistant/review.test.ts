import { describe, expect, it } from "vitest";

import { PRODUCTS } from "@/data/mock/catalog";
import { buildDraft, SUGGESTION_WARNINGS, type AssistantDraft } from "@/domain/assistant";

import { assistantCopy } from "./copy";
import {
  fieldBlocker,
  fieldRequest,
  forgetJob,
  markedLanguages,
  menuBlocker,
  menuRequest,
  problemsOf,
  problemText,
  rememberedJob,
  rememberJob,
  warningTexts,
} from "./review";

const serum = PRODUCTS[0]!;
const imageIds = serum.images.map((image) => image.id);
const t = assistantCopy.ru;
const draftOf = (edit?: (draft: AssistantDraft) => void) => {
  const draft = buildDraft(serum, imageIds);
  edit?.(draft);
  return draft;
};

describe("what a click starts", () => {
  it("writes an empty field and rewrites a filled one, sending the whole draft", () => {
    const draft = draftOf((d) => {
      d["texts.ru.short_description"] = "Тест";
    });
    expect(fieldRequest(draft, "texts.ru.short_description")).toEqual({
      mode: "fill_missing",
      languages: ["ru"],
      keys: ["texts.ru.short_description"],
      goal: "professional",
      imageIds: [],
      draft,
    });
    const improve = fieldRequest(draft, "seo.uz.title");
    expect(improve.mode).toBe("improve");
    expect(improve.keys).toEqual(["seo.uz.title"]);
    expect(Object.keys(improve.draft)).toHaveLength(Object.keys(draft).length);
  });

  it("blocks a field's button while a job runs, or when there is nothing to translate", () => {
    const draft = draftOf((d) => {
      for (const language of ["uz", "ru", "en"]) d[`texts.${language}.usage`] = "";
    });
    expect(fieldBlocker(t, draft, "texts.en.description", true)).toBe(t.field.wait);
    expect(fieldBlocker(t, draft, "texts.en.usage", false)).toBe(t.field.needSource);
    expect(fieldBlocker(t, draft, "texts.en.description", false)).toBeUndefined();
    expect(fieldBlocker(t, draft, "texts.en.name", false)).toBeUndefined();
    const nameless = draftOf((d) => {
      for (const language of ["uz", "ru", "en"]) {
        d[`texts.${language}.name`] = "";
        d[`texts.${language}.description`] = "";
      }
    });
    expect(fieldBlocker(t, nameless, "texts.en.description", false)).toBe(t.fill.needName);
  });

  it("builds the three menu commands from the current values", () => {
    const draft = draftOf((d) => {
      d["texts.uz.usage"] = "asdf";
    });
    const fill = menuRequest("fill", draft, imageIds, 3);
    expect(fill.mode).toBe("fill_missing");
    expect(fill.languages).toEqual(["uz", "ru", "en"]);
    expect(fill.keys).toContain("texts.uz.usage");
    expect(fill.keys).toContain("texts.ru.short_description");
    expect(fill.keys).not.toContain("texts.uz.name");
    expect(fill.draft).toBe(draft);
    const improve = menuRequest("improve", draft, imageIds, 3);
    expect(improve).toMatchObject({ mode: "improve", goal: "professional", imageIds: [] });
    expect(improve.keys).toContain("texts.uz.description");
    expect(improve.keys).not.toContain("texts.uz.usage");
    expect(improve.keys).not.toContain("texts.uz.name");
    const photos = menuRequest("photos", draft, ["1", "2", "3", "4"], 3);
    expect(photos).toMatchObject({ mode: "photos", keys: [], imageIds: ["1", "2", "3"] });
  });

  it("explains why a menu command cannot run", () => {
    const draft = draftOf();
    expect(menuBlocker(t, "fill", draft, imageIds)).toBeUndefined();
    expect(menuBlocker(t, "improve", draft, imageIds)).toBeUndefined();
    expect(menuBlocker(t, "photos", draft, imageIds)).toBeUndefined();
    expect(menuBlocker(t, "photos", draft, [])).toBe(t.photos.none);
    const nameless = draftOf((d) => {
      for (const language of ["uz", "ru", "en"]) d[`texts.${language}.name`] = "Test";
    });
    expect(menuBlocker(t, "fill", nameless, imageIds)).toBe(t.fill.needName);
    const full = draftOf((d) => {
      for (const key of Object.keys(d)) d[key] ||= "Готовый текст";
    });
    expect(menuBlocker(t, "fill", full, imageIds)).toBe(t.fill.none);
    const empty = draftOf((d) => {
      for (const key of Object.keys(d)) if (!key.endsWith(".name")) d[key] = "";
    });
    expect(menuBlocker(t, "improve", empty, imageIds)).toBe(t.improve.none);
  });
});

describe("what came back, in plain words", () => {
  it("keys the job notes and words every reason without codes", () => {
    const problems = problemsOf({
      keys: [
        { key: "texts.uz.name", kind: "rejected", reason: "pos_label" },
        { key: "texts.ru.usage", kind: "rejected", reason: "unsupported_number" },
        { key: "texts.en.usage", kind: "rejected", reason: "too_long" },
        { key: "seo.uz.title", kind: "rejected", reason: "something_new" },
        { key: "texts.en.name", kind: "skipped", reason: "no source text" },
        { key: "texts.uz.usage", kind: "unchanged", reason: "" },
        { key: "texts.uz.usage", kind: "skipped", reason: "later" },
      ],
      dropped: 0,
      extracted: null,
    });
    expect(problemText(t, problems["texts.uz.name"]!)).toBe(t.reasons.posLabel);
    expect(problemText(t, problems["texts.ru.usage"]!)).toBe(t.reasons.factAdded);
    expect(problemText(t, problems["texts.en.usage"]!)).toBe(t.reasons.tooLong);
    expect(problemText(t, problems["seo.uz.title"]!)).toBe(t.reasons.factAdded);
    expect(problemText(t, problems["texts.en.name"]!)).toBe(t.reasons.skipped);
    expect(problemText(t, problems["texts.uz.usage"]!)).toBe(t.reasons.unchanged);
    expect(problemText(t, { kind: "edited" })).toBe(t.reasons.edited);
    expect(problemText(t, { kind: "fallback" })).toBe(t.reasons.fallback);
    expect(problemsOf(null)).toEqual({});
  });

  it.each(["uz", "ru", "en"] as const)("words every suggestion warning (%s)", (locale) => {
    const texts = warningTexts(assistantCopy[locale], SUGGESTION_WARNINGS);
    expect(texts).toHaveLength(SUGGESTION_WARNINGS.length);
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/_/);
    }
  });

  it("marks the languages holding AI texts per tab group", () => {
    const keys = ["texts.ru.description", "seo.en.title", "images.7.alt.uz", "texts.ru.name"];
    expect(markedLanguages(keys, "text")).toEqual({ ru: true });
    expect(markedLanguages(keys, "seo")).toEqual({ en: true });
    expect(markedLanguages(keys, "alt")).toEqual({ uz: true });
  });
});

describe("the job kept per product", () => {
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
