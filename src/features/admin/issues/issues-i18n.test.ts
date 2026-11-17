import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { ToastProvider } from "@/components/ui/toast";
import { DELIVERY_ISSUES } from "@/data/mock/orders";
import { issueDetailLines } from "@/domain/delivery-issue";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { IssuesTable } from "./issues-table";
import { noteError } from "./refusals";
import { SuspensionCard } from "./suspension-card";
import { suspensionLine, untilInPast } from "./suspension";

/** `AdminLocaleProvider` with its children passed as `createElement` arguments. */
const LocaleProvider = AdminLocaleProvider as (props: {
  locale: Locale;
  children?: ReactNode;
}) => ReactNode;

const inLocale = (locale: Locale, node: ReactNode) =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );

describe("the queue in the admin language", () => {
  it("words the switch line and the note rule per language", () => {
    const base = { note: "", updatedAt: "2026-10-20T09:00:00+05:00" };
    expect(suspensionLine({ ...base, suspended: false, until: null }, "en")).toBe(
      "Courier calls are on",
    );
    expect(suspensionLine({ ...base, suspended: true, until: null }, "ru")).toBe(
      "Приостановлен · до ручного включения",
    );
    expect(
      suspensionLine({ ...base, suspended: true, until: "2026-10-25T18:00:00+05:00" }, "en"),
    ).toMatch(/^Paused · until 25.Oct, 18:00$/);
    expect(noteError("", "en")).toBe("Required field.");
    expect(noteError("ab", "ru")).toMatch(/^Введите не менее 3/);
    expect(noteError("ok!")).toBeNull();
  });

  it("refuses an end that is not in the future", () => {
    const now = "2026-10-24T09:00:00+05:00";
    expect(untilInPast(null, now)).toBe(false);
    expect(untilInPast("2026-10-24T09:00:00+05:00", now)).toBe(true);
    expect(untilInPast("2026-10-24T09:01:00+05:00", now)).toBe(false);
    expect(untilInPast("not a date", now)).toBe(true);
  });

  it("names the detail keys in Russian", () => {
    expect(issueDetailLines({ paid_fee: 22_000, carrier_status: "returning" }, "ru")).toEqual([
      { key: "paid_fee", label: "Оплатил клиент", value: 22_000, kind: "money" },
      { key: "carrier_status", label: "Статус Yandex", value: "returning", kind: "text" },
    ]);
  });

  it("renders the rows and the switch in English without Uzbek UI words", () => {
    const table = inLocale("en", createElement(IssuesTable, { issues: [...DELIVERY_ISSUES] }));
    expect(table).toContain("ISSUE");
    expect(table).toContain(">Resolve<");
    expect(table).toMatch(/aria-label="Resolve: order No\. \d+, /);
    expect(table).not.toMatch(/Hal qilish|Shoshilinch|Ochiq/);
    const card = inLocale(
      "ru",
      createElement(SuspensionCard, {
        initial: { suspended: true, until: null, note: "", updatedAt: "2026-10-20T09:00:00+05:00" },
        now: "2026-10-24T04:00:00.000Z",
      }),
    );
    expect(card).toContain("Вызов курьеров");
    expect(card).toContain('aria-label="Приостановить вызов курьеров"');
    expect(card).not.toMatch(/Kuryer|To‘xtat/);
  });
});
