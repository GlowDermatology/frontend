import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";
import { caretAfterDigits, formatNationalPhone, phoneValue } from "@/lib/phone";

import { Calendar, isCommittedDay } from "./calendar";
import { DatePicker } from "./date-picker";
import { DateRangePicker, rangePreset } from "./date-range-picker";
import { DateTimePicker } from "./date-time-picker";
import { PhoneInput } from "./phone-input";
import { pickerCopy } from "./picker-copy";
import { pickerButtonName } from "./picker-field";
import { TimeColumns, TimePicker } from "./time-picker";

const noop = () => {};

function render(element: ReactElement, locale?: Locale): string {
  return renderToStaticMarkup(
    locale
      ? createElement(
          AdminLocaleProvider,
          { locale } as { locale: Locale; children: ReactNode },
          element,
        )
      : element,
  );
}

/** The attributes of the `<td>` for `iso` in a rendered calendar. */
function cell(html: string, iso: string): string {
  const match = new RegExp(`<td[^>]*data-date="${iso}"[^>]*>`).exec(html);
  if (!match) throw new Error(`no cell for ${iso}`);
  return match[0];
}

describe("Calendar", () => {
  it("announces only the committed value or range ends as selected, not the range preview", () => {
    const range = { from: "2026-11-10", to: "2026-11-17" };
    expect(isCommittedDay("2026-11-10", null, range)).toBe(true);
    expect(isCommittedDay("2026-11-17", undefined, range)).toBe(true);
    // A day the keyboard passed over while editing the end: drawn, not announced.
    expect(isCommittedDay("2026-11-25", undefined, range)).toBe(false);
    expect(isCommittedDay("2026-11-25", "2026-11-25", undefined)).toBe(true);
    const html = render(
      createElement(Calendar, {
        onSelect: noop,
        range,
        rangeEdit: "to",
        defaultFocus: "2026-11-17",
      }),
    );
    expect(html.match(/aria-selected="true"/g)).toHaveLength(2);
  });

  const html = render(
    createElement(Calendar, {
      value: "2026-11-17",
      onSelect: noop,
      today: "2026-11-16",
      min: "2026-11-05",
      isDateDisabled: (iso: string) => (iso === "2026-11-20" ? "Dam olish kuni" : false),
    }),
  );

  it("renders a Monday-first grid of six weeks named by its month", () => {
    expect(html).toContain('role="grid"');
    expect(html).toContain('data-month="2026-11"');
    expect(html).toContain(">Noyabr 2026<");
    expect(html.match(/<th /g)).toHaveLength(7);
    expect(html).toMatch(/<th[^>]*abbr="dushanba"[^>]*>Du<\/th>/);
    expect(html.match(/role="gridcell"/g)).toHaveLength(42);
    // 1 November 2026 is a Sunday: the grid opens on Monday 26 October.
    expect(html.indexOf('data-date="2026-10-26"')).toBeLessThan(
      html.indexOf('data-date="2026-11-01"'),
    );
  });

  it("puts only the chosen day in the tab order and marks it selected", () => {
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(cell(html, "2026-11-17")).toContain('tabindex="0"');
    expect(cell(html, "2026-11-17")).toContain('aria-selected="true"');
    expect(cell(html, "2026-11-18")).toContain('aria-selected="false"');
    expect(cell(html, "2026-11-18")).toContain('tabindex="-1"');
  });

  it("names every day in full and marks today", () => {
    expect(cell(html, "2026-11-17")).toContain('aria-label="17-noyabr 2026, seshanba"');
    expect(cell(html, "2026-11-16")).toContain('aria-current="date"');
    expect(cell(html, "2026-11-17")).not.toContain("aria-current");
  });

  it("says why a day cannot be picked", () => {
    expect(cell(html, "2026-11-04")).toContain('aria-disabled="true"');
    expect(cell(html, "2026-11-04")).toContain("tanlab bo‘lmaydi");
    expect(cell(html, "2026-11-20")).toContain('aria-label="20-noyabr 2026, juma, Dam olish kuni"');
    expect(cell(html, "2026-11-21")).not.toContain("aria-disabled");
  });

  it("disables paging before the earliest month", () => {
    expect(html).toMatch(
      /<button[^>]*aria-label="Oldingi oy"[^>]*data-calendar-nav="previous"[^>]*disabled=""/,
    );
    expect(html).not.toMatch(/data-calendar-nav="next"[^>]*disabled/);
  });

  it("speaks Russian and English", () => {
    const ru = render(createElement(Calendar, { value: "2026-11-17", onSelect: noop }), "ru");
    expect(ru).toContain(">Ноябрь 2026<");
    expect(cell(ru, "2026-11-17")).toContain('aria-label="17 ноября 2026, вторник"');
    const en = render(createElement(Calendar, { value: "2026-11-17", onSelect: noop }), "en");
    expect(en).toContain(">November 2026<");
    expect(cell(en, "2026-11-17")).toContain('aria-label="Tuesday, 17 November 2026"');
    expect(en).toContain(">Mo<");
  });

  it("draws a range band between the ends", () => {
    const band = render(
      createElement(Calendar, {
        onSelect: noop,
        range: { from: "2026-11-10", to: "2026-11-13" },
        defaultFocus: "2026-11-10",
        today: "2026-11-01",
      }),
    );
    expect(cell(band, "2026-11-10")).toContain('aria-selected="true"');
    expect(cell(band, "2026-11-13")).toContain('aria-selected="true"');
    expect(cell(band, "2026-11-11")).toContain("bg-gold-soft");
    expect(cell(band, "2026-11-14")).not.toContain("bg-gold-soft");
  });

  it("focuses today (kept within min/max) when nothing is chosen", () => {
    const empty = render(createElement(Calendar, { onSelect: noop, today: "2026-11-16" }));
    expect(cell(empty, "2026-11-16")).toContain('tabindex="0"');
    const later = render(
      createElement(Calendar, { onSelect: noop, today: "2026-11-16", min: "2027-02-10" }),
    );
    expect(later).toContain('data-month="2027-02"');
    expect(cell(later, "2027-02-10")).toContain('tabindex="0"');
  });
});

