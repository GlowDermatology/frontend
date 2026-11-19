import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { ToastProvider } from "@/components/ui/toast";
import { PRODUCTS } from "@/data/mock/catalog";
import { CATEGORIES } from "@/data/mock/categories";
import type { AssistantSuggestion } from "@/domain/assistant";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { productsCopy } from "../copy";
import { ProductEditor, productFieldLabel } from "../product-editor";
import { AssistantCompose, composeBlocker, DEFAULT_COMPOSE } from "./assistant";
import { AssistantReview } from "./assistant-review";
import { assistantCopy } from "./copy";
import { initialReview } from "./review";

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );
const noop = () => undefined;
const serum = PRODUCTS[0]!;
const label = (key: string) => key;

describe("AI assistant in the editor", () => {
  it("shows the button only when the assistant is enabled, and the new fields", () => {
    const props = { product: serum, categories: CATEGORIES, lastSyncLabel: "—" };
    const on = render(
      createElement(ProductEditor, { ...props, assistant: { enabled: true, maxImages: 3 } }),
    );
    expect(on).toContain(assistantCopy.uz.button);
    expect(on).toContain('data-assistant-state="idle"');
    expect(on).toContain('name="texts.uz.shortDescription"');
    expect(on).toContain('name="images.0.alt.uz"');
    expect(on).toContain(productsCopy.uz.editor.altTitle);
    const off = render(
      createElement(ProductEditor, { ...props, assistant: { enabled: false, maxImages: 3 } }),
    );
    expect(off).not.toContain(assistantCopy.uz.button);
    const none = render(createElement(ProductEditor, props));
    expect(none).not.toContain(assistantCopy.uz.button);
  });

  it("labels alt-text paths per photo and language", () => {
    expect(productFieldLabel(productsCopy.uz.editor, "images.1.alt.ru")).toBe("Rasm 2 · Ruscha");
    expect(productFieldLabel(productsCopy.en.editor, "texts.ru.shortDescription")).toBe(
      "Short description · Russian",
    );
  });
});

describe("AssistantCompose", () => {
  const compose = (locale: Locale, settings = DEFAULT_COMPOSE, extra = {}) =>
    render(
      createElement(AssistantCompose, {
        settings,
        onChange: noop,
        product: serum,
        advanced: false,
        onAdvanced: noop,
        unsaved: false,
        labelOf: label,
        error: null,
        starting: false,
        onStart: noop,
        ...extra,
      }),
      locale,
    );

  it.each(["uz", "ru", "en"] as const)("defaults to fill missing, all languages (%s)", (locale) => {
    const t = assistantCopy[locale];
    const html = compose(locale);
    for (const text of [t.mode.fill_missing, t.mode.improve, t.languages, t.generate, t.advanced]) {
      expect(html).toContain(text);
    }
    expect(html.match(/type="checkbox"[^>]*checked=""/g)).toHaveLength(3);
    expect(html).not.toContain("data-assistant-fields");
    expect(html).not.toContain(t.unsaved);
  });

  it("shows the field picker and goal for improve, and why it cannot start yet", () => {
    const settings = { ...DEFAULT_COMPOSE, mode: "improve" as const };
    const html = compose("uz", settings, { unsaved: true, error: "Kunlik limit tugadi." });
    expect(html).toContain("data-assistant-fields");
    expect(html).toContain("texts.uz.description");
    expect(html).toContain(assistantCopy.uz.goal);
    expect(html).toContain(assistantCopy.uz.unsaved);
    expect(html).toContain('role="alert"');
    expect(html).toContain(assistantCopy.uz.needFields);
    const t = assistantCopy.uz;
    expect(composeBlocker(t, { ...DEFAULT_COMPOSE, languages: [] }, serum)).toBe(t.needLanguage);
    expect(composeBlocker(t, { ...DEFAULT_COMPOSE, mode: "photos" }, { images: [] })).toBe(
      t.needPhotos,
    );
    expect(composeBlocker(t, DEFAULT_COMPOSE, serum)).toBeUndefined();
  });
});

describe("AssistantReview", () => {
  const suggestions: AssistantSuggestion[] = [
    {
      key: "texts.ru.short_description",
      current: "",
      suggested: "Лёгкая сыворотка.",
      warnings: [],
      origin: "ai",
      checked: true,
      maxLength: 300,
    },
    {
      key: "seo.ru.title",
      current: "Старый заголовок",
      suggested: "Сыворотка с гиалуроновой кислотой 30 ml — Glow Derma, доставка",
      warnings: ["seo_title_long"],
      origin: "ai",
      checked: true,
      maxLength: 120,
    },
    {
      key: "texts.uz.name",
      current: "",
      suggested: "Serum",
      warnings: ["confirm_packaging"],
      origin: "image",
      checked: false,
      maxLength: 120,
    },
  ];
  const review = (locale: Locale, blocked: (key: string) => boolean = () => false) =>
    render(
      createElement(AssistantReview, {
        suggestions,
        notes: { rejected: 1, dropped: 0, extracted: { volume: "30 ml" } },
        state: initialReview(suggestions, blocked),
        onChange: noop,
        isBlocked: blocked,
        labelOf: label,
        errors: {},
        onApply: noop,
        onDiscard: noop,
        applying: false,
        discarding: false,
      }),
      locale,
    );

  it.each(["uz", "ru", "en"] as const)(
    "lists suggestions by language with badges (%s)",
    (locale) => {
      const t = assistantCopy[locale];
      const html = review(locale);
      expect(html).toContain(t.review.count(3));
      // the first language with suggestions is shown: uz (1 row)
      expect(html).toContain('data-key="texts.uz.name"');
      expect(html).not.toContain('data-key="seo.ru.title"');
      expect(html).toContain(t.warnings.confirm_packaging);
      expect(html).toContain(t.review.rejected(1));
      expect(html).toContain("30 ml");
      // only the two pre-checked ru rows are selected
      expect(html).toContain(t.review.apply(2));
      expect(html).toContain(t.review.discard);
    },
  );

  it("blocks a field with unsaved edits", () => {
    const html = review("uz", (key) => key === "texts.uz.name");
    expect(html).toContain(assistantCopy.uz.review.dirty);
    expect(html).toContain('aria-disabled="true"');
  });
});
