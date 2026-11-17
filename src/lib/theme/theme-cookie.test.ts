import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import {
  DARK_QUERY,
  THEME_COLORS,
  THEME_COOKIE,
  THEME_SCRIPT,
  THEME_VIEWPORT,
  knownThemeChoice,
  parseThemeChoice,
  resolveTheme,
  themeCookie,
  themeCookieString,
  themeFromCookieHeader,
} from "./theme-cookie";

describe("theme cookie", () => {
  it("parses a stored value: light / dark, anything else is system", () => {
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice(" LIGHT ")).toBe("light");
    expect(parseThemeChoice("system")).toBe("system");
    expect(parseThemeChoice("blue")).toBe("system");
    expect(parseThemeChoice(undefined)).toBe("system");
    expect(knownThemeChoice("system")).toBe("system");
    expect(knownThemeChoice("Dark")).toBe("dark");
    expect(knownThemeChoice("blue")).toBeNull();
    expect(knownThemeChoice(1)).toBeNull();
  });

  it("resolves system from the device's preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("reads the cookie from a Cookie header", () => {
    expect(themeFromCookieHeader("a=1; gd_theme=dark; b=2")).toBe("dark");
    expect(themeFromCookieHeader("gd_theme=light")).toBe("light");
    expect(themeFromCookieHeader("xgd_theme=dark")).toBe("system");
    expect(themeFromCookieHeader("gd_theme=")).toBe("system");
    expect(themeFromCookieHeader(null)).toBe("system");
  });

  it("builds the Set-Cookie of a choice: Path=/, one year, Lax, readable; system deletes", () => {
    expect(themeCookie("dark", true)).toEqual({
      name: THEME_COOKIE,
      value: "dark",
      attributes: { httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 31_536_000 },
    });
    expect(themeCookie("system", false)).toMatchObject({ value: "", attributes: { maxAge: 0 } });
    expect(themeCookieString("light", true)).toBe(
      "gd_theme=light; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    );
    expect(themeCookieString("system", false)).toBe("gd_theme=; Path=/; Max-Age=0; SameSite=Lax");
  });

  it("declares both colour schemes and a theme-color per scheme", () => {
    expect(THEME_VIEWPORT.colorScheme).toBe("light dark");
    expect(THEME_VIEWPORT.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
      { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
    ]);
  });
});

describe("THEME_SCRIPT", () => {
  function run(cookie: string, prefersDark: boolean | null) {
    const attributes: Record<string, string> = { "data-theme": "light" };
    const documentElement = {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    };
    const window =
      prefersDark === null
        ? {}
        : {
            matchMedia: (query: string) => ({
              matches: prefersDark && query === "(prefers-color-scheme: dark)",
            }),
          };
    runInNewContext(THEME_SCRIPT, { document: { cookie, documentElement }, window });
    return attributes["data-theme"];
  }

  it("applies the saved choice before the first paint", () => {
    expect(run("gd_theme=dark", false)).toBe("dark");
    expect(run("a=1; gd_theme=light; b=2", true)).toBe("light");
  });

  it("follows the device without a cookie (or with an unknown value)", () => {
    expect(run("", true)).toBe("dark");
    expect(run("gd_theme=blue", true)).toBe("dark");
    expect(run("xgd_theme=dark", false)).toBe("light");
    expect(run("", false)).toBe("light");
  });

  it("stays light without matchMedia and never throws", () => {
    expect(run("", null)).toBe("light");
    expect(() =>
      runInNewContext(THEME_SCRIPT, {
        document: {
          get cookie(): string {
            throw new Error("blocked");
          },
        },
        window: {},
      }),
    ).not.toThrow();
  });
});

describe("THEME_SCRIPT literal", () => {
  it("spells the cookie name and the media query exactly as the constants", () => {
    expect(THEME_SCRIPT).toContain(`(?:^|; )${THEME_COOKIE}=(light|dark)`);
    expect(THEME_SCRIPT).toContain(`matchMedia(${JSON.stringify(DARK_QUERY)})`);
  });
});
