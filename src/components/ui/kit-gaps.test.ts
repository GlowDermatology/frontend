import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { Breadcrumbs } from "./breadcrumbs";
import { Combobox } from "./combobox";
import { DatePicker } from "./date-picker";
import { DateRangePicker } from "./date-range-picker";
import { DateTimePicker } from "./date-time-picker";
import { isReasonKey } from "./disabled-reason";
import { Field } from "./field";
import { Icon } from "./icon";
import { ActionMenu, SelectMenu } from "./menu";
import { PhoneInput } from "./phone-input";
import { Select } from "./select";
import { Switch } from "./switch";
import { TimePicker } from "./time-picker";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element);
const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const inLocale = (locale: Locale, element: ReactNode) =>
  render(createElement(LocaleProvider, { locale }, element));
const noop = () => {};
/* `Field` takes its control as a render function; typed for `createElement(type, props, child)`. */
const FieldOf = Field as unknown as FC<{
  label: ReactNode;
  name?: string;
  error?: string;
  children?: ReactNode;
}>;

const REASON = "Avval sanani tanlang";

/** The opening tag of the first element matching `pattern` (e.g. `<button[^>]*role="combobox"`). */
function tag(html: string, pattern: string): string {
  const match = new RegExp(`${pattern}[^>]*>`).exec(html);
  if (!match) throw new Error(`no tag ${pattern} in ${html}`);
  return match[0];
}

/** The id of the hidden reason, read from where the text sits. */
function reasonId(html: string, reason = REASON): string {
  const match = new RegExp(`<span id="([^"]+)" hidden="">${reason}</span>`).exec(html);
  if (!match) throw new Error(`no hidden reason in ${html}`);
  return match[1]!;
}

/** The disabled-reason contract on one focusable element. */
function expectReason(element: string, html: string, describedBy?: string) {
  expect(element).toContain('aria-disabled="true"');
  expect(element).toContain('data-disabled=""');
  expect(element).not.toMatch(/\sdisabled=""/);
  const described = /aria-describedby="([^"]+)"/.exec(element)?.[1]?.split(" ") ?? [];
  expect(described).toContain(reasonId(html));
  if (describedBy) expect(described).toContain(describedBy);
}

describe("Field name", () => {
  /* The render function passed as the child (`createElement` types children as nodes). */
  const input = ((control: object) => createElement("input", control)) as unknown as ReactNode;

  it("marks the wrapper with data-field and keeps the control's own props", () => {
    const html = render(createElement(FieldOf, { label: "Narx", name: "variants.0.price" }, input));
    expect(html).toMatch(/^<div class="flex flex-col gap-2" data-field="variants.0.price">/);
    expect(html).not.toContain("data-invalid");
    expect(tag(html, "<input")).not.toContain("name=");
  });

  it("adds data-invalid while there is an error, next to aria-invalid on the control", () => {
    const html = render(
      createElement(FieldOf, { label: "Narx", name: "price", error: "Narxni kiriting" }, input),
    );
    expect(tag(html, "<div")).toContain('data-field="price"');
    expect(tag(html, "<div")).toContain('data-invalid="true"');
    expect(tag(html, "<input")).toContain('aria-invalid="true"');
  });

  it("renders as before without a name", () => {
    const html = render(createElement(FieldOf, { label: "Narx" }, input));
    expect(html).toMatch(/^<div class="flex flex-col gap-2">/);
  });
});

describe("Select disabledReason", () => {
  const options = [
    { value: "a", label: "Birinchi" },
    { value: "b", label: "Ikkinchi" },
  ];

  it("keeps the trigger focusable, described by the reason, and still submits", () => {
    const html = render(
      createElement(Select, {
        id: "slot",
        name: "time",
        options,
        value: "a",
        "aria-describedby": "slot-hint",
        disabledReason: REASON,
      }),
    );
    const trigger = tag(html, '<button[^>]*role="combobox"');
    expectReason(trigger, html, "slot-hint");
    expect(trigger).toContain('id="slot"');
    expect(trigger).toContain('data-value="a"');
    expect(trigger).toContain('data-state="closed"');
    expect(html).toContain(">Birinchi<");
    expect(html).toContain('<input type="hidden" name="time" value="a"/>');
  });

  it("wins over disabled", () => {
    const html = render(createElement(Select, { options, disabled: true, disabledReason: REASON }));
    expectReason(tag(html, '<button[^>]*role="combobox"'), html);
  });

  it("is an ordinary trigger without a reason", () => {
    const html = render(
      createElement(Select, {
        options,
        value: "b",
        "aria-describedby": "h",
        disabledReason: false,
      }),
    );
    const trigger = tag(html, '<button[^>]*role="combobox"');
    expect(trigger).not.toContain("aria-disabled");
    expect(trigger).not.toContain('data-disabled=""');
    expect(trigger).toContain('aria-describedby="h"');
    expect(html).not.toContain(`hidden=""`);
  });

  it("keeps a plain disabled as a real attribute", () => {
    const html = render(createElement(Select, { options, disabled: true }));
    expect(tag(html, '<button[^>]*role="combobox"')).toMatch(/\sdisabled=""/);
  });

  it("describes the native fallback too", () => {
    const html = render(
      createElement(Select, {
        options,
        name: "sort",
        defaultValue: "a",
        nativeFallback: true,
        disabledReason: REASON,
      }),
    );
    expect(tag(html, "<select")).toContain('aria-disabled="true"');
    expect(html).toContain('<input type="hidden" name="sort" value="a"/>');
  });

  it("reaches SelectMenu", () => {
    const html = render(
      createElement(SelectMenu, {
        trigger: "Holat: Hammasi",
        label: "Holat",
        options,
        value: "a",
        onValueChange: noop,
        disabledReason: REASON,
      }),
    );
    expectReason(tag(html, '<button[^>]*role="combobox"'), html);
  });
});

