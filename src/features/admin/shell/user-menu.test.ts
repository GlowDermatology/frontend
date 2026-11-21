import { DropdownMenu } from "radix-ui";
import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { menuContentClass } from "@/components/ui/menu";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

vi.mock("@/data/admin-language.actions", () => ({ saveAdminLanguage: vi.fn() }));

const { UserMenu, UserMenuItems } = await import("./user-menu");

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const Root = DropdownMenu.Root as FC<{ open?: boolean; modal?: boolean; children?: ReactNode }>;
const Content = DropdownMenu.Content as FC<{ className?: string; children?: ReactNode }>;

const within = (locale: Locale, node: ReactNode) =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));

/** The profile menu's rows in an open menu rendered in place (no portal). */
const items = (locale: Locale) =>
  within(
    locale,
    createElement(
      Root,
      { open: true, modal: false },
      createElement(DropdownMenu.Trigger, null, "x"),
      createElement(
        Content,
        { className: menuContentClass },
        createElement(UserMenuItems, { onLanguage: vi.fn(), onSignOut: vi.fn() }),
      ),
    ),
  );

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("UserMenu", () => {
  it("uses a compact avatar trigger named for the staff member", () => {
    const html = within(
      "uz",
      createElement(UserMenu, {
        name: "Malika Yusupova",
        email: "malika@glowderma.uz",
        initials: "MY",
        csrf: "tok",
      }),
    );
    expect(html).toContain('aria-label="Profil menyusi: Malika Yusupova"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('data-user-menu=""');
    expect(html).toContain("size-11");
    expect(text(html)).toContain("MY");
    // Sign-out posts the hidden form (csrf, this session only).
    expect(html).toContain('<form hidden="" action="/admin/auth/logout" method="post">');
    expect(html).toContain('name="csrf" value="tok"');
    expect(html).toContain('name="scope" value="current"');
  });
});

describe("UserMenuItems", () => {
  it("lists Settings, the language row, the theme switch and Sign out, in order", () => {
    const html = items("uz");
    expect(html).toContain('href="/admin/notifications"');
    expect(html).toContain('href="/admin/settings"');
    const order = ["Sozlamalar", "Til", "O‘zbekcha", "Mavzu", "Chiqish"].map((label) =>
      text(html).indexOf(label),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toMatch(/data-menu-sub=""/);
    expect(html).toContain('data-theme-segments=""');
    expect(html.match(/role="menuitemradio"/g)).toHaveLength(3);
  });

  it("speaks the admin language", () => {
    const ru = text(items("ru"));
    for (const label of ["Настройки", "Язык", "Русский", "Тема", "Выйти"]) {
      expect(ru).toContain(label);
    }
    const en = text(items("en"));
    for (const label of ["Settings", "Language", "English", "Theme", "Sign out"]) {
      expect(en).toContain(label);
    }
  });
});
