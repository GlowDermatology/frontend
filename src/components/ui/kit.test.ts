import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { Button, IconButton } from "./button";
import { comboboxSections, nextEnabledIndex, type ComboboxItems } from "./combobox";
import { kitCopy } from "./copy";
import { FormErrorSummary } from "./form-errors";
import { SegmentedControl } from "./segmented-control";
import { ToastProvider, isUrgentTone, toastDuration, toastRegion } from "./toast";
import { Tooltip, TooltipProvider } from "./tooltip";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element);

/* Components whose children are required props, typed for `createElement(type, props, child)`. */
const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const Tip = Tooltip as unknown as FC<{ content: ReactNode; children?: ReactNode }>;
const Tips = TooltipProvider as FC<{ children?: ReactNode }>;
const Toasts = ToastProvider as FC<{ children?: ReactNode }>;

describe("Button", () => {
  it("renders an ordinary button", () => {
    const html = render(createElement(Button, { type: "submit" }, "Saqlash"));
    expect(html).toMatch(/^<button type="submit"/);
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toMatch(/\sdisabled=""/);
  });

  it("busy: focusable, aria-busy + aria-disabled, never submits", () => {
    const html = render(createElement(Button, { type: "submit", busy: true }, "Saqlanmoqda…"));
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("cursor-wait");
    expect(html).not.toMatch(/\sdisabled=""/);
  });

  it("keeps the legacy disabled + aria-busy behaviour", () => {
    const html = render(
      createElement(Button, { disabled: true, "aria-busy": true }, "Saqlanmoqda…"),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/\sdisabled=""/);
  });

  it("keeps a plain legacy disabled as a real attribute", () => {
    expect(render(createElement(Button, { disabled: true }, "X"))).toMatch(/\sdisabled=""/);
  });

  it("disabledReason: focusable, described by a hidden reason, keeps its type", () => {
    const html = render(
      createElement(
        Button,
        { type: "submit", disabledReason: "Avval mutaxassisni tanlang", "aria-describedby": "h" },
        "Qabul qo‘shish",
      ),
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('data-disabled=""');
    expect(html).not.toMatch(/\sdisabled=""/);
    const id = /<span id="([^"]+)" hidden="">Avval mutaxassisni tanlang<\/span>/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`aria-describedby="h ${id}"`);
  });

  it("a falsy reason leaves the button working", () => {
    for (const disabledReason of [false, null, "", undefined] as const) {
      expect(render(createElement(Button, { disabledReason }, "OK"))).not.toContain(
        "aria-disabled",
      );
    }
  });

  it("IconButton takes busy and disabledReason too", () => {
    const busy = render(createElement(IconButton, { "aria-label": "O‘chirish", busy: true }));
    expect(busy).toContain('aria-busy="true"');
    const reason = render(
      createElement(IconButton, { "aria-label": "O‘chirish", disabledReason: "Ishlatilmoqda" }),
    );
    expect(reason).toContain('aria-label="O‘chirish"');
    expect(reason).toContain('aria-disabled="true"');
    expect(reason).toContain("Ishlatilmoqda");
  });
});

describe("Tooltip", () => {
  it("renders only its trigger on the server, with or without a provider", () => {
    const trigger = createElement("button", { type: "button" }, "?");
    expect(render(createElement(Tip, { content: "Yordam" }, trigger))).toBe(
      '<button type="button" data-state="closed">?</button>',
    );
    expect(
      render(createElement(Tips, null, createElement(Tip, { content: "Yordam" }, trigger))),
    ).toContain("?</button>");
  });
});

describe("SegmentedControl", () => {
  it("keeps a reason option focusable and described", () => {
    const html = render(
      createElement(SegmentedControl<"a" | "b">, {
        label: "Usul",
        value: "a",
        onChange: vi.fn(),
        options: [
          { value: "a", label: "Olib ketish" },
          { value: "b", label: "Yetkazish", disabledReason: "Avval manzilni kiriting" },
        ],
      }),
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/aria-disabled="true"[^>]*value="b"/);
    expect(html).not.toMatch(/\sdisabled=""[^>]*value="b"/);
    expect(html).toContain("Avval manzilni kiriting");
  });

  it("treats a title on a disabled option as its reason", () => {
    const html = render(
      createElement(SegmentedControl<"a" | "b">, {
        label: "Usul",
        value: "a",
        onChange: vi.fn(),
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true, title: "Sabab" },
        ],
      }),
    );
    expect(html).toMatch(/aria-disabled="true"[^>]*value="b"/);
    expect(html).toContain("Sabab");
  });
});