describe("DatePicker", () => {
  it("shows the day as DD.MM.YYYY and carries ISO in a hidden input", () => {
    const html = render(
      createElement(DatePicker, {
        id: "starts",
        name: "starts_on",
        value: "2026-11-07",
        onValueChange: noop,
        "aria-describedby": "starts-hint",
      }),
    );
    expect(html).toContain('data-picker="date"');
    expect(html).toMatch(/<input[^>]*id="starts"[^>]*type="text"/);
    expect(html).toContain('value="07.11.2026"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('placeholder="kk.oo.yyyy"');
    expect(html).toContain('aria-describedby="starts-hint"');
    expect(html).toContain('<input type="hidden" name="starts_on" value="2026-11-07"/>');
    // The plain action until mounted (then named after the Field label, see pickerButtonName).
    expect(html).toContain('aria-label="Kalendarni ochish"');
    expect(html).not.toContain("aria-labelledby");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-live="polite"');
  });

  it("is empty for an empty or invalid value and passes aria-invalid on", () => {
    const html = render(
      createElement(DatePicker, { value: "", onValueChange: noop, "aria-invalid": true }),
    );
    expect(html).toContain('value=""');
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain('type="hidden"');
  });

  it("offers the clear button only with a value", () => {
    const set = render(createElement(DatePicker, { value: "2026-11-07", clearable: true }));
    expect(set).toContain('aria-label="Tozalash"');
    const empty = render(createElement(DatePicker, { value: "", clearable: true }));
    expect(empty).not.toContain('aria-label="Tozalash"');
  });

  it("keeps labels that never collide with field labels", () => {
    // Specs find the field with getByLabel("Sana"): no button may contain that word.
    const html = render(createElement(DatePicker, { value: "2026-11-07", clearable: true }));
    expect(html.match(/aria-label="[^"]*"/g)!.join(" ")).not.toMatch(/sana/i);
  });

  it("disables both the field and its button", () => {
    const html = render(createElement(DatePicker, { value: "", disabled: true }));
    expect(html).toMatch(/<input[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*aria-label="Kalendarni ochish"[^>]*disabled=""/);
  });

  it("renders uncontrolled from defaultValue", () => {
    const html = render(createElement(DatePicker, { defaultValue: "2028-02-29", name: "d" }));
    expect(html).toContain('value="29.02.2028"');
    expect(html).toContain('name="d" value="2028-02-29"');
  });

  it("names the calendar button after its Field label once mounted, never labelled by it", () => {
    const attributes = new Map<string, string>();
    const labels: Record<string, string> = { "starts-label": "Boshlanish sanasi" };
    const button = {
      ownerDocument: {
        getElementById: (id: string) => (id in labels ? { textContent: labels[id] } : null),
      },
      setAttribute: (name: string, value: string) => void attributes.set(name, value),
    } as unknown as HTMLButtonElement;
    const t = pickerCopy.uz;
    const props = pickerButtonName({
      action: t.openCalendar,
      named: t.openCalendarFor,
      id: "starts",
    });
    expect(props["aria-label"]).toBe("Kalendarni ochish");
    props.ref?.(button);
    expect(attributes.get("aria-label")).toBe("Kalendarni ochish: Boshlanish sanasi");
    // No such label in the page: the plain action stays.
    pickerButtonName({ action: t.openCalendar, named: t.openCalendarFor, id: "x" }).ref?.(button);
    expect(attributes.get("aria-label")).toBe("Kalendarni ochish");
  });

  it("names the calendar button after a toolbar field's aria-label", () => {
    const html = render(createElement(DatePicker, { value: "", "aria-label": "Dan" }));
    expect(html).toContain('aria-label="Kalendarni ochish: Dan"');
    const en = render(createElement(DatePicker, { value: "", "aria-label": "From" }), "en");
    expect(en).toContain('aria-label="Open calendar: From"');
  });

  it("uses the admin language", () => {
    expect(render(createElement(DatePicker, { value: "" }), "ru")).toContain(
      'placeholder="дд.мм.гггг"',
    );
    expect(render(createElement(DatePicker, { value: "" }), "en")).toContain(
      'aria-label="Open calendar"',
    );
  });
});

describe("TimePicker and TimeColumns", () => {
  it("shows HH:MM with a clock button", () => {
    const html = render(createElement(TimePicker, { value: "13:05", name: "t" }));
    expect(html).toContain('data-picker="time"');
    expect(html).toContain('value="13:05"');
    expect(html).toContain('placeholder="ss:dd"');
    expect(html).toContain('aria-label="Vaqtlar ro‘yxatini ochish"');
    expect(html).toContain('name="t" value="13:05"');
  });

  it("lists 24 hours and the minutes on the step grid", () => {
    const html = render(
      createElement(TimeColumns, {
        value: "13:30",
        onChange: noop,
        step: 15,
        min: "09:00",
        max: "18:00",
      }),
    );
    expect(html.match(/role="listbox"/g)).toHaveLength(2);
    expect(html.match(/role="option"/g)).toHaveLength(24 + 4);
    expect(html).toMatch(/role="option" aria-selected="true"[^>]*data-value="13"/);
    expect(html).toMatch(/role="option" aria-selected="true"[^>]*data-value="30"/);
    // Outside 09:00–18:00.
    expect(html).toMatch(/aria-disabled="true" data-value="08"/);
    expect(html).toMatch(/aria-disabled="true" data-value="19"/);
    expect(html).not.toMatch(/aria-disabled="true" data-value="09"/);
    expect(html).toContain(">Soat<");
    expect(html).toContain(">Daqiqa<");
  });

  it("disables the minutes past max in the last hour", () => {
    const html = render(
      createElement(TimeColumns, { value: "18:00", onChange: noop, max: "18:10" }),
    );
    expect(html).not.toMatch(/aria-disabled="true" data-value="10"/);
    expect(html).toMatch(/aria-disabled="true" data-value="15"/);
  });
});

describe("DateTimePicker", () => {
  it("shows DD.MM.YYYY HH:MM and carries the wall-clock ISO", () => {
    const html = render(
      createElement(DateTimePicker, { value: "2026-11-17T09:30", name: "scheduled_at" }),
    );
    expect(html).toContain('data-picker="datetime"');
    expect(html).toContain('value="17.11.2026 09:30"');
    expect(html).toContain('placeholder="kk.oo.yyyy ss:dd"');
    expect(html).toContain('name="scheduled_at" value="2026-11-17T09:30"');
  });
});

describe("DateRangePicker", () => {
  it("renders the toolbar range with its labels and hidden inputs", () => {
    const html = render(
      createElement(DateRangePicker, { from: "2026-11-01", to: "2026-11-15", onCommit: noop }),
    );
    expect(html).toContain('role="group" aria-label="Sana oralig‘i"');
    expect(html).toContain('aria-label="Sanadan"');
    expect(html).toContain('aria-label="Sanagacha"');
    expect(html).toContain(">gacha<");
    expect(html).toContain('name="date_from" value="2026-11-01"');
    expect(html).toContain('name="date_to" value="2026-11-15"');
    expect(html).toContain('value="01.11.2026"');
  });

  it("renders the form variant with Field labels and errors", () => {
    const html = render(
      createElement(DateRangePicker, {
        variant: "form",
        names: { from: "from", to: "to" },
        from: "2026-11-01",
        onCommit: noop,
        errors: { to: "Sanani kiriting." },
      }),
    );
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Sanadan<\/label>/);
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Sanagacha<\/label>/);
    expect(html).toContain("Sanani kiriting.");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('name="from" value="2026-11-01"');
    expect(html).toContain('name="to" value=""');
  });

  it("computes presets relative to today and within the bounds", () => {
    const today = "2026-11-16";
    expect(rangePreset("today", today)).toEqual({ from: today, to: today });
    expect(rangePreset("yesterday", today)).toEqual({ from: "2026-11-15", to: "2026-11-15" });
    expect(rangePreset("last7", today)).toEqual({ from: "2026-11-10", to: today });
    expect(rangePreset("last30", today)).toEqual({ from: "2026-10-18", to: today });
    expect(rangePreset("thisMonth", today)).toEqual({ from: "2026-11-01", to: today });
    expect(rangePreset("lastMonth", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(rangePreset("lastMonth", "2028-03-31")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(rangePreset("lastMonth", "2027-01-05")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
    expect(rangePreset("last7", today, "2026-11-12")).toEqual({ from: "2026-11-12", to: today });
    expect(rangePreset("today", today, undefined, "2026-11-10")).toBeNull();
    expect(rangePreset("last30", today, undefined, "2026-11-01")).toEqual({
      from: "2026-10-18",
      to: "2026-11-01",
    });
  });
});

describe("PhoneInput", () => {
  it("shows the national part beside a fixed +998", () => {
    const html = render(
      createElement(PhoneInput, { id: "phone", name: "phone", value: "+998901234567" }),
    );
    expect(html).toContain('data-picker="phone"');
    expect(html).toContain(">+998<");
    expect(html).toContain('value="90 123 45 67"');
    expect(html).toContain('type="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('placeholder="90 123 45 67"');
    expect(html).toContain('name="phone" value="+998901234567"');
    expect(html).toContain(">Mamlakat kodi +998<");
  });

  it("describes the field by the country code and the Field's hint", () => {
    const html = render(createElement(PhoneInput, { value: "", "aria-describedby": "hint" }));
    expect(html).toMatch(/aria-describedby="[^"]+ hint"/);
  });

  it("reads masked, partial and pasted values", () => {
    expect(render(createElement(PhoneInput, { value: "+998 90 123" }))).toContain('value="90 123"');
    expect(render(createElement(PhoneInput, { value: "+99890" }))).toContain('value="90"');
    expect(render(createElement(PhoneInput, { defaultValue: "998712000001" }))).toContain(
      'value="71 200 00 01"',
    );
  });

  it("formats and values the national digits", () => {
    expect(formatNationalPhone("901234567")).toBe("90 123 45 67");
    expect(formatNationalPhone("90123")).toBe("90 123");
    expect(formatNationalPhone("+998 90 123 45 67")).toBe("90 123 45 67");
    expect(formatNationalPhone("90-123-45-67-89")).toBe("90 123 45 67");
    expect(formatNationalPhone("")).toBe("");
    expect(phoneValue("90 123 45 67")).toBe("+998901234567");
    expect(phoneValue("+998 90 000 00 01")).toBe("+998900000001");
    expect(phoneValue("998901234567")).toBe("+998901234567");
    expect(phoneValue("(90) 123-45")).toBe("+9989012345");
    expect(phoneValue("")).toBe("");
    expect(phoneValue("+998")).toBe("");
  });

  it("finds the caret after a digit count", () => {
    expect(caretAfterDigits("90 123 45 67", 0)).toBe(0);
    expect(caretAfterDigits("90 123 45 67", 2)).toBe(2);
    expect(caretAfterDigits("90 123 45 67", 3)).toBe(4);
    expect(caretAfterDigits("90 123 45 67", 9)).toBe(12);
    expect(caretAfterDigits("90 1", 7)).toBe(4);
  });
});

describe("picker copy", () => {
  it("has twelve months and seven weekdays in every language", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      expect(pickerCopy[locale].months).toHaveLength(12);
      expect(pickerCopy[locale].monthsShort).toHaveLength(12);
      expect(pickerCopy[locale].weekdays).toHaveLength(7);
      expect(pickerCopy[locale].weekdaysShort).toHaveLength(7);
    }
    expect(pickerCopy.uz.dayLabel(1, 0, 2027, 4)).toBe("1-yanvar 2027, juma");
  });
});
