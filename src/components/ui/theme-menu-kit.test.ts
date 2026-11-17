import { DropdownMenu } from "radix-ui";
import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { themeCopy } from "@/components/brand/copy";

import { Icon } from "./icon";
import {
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  menuCheckItemClass,
  menuContentClass,
  menuItemClass,
} from "./menu";
import { THEME_ICONS, ThemeMenu, ThemeSegments } from "./theme-control";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element);

const Root = DropdownMenu.Root as FC<{ open?: boolean; modal?: boolean; children?: ReactNode }>;
const Content = DropdownMenu.Content as FC<{ className?: string; children?: ReactNode }>;
const Item = DropdownMenu.Item as FC<{ className?: string; children?: ReactNode }>;
/* Kit pieces whose children are required props, typed for `createElement(type, props, child)`. */
type Loose<P> = FC<Omit<P, "children"> & { children?: ReactNode }>;
const Sub = MenuSub as Loose<Parameters<typeof MenuSub>[0]>;
const RadioGroup = MenuRadioGroup as Loose<Parameters<typeof MenuRadioGroup<"a" | "b">>[0]>;
const RadioItem = MenuRadioItem as Loose<Parameters<typeof MenuRadioItem>[0]>;

/** An open menu rendered in place (no portal), as the server renders it. */
function openMenu(...children: ReactNode[]) {
  return render(
    createElement(
      Root,
      { open: true, modal: false },
      createElement(DropdownMenu.Trigger, null, "Menu"),
      createElement(Content, { className: menuContentClass }, ...children),
    ),
  );
}

const labels = themeCopy.uz;

describe("menu kit classes", () => {
  it("exports the shared row classes", () => {
    expect(menuItemClass).toContain("data-[highlighted]:bg-gold-soft");
    expect(menuCheckItemClass).toContain("pr-9");
    expect(menuContentClass).toContain("bg-surface-raised");
  });
});

describe("MenuSub", () => {
  const sub = (props: Partial<Parameters<typeof MenuSub>[0]> = {}) =>
    createElement(
      Sub,
      { label: "Til", value: "O‘zbekcha", contentLabel: "Tillar", ...props },
      createElement(Item, null, "Русский"),
    );

  it("from sm: a side submenu trigger with the current value and a chevron", () => {
    const html = openMenu(sub({ layout: "side" }));
    const row = /<div[^>]*data-menu-sub=""[^>]*>/.exec(html)?.[0] ?? "";
    expect(row).toContain('role="menuitem"');
    expect(row).toContain('aria-haspopup="menu"');
    expect(row).toContain('aria-expanded="false"');
    expect(html).toContain("O‘zbekcha");
    expect(html).not.toContain("Русский");
  });

  it("auto renders the side form on the server", () => {
    expect(openMenu(sub())).toMatch(
      /aria-haspopup="menu"[^>]*data-menu-sub=""|data-menu-sub=""[^>]*aria-haspopup="menu"/,
    );
  });

  it("below sm: an inline disclosure, collapsed until chosen", () => {
    const collapsed = openMenu(sub({ layout: "inline" }));
    expect(collapsed).toMatch(/role="menuitem"[^>]*aria-expanded="false"/);
    expect(collapsed).not.toMatch(/data-menu-sub=""[^>]*aria-haspopup/);
    expect(collapsed).not.toContain("Русский");

    const expanded = openMenu(sub({ layout: "inline", defaultExpanded: true }));
    expect(expanded).toMatch(/aria-expanded="true"[^>]*aria-controls="([^"]+)"/);
    const controls = /aria-controls="([^"]+)"/.exec(expanded)?.[1];
    expect(expanded).toContain(`id="${controls}"`);
    expect(expanded).toMatch(/role="group"[^>]*aria-label="Tillar"/);
    expect(expanded).toContain("Русский");
  });
});

describe("MenuRadioGroup / MenuRadioItem", () => {
  it("renders menuitemradio rows with a check on the chosen one", () => {
    const html = openMenu(
      createElement(
        RadioGroup,
        { value: "b", onValueChange: () => {}, label: "Tanlov" },
        createElement(RadioItem, { value: "a", icon: createElement(Icon, { name: "sun" }) }, "A"),
        createElement(RadioItem, { value: "b", keepOpen: true }, "B"),
      ),
    );
    expect(html).toMatch(/role="group"[^>]*aria-label="Tanlov"/);
    expect(html.match(/role="menuitemradio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="false"[^>]*>.*A/);
    expect(html).toMatch(/role="menuitemradio" aria-checked="true"/);
    /* Only the chosen row carries the check. */
    expect(html.match(/M5 12.5l4.5 4.5L19 7.5/g)).toHaveLength(1);
  });
});

describe("ThemeSegments", () => {
  it("menu: a named row of three icon radio items (system until the cookie is read)", () => {
    const html = openMenu(createElement(ThemeSegments, { labels }));
    expect(html).toContain("data-theme-segments");
    expect(html).toContain(">Mavzu</span>");
    expect(html).toMatch(/role="group"[^>]*aria-label="Mavzu"/);
    const radios = [
      ...html.matchAll(
        /role="menuitemradio" aria-checked="(true|false)"[^>]*aria-label="([^"]+)"/g,
      ),
    ];
    expect(radios.map((match) => [match[2], match[1]])).toEqual([
      ["Yorug‘", "false"],
      ["Qorong‘i", "false"],
      ["Qurilmadagidek", "true"],
    ]);
  });

  it("standalone: a segmented control of native radios with text", () => {
    const html = render(
      createElement(ThemeSegments, { labels: themeCopy.ru, variant: "standalone" }),
    );
    expect(html).toMatch(/role="radiogroup" aria-label="Тема"/);
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/checked="" value="system"/);
    expect(html).toContain("Светлая");
    const iconsOnly = render(
      createElement(ThemeSegments, {
        labels: themeCopy.en,
        variant: "standalone",
        showText: false,
      }),
    );
    expect(iconsOnly).toContain('<span class="sr-only">Dark</span>');
  });
});

describe("ThemeMenu", () => {
  it("a named icon trigger showing the current choice", () => {
    const html = render(createElement(ThemeMenu, { labels: themeCopy.en }));
    expect(html).toMatch(/^<button type="button"[^>]*aria-haspopup="menu"/);
    expect(html).toContain('aria-label="Theme"');
    expect(html).toContain("data-theme-menu");
    expect(THEME_ICONS.system).toBe("monitor");
    /* The monitor icon (system) until the cookie is read on the client. */
    expect(html).toContain('d="M9 20h6M12 16.5V20"');
  });
});