describe("Combobox disabledReason", () => {
  const base = {
    trigger: "Hammasi",
    label: "Amal",
    options: [{ value: "a", label: "A", text: "A" }],
    value: "a",
    onValueChange: noop,
  };

  it("describes the trigger and keeps the popover closed", () => {
    const html = render(
      createElement(Combobox<string>, { ...base, describedBy: "e", disabledReason: REASON }),
    );
    const trigger = tag(html, '<button[^>]*aria-haspopup="dialog"');
    expectReason(trigger, html, "e");
    expect(trigger).toContain('data-state="closed"');
  });

  it("takes a plain disabled", () => {
    const html = render(createElement(Combobox<string>, { ...base, disabled: true }));
    expect(tag(html, '<button[^>]*aria-haspopup="dialog"')).toMatch(/\sdisabled=""/);
  });
});

describe("ActionMenu", () => {
  const base = { trigger: "Amallar", label: "Amallar", items: [] };

  it("disabledReason keeps the trigger focusable", () => {
    const html = render(createElement(ActionMenu, { ...base, disabledReason: REASON }));
    expectReason(tag(html, '<button[^>]*aria-haspopup="menu"'), html);
  });

  it("busy is focusable and aria-busy", () => {
    const html = render(createElement(ActionMenu, { ...base, busy: true }));
    const trigger = tag(html, '<button[^>]*aria-haspopup="menu"');
    expect(trigger).toContain('aria-busy="true"');
    expect(trigger).toContain('aria-disabled="true"');
    expect(trigger).not.toMatch(/\sdisabled=""/);
  });

  it("keeps a plain disabled", () => {
    const html = render(createElement(ActionMenu, { ...base, disabled: true }));
    expect(tag(html, '<button[^>]*aria-haspopup="menu"')).toMatch(/\sdisabled=""/);
  });
});

describe("pickers disabledReason", () => {
  const cases = [
    [
      "date",
      createElement(DatePicker, {
        name: "d",
        value: "2026-11-17",
        clearable: true,
        "aria-describedby": "h",
        disabledReason: REASON,
      }),
      "2026-11-17",
    ],
    [
      "time",
      createElement(TimePicker, {
        name: "d",
        value: "09:30",
        "aria-describedby": "h",
        disabledReason: REASON,
      }),
      "09:30",
    ],
    [
      "datetime",
      createElement(DateTimePicker, {
        name: "d",
        value: "2026-11-17T09:30",
        "aria-describedby": "h",
        disabledReason: REASON,
      }),
      "2026-11-17T09:30",
    ],
    [
      "phone",
      createElement(PhoneInput, {
        name: "d",
        value: "+998901234567",
        "aria-describedby": "h",
        disabledReason: REASON,
      }),
      "+998901234567",
    ],
  ] as const;

  it.each(cases)("%s: read-only, focusable, described, still submitted", (kind, element, value) => {
    const html = render(element);
    expect(html).toContain(`data-picker="${kind}"`);
    /* The outlined box takes the error reveal's ring, not the borderless text box inside. */
    expect(tag(html, "<div[^>]*data-picker=")).toContain('data-reveal-box=""');
    const input = tag(html, '<input[^>]*type="(?:text|tel)"');
    expectReason(input, html, "h");
    expect(input).toContain('readOnly=""');
    expect(html).toContain(`<input type="hidden" name="d" value="${value}"/>`);
    /* The popover button is off, the clear button is gone. */
    expect(html).not.toContain('aria-label="Tozalash"');
    const opener = /<button[^>]*aria-haspopup="dialog"[^>]*>/.exec(html)?.[0];
    if (opener) expect(opener).toMatch(/\sdisabled=""/);
  });

  it("the phone field keeps its country-code description", () => {
    const html = render(createElement(PhoneInput, { disabledReason: REASON }));
    const described = /aria-describedby="([^"]+)"/.exec(tag(html, "<input"))![1]!.split(" ");
    expect(described).toHaveLength(2);
  });

  it("without a reason nothing changes", () => {
    const html = render(createElement(DatePicker, { value: "", "aria-describedby": "h" }));
    const input = tag(html, '<input[^>]*type="text"');
    expect(input).not.toContain("aria-disabled");
    expect(input).not.toContain("readOnly");
    expect(input).toContain('aria-describedby="h"');
  });

  it("the range picker hands the reason to both days", () => {
    const html = render(
      createElement(DateRangePicker, {
        from: "2026-11-01",
        to: "2026-11-17",
        onCommit: noop,
        disabledReason: REASON,
      }),
    );
    const inputs = html.match(/<input[^>]*type="text"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).toContain('aria-disabled="true"');
  });

  it("the range picker takes a plain disabled", () => {
    const html = render(createElement(DateRangePicker, { onCommit: noop, disabled: true }));
    const inputs = html.match(/<input[^>]*type="text"[^>]*>/g) ?? [];
    for (const input of inputs) expect(input).toMatch(/\sdisabled=""/);
  });
});

