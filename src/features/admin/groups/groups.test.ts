import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { segmentCopy } from "@/domain/copy/segments";
import type { CustomerLookupItem } from "@/domain/customer-lookup";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import {
  bulkLines,
  bulkProblems,
  entryCount,
  initials,
  maskSearchInput,
  memberEntries,
  memberErrorSummary,
  NO_MEMBER_ERRORS,
  placeMemberErrors,
  readLookupResult,
  togglePick,
  unavailableReason,
} from "./add-members";
import { groupsCopy } from "./copy";
import { CustomerSearch } from "./customer-search";
import { segmentErrorSummary } from "./segment-dialog";

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;

const customer = (id: string, extra: Partial<CustomerLookupItem> = {}): CustomerLookupItem => ({
  id,
  name: `Mijoz ${id}`,
  phone: `+99890000000${id}`,
  email: null,
  status: "active",
  ...extra,
});

describe("search field mask", () => {
  it("masks a national number and shows the +998 adornment", () => {
    expect(maskSearchInput("901234567")).toEqual({ text: "90 123 45 67", caret: 12, prefix: true });
    expect(maskSearchInput("90123")).toEqual({ text: "90 123", caret: 6, prefix: true });
    // A pasted full number loses its country code into the adornment.
    expect(maskSearchInput("998 90 123 45 67").text).toBe("90 123 45 67");
  });

  it("keeps a typed + as the full mask, and leaves names alone", () => {
    expect(maskSearchInput("+998901")).toEqual({ text: "+998 90 1", caret: 9, prefix: false });
    expect(maskSearchInput("+9")).toEqual({ text: "+9", caret: 2, prefix: false });
    expect(maskSearchInput("Malika")).toEqual({ text: "Malika", caret: 6, prefix: false });
    expect(maskSearchInput("Ali 90")).toEqual({ text: "Ali 90", caret: 6, prefix: false });
  });

  it("keeps the caret after the same digit when editing in the middle", () => {
    // "9012|3" → after formatting "90 12|3": the caret follows the 4th digit.
    expect(maskSearchInput("90123", 4)).toEqual({ text: "90 123", caret: 5, prefix: true });
  });
});

describe("lookup answer and picks", () => {
  it("reads the route's JSON and drops malformed rows", () => {
    expect(
      readLookupResult({
        term: "901",
        kind: "phone",
        items: [customer("1"), { id: 2 }, customer("3", { member: true })],
      }),
    ).toEqual({
      term: "901",
      kind: "phone",
      items: [customer("1"), customer("3", { member: true })],
    });
    expect(readLookupResult({ items: "x" })).toBeNull();
    expect(readLookupResult(null)).toBeNull();
  });

  it("explains why a result cannot be picked", () => {
    const t = groupsCopy.uz.add;
    expect(unavailableReason(customer("1"), t)).toBeNull();
    expect(unavailableReason(customer("1", { member: true }), t)).toBe(t.alreadyMember);
    expect(unavailableReason(customer("1", { status: "deleted" }), t)).toBe(t.deletedReason);
    expect(unavailableReason(customer("1", { member: false }), groupsCopy.en.add)).toBeNull();
  });

  it("toggles picks and builds initials", () => {
    const one = togglePick([], customer("1"));
    expect(one.map((p) => p.id)).toEqual(["1"]);
    expect(togglePick(one, customer("2")).map((p) => p.id)).toEqual(["1", "2"]);
    expect(togglePick(one, customer("1"))).toEqual([]);
    expect(initials("Malika Karimova")).toBe("MK");
    expect(initials("  aziza ")).toBe("AZ");
    expect(initials("O‘lmas Ergashev Bek")).toBe("OB");
    expect(initials("")).toBe("");
  });
});

