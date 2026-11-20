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
import { buildDraft } from "@/domain/assistant";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { productsCopy } from "../copy";
import { ProductEditor, productFieldLabel } from "../product-editor";
import { AiFieldButton, AiFieldNote, AssistantBannerView, AssistantMenu } from "./assistant";
import { assistantCopy } from "./copy";
import type { ProductAssistant } from "./use-product-assistant";

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );
const serum = PRODUCTS[0]!;
const imageIds = serum.images.map((image) => image.id);
const draft = buildDraft(serum, imageIds);
const noop = () => undefined;

const fakeAi = (over: Partial<ProductAssistant> = {}): ProductAssistant => ({
  enabled: true,
  running: false,
  fieldKeys: [],
  changes: {},
  problems: {},
  banner: null,
  savedImageIds: imageIds,
  maxImages: 3,
  draft: () => draft,
  runField: noop,
  runMenu: noop,
  insertSuggestion: noop,
  undo: noop,
  undoAll: noop,
  dismissBanner: noop,
  clear: noop,
  ...over,
});

describe("AI assistant in the editor", () => {
  const props = { product: serum, categories: CATEGORIES, lastSyncLabel: "—" };

  it("shows the menu and a ✨ per field only when the assistant is enabled", () => {
    const t = assistantCopy.uz;
    const on = render(
      createElement(ProductEditor, { ...props, assistant: { enabled: true, maxImages: 3 } }),
    );
    expect(on).toContain(t.button);
    expect(on).toContain('data-assistant-state="idle"');
    for (const key of [
      "texts.uz.name",
      "texts.uz.short_description",
      "texts.uz.description",
      "texts.uz.ingredients",
      "texts.uz.usage",
      "seo.uz.title",
      "seo.uz.description",
      `images.${imageIds[0]}.alt.uz`,
    ]) {
      expect(on).toContain(`data-ai-field="${key}"`);
    }
    // the empty uz short description is written, the filled description rewritten
    expect(on).toContain(t.field.writeAria(productsCopy.uz.editor.shortDescription));
    expect(on).toContain(t.field.rewriteAria(productsCopy.uz.editor.description));
    expect(on).toContain('name="texts.uz.shortDescription"');
    expect(on).toContain('name="images.0.alt.uz"');
    const off = render(
      createElement(ProductEditor, { ...props, assistant: { enabled: false, maxImages: 3 } }),
    );
    expect(off).not.toContain(t.button);
    expect(off).not.toContain("data-ai-field");
    const none = render(createElement(ProductEditor, props));
    expect(none).not.toContain(t.button);
  });

  it("hides the assistant on a product that is not saved yet", () => {
    const html = render(
      createElement(ProductEditor, {
        ...props,
        product: null,
        assistant: { enabled: true, maxImages: 3 },
      }),
    );
    expect(html).not.toContain(assistantCopy.uz.button);
    expect(html).not.toContain("data-ai-field");
  });

  it("labels alt-text paths per photo and language", () => {
    expect(productFieldLabel(productsCopy.uz.editor, "images.1.alt.ru")).toBe("Rasm 2 · Ruscha");
    expect(productFieldLabel(productsCopy.en.editor, "texts.ru.shortDescription")).toBe(
      "Short description · Russian",
    );
  });
});

