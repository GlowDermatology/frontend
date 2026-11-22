import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleFlag } from "@/components/brand/locale-flag";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { shellCopy } from "./copy";
import { alertToast, planToasts } from "./issue-alerts";
import { NAV_ITEMS, SPECIALIST_NAV_ITEMS, sectionFromSegments } from "./nav-items";
import { ShellSkeleton } from "./shell-skeleton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSelectedLayoutSegments: () => ["orders", "10240"],
}));

/* Components whose children are required props, typed for `createElement(type, props, child)`. */
const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;

const within = (locale: Locale, node: ReactNode) =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));

describe("sectionFromSegments", () => {
  it("maps the segments below the panel layout to the highlighted section", () => {
    expect(sectionFromSegments([])).toBe("dashboard");
    expect(sectionFromSegments(["__PAGE__"])).toBe("dashboard");
    expect(sectionFromSegments(["orders", "10240"])).toBe("orders");
    expect(sectionFromSegments(["customers", "groups", "3"])).toBe("customers");
    expect(sectionFromSegments(["(group)", "payments"])).toBe("payments");
    expect(sectionFromSegments(["foo/bar"])).toBeUndefined();
    expect(sectionFromSegments(["orders/1/foo"])).toBeUndefined();
  });

  it("maps the specialist workspace's segments to its own sections only", () => {
    expect(sectionFromSegments([], "specialist")).toBeUndefined();
    expect(sectionFromSegments(["my-appointments"], "specialist")).toBe("my-appointments");
    expect(sectionFromSegments(["(specialist)", "my-schedule"], "specialist")).toBe("my-schedule");
    expect(sectionFromSegments(["settings"], "specialist")).toBe("settings");
    expect(sectionFromSegments(["orders"], "specialist")).toBeUndefined();
    expect(sectionFromSegments(["my-profile"])).toBeUndefined();
  });

  it("has a label for every nav item in every language", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      for (const item of NAV_ITEMS) expect(shellCopy[locale].nav[item.section]).toBeTruthy();
      for (const item of SPECIALIST_NAV_ITEMS) {
        expect(shellCopy[locale].specialistNav[item.section]).toBeTruthy();
        expect(shellCopy[locale].titles[item.section]).toBe(
          shellCopy[locale].specialistNav[item.section],
        );
      }
    }
  });
});

describe("NavLink", () => {
  it("marks the current section from the URL segments", async () => {
    const { NavLink: Link } = await import("./nav-link");
    const NavLink = Link as FC<
      Omit<Parameters<typeof Link>[0], "children"> & { children?: ReactNode }
    >;
    const orders = renderToStaticMarkup(
      createElement(NavLink, { section: "orders", href: "/admin/orders" }, "x"),
    );
    const products = renderToStaticMarkup(
      createElement(NavLink, { section: "products", href: "/admin/products" }, "x"),
    );
    expect(orders).toContain('aria-current="page"');
    expect(products).not.toContain("aria-current");
  });
});

describe("issue toasts", () => {
  const alert = {
    id: 5,
    orderId: 10240,
    kind: "dispatch_failed" as const,
    code: "x",
    openedAt: "",
  };

  it("speak the admin language", () => {
    expect(alertToast(alert).title).toBe("Shoshilinch: buyurtma №10240");
    expect(alertToast(alert, shellCopy.ru.issues, () => "Сбой").description).toBe(
      "Сбой · x. Смотрите раздел «Проблемы».",
    );
    const many = planToasts(
      [1, 2, 3, 4, 5].map((id) => ({ ...alert, id })),
      shellCopy.en.issues,
    );
    expect(many.map((t) => t.title)).toEqual([
      "Urgent: order No. 10240",
      "Urgent: order No. 10240",
      "3 more urgent issues",
    ]);
  });
});

describe("shell copy", () => {
  it("phrases counts per language", () => {
    expect(shellCopy.uz.issues.some(3, 1)).toBe(
      "Yetkazish muammolari: 3 ta ochiq, 1 tasi shoshilinch",
    );
    expect(shellCopy.ru.issues.some(5, 2)).toBe("Проблемы доставки: 5 открытых, 2 срочные");
    expect(shellCopy.en.issues.some(1, 0)).toBe("Delivery issues: 1 open");
    expect(shellCopy.ru.titles.order(10240)).toBe("Заказ №10240");
  });
});

describe("static pieces", () => {
  it("renders a language-neutral skeleton (prerendered before the locale is known)", () => {
    const html = renderToStaticMarkup(createElement(ShellSkeleton));
    expect(html).toContain('aria-busy="true"');
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(text).toBe("Glow Derma Admin");
  });

  it("mirrors the specialist shell in its skeleton: five rows, no words besides the brand", () => {
    const html = renderToStaticMarkup(createElement(ShellSkeleton, { workspace: "specialist" }));
    expect(html).toContain('aria-busy="true"');
    expect(
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ).toBe("Glow Derma");
    expect(html.match(/flex h-10 items-center/g)).toHaveLength(SPECIALIST_NAV_ITEMS.length);
  });

  it("draws each flag as a decorative inline SVG", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      const svg = renderToStaticMarkup(createElement(LocaleFlag, { locale }));
      expect(svg).toMatch(/^<svg[^>]*aria-hidden="true"/);
      expect(svg).not.toContain("<text");
    }
    expect(renderToStaticMarkup(createElement(LocaleFlag, { locale: "ru" }))).toContain("#0039a6");
  });

  it("localizes the search field from the provider", async () => {
    const { GlobalSearch } = await import("./global-search");
    expect(within("ru", createElement(GlobalSearch))).toContain(
      'placeholder="Заказ, клиент или товар"',
    );
    expect(within("en", createElement(GlobalSearch))).toContain("Search");
    expect(renderToStaticMarkup(createElement(GlobalSearch))).toContain("Qidirish");
  });
});
