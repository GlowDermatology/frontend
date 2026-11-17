import { DropdownMenu } from "radix-ui";
import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { themeCopy } from "@/components/brand/copy";
import { menuContentClass } from "@/components/ui/menu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/katalog",
  useSearchParams: () => new URLSearchParams("q=krem"),
}));

const { LanguageMenuSub } = await import("./language-switcher");
const { AccountLink, ShopMenu } = await import("./header-islands");

const Root = DropdownMenu.Root as FC<{ open?: boolean; modal?: boolean; children?: ReactNode }>;
const Content = DropdownMenu.Content as FC<{ className?: string; children?: ReactNode }>;

/** An open menu rendered in place (no portal), as the server renders it. */
function openMenu(...children: ReactNode[]) {
  return renderToStaticMarkup(
    createElement(
      Root,
      { open: true, modal: false },
      createElement(DropdownMenu.Trigger, null, "Menu"),
      createElement(Content, { className: menuContentClass }, ...children),
    ),
  );
}

describe("the account menu's language row", () => {
  it("is one «Til · flag O‘zbekcha ›» submenu row (the side form from sm)", () => {
    const html = openMenu(createElement(LanguageMenuSub, { current: "uz", label: "Til" }));
    const row = /<div[^>]*data-menu-sub=""[^>]*>/.exec(html)?.[0] ?? "";
    expect(row).toContain('aria-haspopup="menu"');
    expect(html).toContain("Til");
    expect(html).toContain("O‘zbekcha");
    expect(html).toMatch(/<svg viewBox="0 0 30 20" aria-hidden="true"/);
    // The languages are in the (closed) submenu, not in the list itself.
    expect(html).not.toContain("Русский");
  });

  it("lists the same page in each language, a check on the current one (inline below sm)", () => {
    const html = openMenu(
      createElement(LanguageMenuSub, {
        current: "ru",
        label: "Язык",
        layout: "inline",
        defaultExpanded: true,
      }),
    );
    expect(html).toMatch(/role="group"[^>]*aria-label="Язык"/);
    expect(html).toContain('data-menu-sub-inline=""');
    for (const [lang, name] of [
      ["uz", "O‘zbekcha"],
      ["ru", "Русский"],
      ["en", "English"],
    ]) {
      expect(html).toMatch(new RegExp(`hrefLang="${lang}"[^>]*lang="${lang}"`));
      expect(html).toContain(name);
    }
    expect(html).toContain('href="/en/catalog?q=krem"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/hrefLang="ru"[^>]*aria-current="true"/);
  });
});

describe("AccountLink", () => {
  it("keeps the guest trigger's name «Hisob va til»", () => {
    const html = renderToStaticMarkup(createElement(AccountLink, { locale: "uz" }));
    expect(html).toContain('aria-label="Hisob va til"');
    expect(html).toContain('aria-haspopup="menu"');
    // No sign-out form for a guest.
    expect(html).not.toContain("/api/shop/auth/logout");
  });
});

describe("ShopMenu", () => {
  it("puts the theme switch under the languages at the panel's foot", () => {
    const html = renderToStaticMarkup(
      createElement(ShopMenu, {
        links: [{ href: "/katalog", label: "Katalog" }],
        openLabel: "Menyuni ochish",
        closeLabel: "Menyuni yopish",
        language: createElement("nav", { "aria-label": "Til" }, "…"),
        theme: themeCopy.uz,
      }),
    );
    expect(html).toContain('data-theme-row=""');
    expect(html).toContain('role="radiogroup" aria-label="Mavzu"');
    for (const name of ["Yorug‘", "Qorong‘i", "Qurilmadagidek"]) expect(html).toContain(name);
    expect(html.indexOf('aria-label="Til"')).toBeLessThan(html.indexOf("data-theme-row"));
  });

  it("has no theme row unless given its texts", () => {
    const html = renderToStaticMarkup(
      createElement(ShopMenu, {
        links: [],
        openLabel: "Open",
        closeLabel: "Close",
      }),
    );
    expect(html).not.toContain("data-theme-row");
  });
});