describe("assistant pieces", () => {
  it.each(["uz", "ru", "en"] as const)("names the menu and says when it runs (%s)", (locale) => {
    const t = assistantCopy[locale];
    expect(render(createElement(AssistantMenu, { ai: fakeAi(), draft }), locale)).toContain(
      t.button,
    );
    const running = render(
      createElement(AssistantMenu, { ai: fakeAi({ running: true }), draft }),
      locale,
    );
    expect(running).toContain(t.buttonRunning);
    expect(running).toContain('aria-busy="true"');
  });

  it("spins the running field's button and blocks the others with a reason", () => {
    const t = assistantCopy.ru;
    const ai = fakeAi({ running: true, fieldKeys: ["texts.ru.description"] });
    const spinning = render(
      createElement(AiFieldButton, { ai, draft, aiKey: "texts.ru.description", label: "x" }),
      "ru",
    );
    expect(spinning).toContain('aria-busy="true"');
    const waiting = render(
      createElement(AiFieldButton, { ai, draft, aiKey: "texts.ru.usage", label: "x" }),
      "ru",
    );
    expect(waiting).toContain(t.field.wait);
    const unknownPhoto = render(
      createElement(AiFieldButton, { ai, draft, aiKey: "images.upload-1.alt.ru", label: "x" }),
      "ru",
    );
    expect(unknownPhoto).not.toContain("data-ai-field");
  });

  it("notes an AI text with its warnings, undo and another version", () => {
    const t = assistantCopy.ru;
    const ai = fakeAi({
      changes: {
        "texts.ru.usage": {
          previous: "",
          suggested: "1–2 раза в день",
          warnings: ["unverified_number"],
        },
      },
    });
    const html = render(createElement(AiFieldNote, { ai, aiKey: "texts.ru.usage" }), "ru");
    for (const text of [t.note.title, t.warnings.unverified_number, t.note.undo, t.note.again]) {
      expect(html).toContain(text);
    }
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(render(createElement(AiFieldNote, { ai, aiKey: "texts.ru.name" }), "ru")).not.toContain(
      "data-ai-note",
    );
  });

  it("says why a field got no text", () => {
    const t = assistantCopy.ru;
    const ai = fakeAi({ problems: { "texts.ru.usage": { kind: "unchanged" } } });
    const html = render(createElement(AiFieldNote, { ai, aiKey: "texts.ru.usage" }), "ru");
    expect(html).toContain(t.reasons.unchanged);
    expect(html).toContain('role="status"');
  });

  it("holds an unchecked suggestion over the admin's text for «Insert»", () => {
    const t = assistantCopy.ru;
    const ai = fakeAi({
      problems: {
        "texts.ru.name": {
          kind: "review",
          suggested: "Сыворотка с упаковки",
          warnings: ["confirm_packaging"],
        },
      },
    });
    const html = render(createElement(AiFieldNote, { ai, aiKey: "texts.ru.name" }), "ru");
    for (const text of [
      t.reasons.review,
      "Сыворотка с упаковки",
      t.warnings.confirm_packaging,
      t.note.insert,
    ]) {
      expect(html).toContain(text);
    }
  });

  it("reports a menu command in a banner, with the fields it did not change", () => {
    const t = assistantCopy.ru;
    const labelOf = (key: string) => `[${key}]`;
    const filled = render(
      createElement(AssistantBannerView, {
        ai: fakeAi({
          changes: { "texts.ru.description": { previous: "", suggested: "x", warnings: [] } },
          banner: {
            kind: "filled",
            count: 1,
            problems: [{ key: "texts.en.name", problem: { kind: "skipped" } }],
            extracted: { brand: "Glow", volume: "30 ml" },
          },
        }),
        labelOf,
      }),
      "ru",
    );
    for (const text of [
      t.banner.filled(1),
      t.banner.notChanged,
      "[texts.en.name]",
      t.reasons.skipped,
      t.banner.undoAll,
      t.banner.extracted({ brand: "Glow", volume: "30 ml" }),
    ]) {
      expect(filled).toContain(text);
    }
    const nothing = render(
      createElement(AssistantBannerView, {
        ai: fakeAi({ banner: { kind: "nothing", problems: [], extracted: null } }),
        labelOf,
      }),
      "ru",
    );
    expect(nothing).toContain(t.reasons.fallback);
    expect(nothing).not.toContain(t.banner.undoAll);
    const full = render(
      createElement(AssistantBannerView, {
        ai: fakeAi({ banner: { kind: "nothingToFill" } }),
        labelOf,
      }),
      "ru",
    );
    expect(full).toContain(t.nothingToFill);
  });
});
