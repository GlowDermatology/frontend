import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { SelectMenu } from "./menu";
import {
  SELECT_EMPTY_VALUE,
  Select,
  findSelectOption,
  flattenSelectOptions,
  fromRadixValue,
  optionText,
  toRadixValue,
  type SelectItems,
} from "./select";

const ITEMS: SelectItems = [
  { value: "", label: "Hammasi" },
  {
    label: "Buyurtmalar",
    options: [
      { value: "order.created", label: "Yaratildi" },
      { value: "order.cancelled", label: "Bekor qilindi", disabledReason: "Faqat menejerlar" },
    ],
  },
  { value: "x", label: createElement("b", null, "Qalin"), text: "Qalin" },
];

describe("select model", () => {
  it("flattens groups in display order", () => {
    expect(flattenSelectOptions(ITEMS).map((o) => o.value)).toEqual([
      "",
      "order.created",
      "order.cancelled",
      "x",
    ]);
  });

  it("finds an option by value, also inside a group", () => {
    expect(findSelectOption(ITEMS, "order.created")?.label).toBe("Yaratildi");
    expect(findSelectOption(ITEMS, "missing")).toBeUndefined();
    expect(findSelectOption(ITEMS, undefined)).toBeUndefined();
  });

  it("maps an empty-string option to the sentinel and back", () => {
    expect(toRadixValue(ITEMS, "")).toBe(SELECT_EMPTY_VALUE);
    expect(toRadixValue([{ value: "a", label: "A" }], "")).toBe("");
    expect(toRadixValue(ITEMS, "x")).toBe("x");
    expect(fromRadixValue(SELECT_EMPTY_VALUE)).toBe("");
    expect(fromRadixValue("x")).toBe("x");
  });

  it("uses text, else a string label, for typeahead", () => {
    expect(optionText({ value: "a", label: "Alfa" })).toBe("Alfa");
    expect(optionText({ value: "x", label: createElement("b"), text: "Qalin" })).toBe("Qalin");
    expect(optionText({ value: "y", label: createElement("b") })).toBeUndefined();
  });
});

describe("Select markup (server render)", () => {
  it("renders the chosen label and data-value in the trigger", () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        id: "kind",
        options: ITEMS,
        value: "order.created",
        onValueChange: vi.fn(),
        "aria-describedby": "kind-hint",
      }),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('id="kind"');
    expect(html).toContain('data-value="order.created"');
    expect(html).toContain("Yaratildi");
    expect(html).toContain('aria-describedby="kind-hint"');
    expect(html).not.toContain('aria-invalid="');
  });

  it("shows the empty-value option's label, not the placeholder", () => {
    const html = renderToStaticMarkup(createElement(Select, { options: ITEMS, value: "" }));
    expect(html).toContain("Hammasi");
    expect(html).toContain('data-value=""');
    expect(html).not.toContain("Tanlang");
  });

  it("shows the localized placeholder when nothing matches", () => {
    const options = [{ value: "a", label: "Alfa" }];
    expect(renderToStaticMarkup(createElement(Select, { options, value: "" }))).toContain(
      "Tanlang",
    );
    const ru = renderToStaticMarkup(
      createElement(
        AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>,
        { locale: "ru" },
        createElement(Select, { options, value: "" }),
      ),
    );
    expect(ru).toContain("Выберите");
  });

  it("marks invalid and required, and submits through a hidden input", () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        options: ITEMS,
        defaultValue: "x",
        name: "kind",
        required: true,
        "aria-invalid": true,
      }),
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('<input type="hidden" name="kind" value="x"/>');
  });

  it("renders a filter trigger with a prefix and an accessible name", () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        variant: "filter",
        prefix: "Holat:",
        "aria-label": "Holat",
        options: ITEMS,
        value: "",
      }),
    );
    expect(html).toContain('aria-label="Holat"');
    expect(html).toContain("Holat:");
    expect(html).toContain("min-w-[180px]");
  });

  it("server-renders a native select with nativeFallback (no-JS forms)", () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        nativeFallback: true,
        name: "sort",
        options: [
          { value: "new", label: "Yangi" },
          { label: "Narx", options: [{ value: "cheap", label: "Arzon" }] },
          { value: "off", label: "O‘chiq", disabledReason: "Hozir yo‘q" },
        ],
        value: "cheap",
      }),
    );
    expect(html).toContain('<select data-value="cheap" name="sort"');
    expect(html).toContain('<optgroup label="Narx">');
    expect(html).toMatch(/<option value="cheap" selected="">Arzon<\/option>/);
    expect(html).toMatch(/<option value="off" disabled="">/);
    expect(html).not.toContain('role="combobox"');
  });
});

describe("SelectMenu (compat wrapper)", () => {
  it("keeps the caller's trigger text and names the control by its label", () => {
    const html = renderToStaticMarkup(
      createElement(SelectMenu<"all" | "paid">, {
        label: "To‘lov holati",
        trigger: "To‘lov: Hammasi",
        options: [
          { value: "all", label: "Hammasi" },
          { value: "paid", label: "To‘langan" },
        ],
        value: "all",
        onValueChange: vi.fn(),
        triggerClassName: "h-9",
      }),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="To‘lov holati"');
    expect(html).toContain("To‘lov: Hammasi");
    expect(html).toContain('data-value="all"');
    expect(html).toContain("h-9");
    expect(html).not.toContain("min-w-[180px]");
  });
});