describe("Switch", () => {
  const base = { checked: true, onCheckedChange: noop, "aria-label": "Faol" };

  it("is an ordinary switch", () => {
    const html = render(createElement(Switch, base));
    expect(html).toMatch(/^<button type="button" role="switch" aria-checked="true"/);
    expect(html).not.toContain("aria-disabled");
  });

  it("disabledReason: focusable and described", () => {
    const html = render(
      createElement(Switch, { ...base, "aria-describedby": "h", disabledReason: REASON }),
    );
    expectReason(tag(html, "<button"), html, "h");
  });

  it("busy: focusable, aria-busy", () => {
    const html = render(createElement(Switch, { ...base, busy: true, disabledReason: REASON }));
    const button = tag(html, "<button");
    expect(button).toContain('aria-busy="true"');
    expect(button).toContain('aria-disabled="true"');
    expect(button).not.toMatch(/\sdisabled=""/);
    expect(html).not.toContain(REASON);
  });

  it("keeps a plain disabled and a caller's aria-disabled", () => {
    expect(render(createElement(Switch, { ...base, disabled: true }))).toMatch(/\sdisabled=""/);
    expect(render(createElement(Switch, { ...base, "aria-disabled": true }))).toContain(
      'aria-disabled="true"',
    );
  });
});

describe("isReasonKey", () => {
  it("swallows keys that would act, lets navigation and shortcuts through", () => {
    for (const key of ["Enter", " ", "ArrowDown", "ArrowUp", "a", "7", "Backspace", "Delete"]) {
      expect(isReasonKey({ key }), key).toBe(true);
    }
    for (const key of ["Tab", "Escape", "Shift", "ArrowLeft", "F5"]) {
      expect(isReasonKey({ key }), key).toBe(false);
    }
    expect(isReasonKey({ key: "c", ctrlKey: true })).toBe(false);
    expect(isReasonKey({ key: "v", metaKey: true })).toBe(false);
  });
});

describe("Breadcrumbs", () => {
  const crumbs = createElement(Breadcrumbs, { items: [{ label: "Buyurtmalar" }] });

  it("names the landmark in the admin language", () => {
    expect(render(crumbs)).toContain('aria-label="Yo‘l"');
    expect(inLocale("ru", crumbs)).toContain('aria-label="Навигационная цепочка"');
    expect(inLocale("en", crumbs)).toContain('aria-label="Breadcrumb"');
  });

  it("takes an explicit label", () => {
    const html = render(createElement(Breadcrumbs, { items: [], label: "Mahsulot" }));
    expect(html).toContain('aria-label="Mahsulot"');
  });
});

describe("affix frames", () => {
  it("mark their outlined box for the error reveal", async () => {
    const { AffixInput, SearchInput } = await import("./field");
    expect(render(createElement(AffixInput, { suffix: "%" }))).toMatch(/^<span data-reveal-box=""/);
    expect(render(createElement(SearchInput, { label: "Qidirish" }))).toMatch(
      /^<label data-reveal-box=""/,
    );
  });
});

describe("Icon", () => {
  it("has a copy glyph", () => {
    expect(render(createElement(Icon, { name: "copy" }))).toContain("<rect");
  });
});