describe("bulk paste and submit", () => {
  const rowCopy = segmentCopy.uz.actions;

  it("splits the pasted list and finds the lines that are not an id or a whole phone", () => {
    const lines = bulkLines("5\n+998 90 123 45 67, 93 555\nabc;\n\n7");
    expect(lines).toEqual([
      { line: 1, entry: "5" },
      { line: 2, entry: "+998 90 123 45 67" },
      { line: 3, entry: "93 555" },
      { line: 4, entry: "abc" },
      { line: 5, entry: "7" },
    ]);
    expect(bulkProblems(lines, rowCopy)).toEqual([
      { line: 3, entry: "93 555", message: rowCopy.rowIncomplete },
      { line: 4, entry: "abc", message: rowCopy.rowInvalid },
    ]);
    expect(bulkProblems([{ line: 1, entry: "1".repeat(65) }], rowCopy)[0]?.message).toBe(
      rowCopy.rowTooLong,
    );
  });

  it("sends picked ids first, then the pasted entries, and counts them against 500", () => {
    const picks = [customer("12"), customer("40")];
    const lines = bulkLines("5\n90 123 45 67");
    expect(memberEntries(picks, lines)).toEqual(["12", "40", "5", "90 123 45 67"]);
    expect(entryCount(picks, lines)).toEqual({ count: 4, over: false });
    expect(entryCount(picks, lines, 3)).toEqual({ count: 4, over: true });
  });

  it("puts each row error back on its pick or pasted line", () => {
    const picks = [customer("12"), customer("40")];
    const lines = bulkLines("5\n+998 90 000 00 00");
    const placed = placeMemberErrors(
      {
        "entries.1": "Topilmadi.",
        "entries.3": "Bu raqam bilan mijoz topilmadi.",
        "entries.9": "?",
        members: "Ko‘pi bilan 500 ta.",
        other: "x",
      },
      picks,
      lines,
    );
    expect(placed.picks).toEqual({ "40": "Topilmadi." });
    expect(placed.bulk).toEqual([
      { line: 2, entry: "+998 90 000 00 00", message: "Bu raqam bilan mijoz topilmadi." },
    ]);
    expect(placed.members).toBe("Ko‘pi bilan 500 ta.");
    expect(placed.placed.sort()).toEqual(["entries.1", "entries.3", "members"]);
  });

  it("summarises the errors in the dialog's order", () => {
    const t = groupsCopy.uz.add;
    const picks = [customer("12"), customer("40", { name: "" })];
    const one = memberErrorSummary(
      {
        picks: { "40": "Topilmadi." },
        bulk: [{ line: 2, entry: "abc", message: "Xato" }],
        form: "Ko‘p",
      },
      picks,
      t,
    );
    expect(one).toEqual([
      { name: "pick-40", label: t.deletedCustomer, message: "Topilmadi." },
      { name: "bulk", label: "2-qator («abc»)", message: "Xato" },
      { name: "customer-search", label: t.fieldPicks, message: "Ko‘p" },
    ]);
    const many = memberErrorSummary(
      {
        ...NO_MEMBER_ERRORS,
        bulk: [
          { line: 1, entry: "a", message: "x" },
          { line: 3, entry: "b", message: "y" },
        ],
      },
      [],
      t,
    );
    expect(many).toEqual([{ name: "bulk", label: t.fieldBulk, message: "2 ta qatorda xato bor" }]);
    expect(memberErrorSummary(NO_MEMBER_ERRORS, picks, t)).toEqual([]);
  });

  it("summarises the group dialog's errors by field", () => {
    const t = groupsCopy.ru.dialog;
    expect(segmentErrorSummary({ "rules.minLifetimeAmount": "A", name: "B" }, t)).toEqual([
      { name: "name", label: t.name, message: "B" },
      { name: "rules.minLifetimeAmount", label: t.amount, message: "A" },
    ]);
  });
});

describe("copy", () => {
  it("counts in each language", () => {
    expect(groupsCopy.uz.members.count(3, 1)).toBe("3 ta a’zo · 1 ta push qurilma");
    expect(groupsCopy.ru.members.count(3, 1)).toBe("3 участника · 1 push-устройство");
    expect(groupsCopy.en.members.count(1, 2)).toBe("1 member · 2 push devices");
    expect(groupsCopy.ru.add.found(21)).toBe("Найден 21 клиент");
    expect(groupsCopy.en.add.submitCount(1)).toBe("Add 1 customer");
  });
});

describe("CustomerSearch markup", () => {
  it("renders an accessible combobox with a multi-select listbox, in the admin language", () => {
    const html = renderToStaticMarkup(
      createElement(
        LocaleProvider,
        { locale: "en" },
        createElement(CustomerSearch, { segmentId: "1", picks: [], onToggle: () => {} }),
      ),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/role="listbox"[^>]*aria-label="Search results"/);
    expect(html).toContain('aria-multiselectable="true"');
    expect(html).toContain("Find a customer");
    expect(html).toContain('placeholder="Name or phone"');
    expect(html).toContain('data-field="customer-search"');
    expect(html).not.toContain("aria-invalid");
  });

  it("marks the field invalid when the list-level error points at it (Uzbek default)", () => {
    const html = renderToStaticMarkup(
      createElement(CustomerSearch, {
        segmentId: "1",
        picks: [],
        onToggle: () => {},
        errorId: "err",
      }),
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="err /);
    expect(html).toContain("Mijozni qidirish");
  });
});