describe("Combobox model", () => {
  const items: ComboboxItems<string> = [
    { value: "any", label: "Hammasi", text: "Hammasi" },
    {
      label: "Buyurtma",
      options: [
        { value: "order.created", label: "Yaratildi", text: "Buyurtma yaratildi" },
        { value: "order.paid", label: "To‘landi", text: "Buyurtma to‘landi", disabled: true },
      ],
    },
    {
      label: "Mahsulot",
      options: [{ value: "product.updated", label: "Yangilandi", text: "Mahsulot yangilandi" }],
    },
  ];

  it("groups the visible options and numbers them in navigation order", () => {
    const { sections, flat } = comboboxSections(items, "");
    expect(sections.map((s) => s.label)).toEqual([null, "Buyurtma", "Mahsulot"]);
    expect(flat.map((o) => o.value)).toEqual([
      "any",
      "order.created",
      "order.paid",
      "product.updated",
    ]);
    expect(sections[2]?.options[0]?.index).toBe(3);
  });

  it("drops groups without matches (accent- and apostrophe-insensitive)", () => {
    const { sections, flat } = comboboxSections(items, "tolandi");
    expect(sections.map((s) => s.label)).toEqual([]);
    const typed = comboboxSections(items, "to‘landi");
    expect(typed.sections.map((s) => s.label)).toEqual(["Buyurtma"]);
    expect(flat).toEqual([]);
  });

  it("skips disabled options when moving", () => {
    const { flat } = comboboxSections(items, "");
    expect(nextEnabledIndex(flat, 1, 1)).toBe(3);
    expect(nextEnabledIndex(flat, 3, -1)).toBe(1);
    expect(nextEnabledIndex(flat, 3, 1)).toBe(3);
    expect(nextEnabledIndex(flat, 0, 0)).toBe(0);
    expect(nextEnabledIndex([], 0, 1)).toBe(-1);
    expect(nextEnabledIndex([{ value: "x", label: "x", text: "x", disabled: true }], 0, 0)).toBe(
      -1,
    );
  });
});

describe("Toast", () => {
  it("lasts 6 s for success/info, 10 s for warning/danger, or as asked", () => {
    expect(toastDuration({})).toBe(6000);
    expect(toastDuration({ tone: "info" })).toBe(6000);
    expect(toastDuration({ tone: "warning" })).toBe(10_000);
    expect(toastDuration({ tone: "danger" })).toBe(10_000);
    expect(toastDuration({ tone: "danger", duration: 2000 })).toBe(2000);
    expect(toastDuration({ duration: "sticky" })).toBeNull();
  });

  it("routes warnings and failures to the alert region", () => {
    expect(isUrgentTone("danger")).toBe(true);
    expect(isUrgentTone("warning")).toBe(true);
    expect(isUrgentTone("success")).toBe(false);
    expect(isUrgentTone(undefined)).toBe(false);
    expect(toastRegion({ tone: "danger" })).toBe("alert");
    expect(toastRegion({ tone: "success" })).toBe("status");
  });

  it("announces a failure politely when an on-page summary already interrupts", () => {
    expect(toastRegion({ tone: "danger", polite: true })).toBe("status");
    expect(toastRegion({ tone: "warning", polite: true })).toBe("status");
  });

  it("renders both live regions", () => {
    const html = render(createElement(Toasts, null, "x"));
    expect(html).toContain('role="alert"');
    expect(html).toContain('role="status"');
  });
});

describe("FormErrorSummary", () => {
  const errors = [
    { name: "price", label: "Narx", message: "Narxni kiriting" },
    { name: "images", label: "Rasmlar", message: "Kamida bitta rasm qo‘shing" },
  ];

  it("lists one link per field under an alert heading", () => {
    const html = render(createElement(FormErrorSummary, { errors, onSelect: vi.fn() }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("2 ta maydonni tekshiring");
    expect(html).toContain('href="#price"');
    expect(html).toContain("Narx");
    expect(html).toContain("Kamida bitta rasm qo‘shing");
  });

  it("speaks the admin language", () => {
    const ru = render(
      createElement(
        LocaleProvider,
        { locale: "ru" },
        createElement(FormErrorSummary, { errors, onSelect: vi.fn() }),
      ),
    );
    expect(ru).toContain("Проверьте 2 поля");
    const en = render(
      createElement(
        LocaleProvider,
        { locale: "en" },
        createElement(FormErrorSummary, { errors: errors.slice(0, 1), onSelect: vi.fn() }),
      ),
    );
    expect(en).toContain("Check 1 field");
  });

  it("renders nothing without errors", () => {
    expect(render(createElement(FormErrorSummary, { errors: [], onSelect: vi.fn() }))).toBe("");
  });
});

describe("kit copy", () => {
  it("has the same keys in every language and plural-aware counts", () => {
    const keys = (value: object): string[] =>
      Object.entries(value).flatMap(([key, child]) =>
        typeof child === "object" && child !== null ? keys(child).map((k) => `${key}.${k}`) : [key],
      );
    expect(keys(kitCopy.ru)).toEqual(keys(kitCopy.uz));
    expect(keys(kitCopy.en)).toEqual(keys(kitCopy.uz));
    expect(kitCopy.ru.formErrors.summaryTitle(1)).toBe("Проверьте 1 поле");
    expect(kitCopy.ru.formErrors.summaryTitle(5)).toBe("Проверьте 5 полей");
    expect(kitCopy.ru.formErrors.summaryTitle(22)).toBe("Проверьте 22 поля");
    expect(kitCopy.ru.formErrors.summaryTitle(12)).toBe("Проверьте 12 полей");
    expect(kitCopy.en.formErrors.summaryTitle(3)).toBe("Check 3 fields");
  });
});
