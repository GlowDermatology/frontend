import type { Viewport } from "next";

/**
 * The colour theme preference (light / dark / the device's setting), pure and dependency-free:
 * shared by the head script, the client store, the route handler that re-issues the cookie and
 * server code that renders HTML by hand.
 *
 * The choice is the `gd_theme` cookie, `light` or `dark` (`Path=/`, one year, `SameSite=Lax`, not
 * HttpOnly: the inline head script reads it before the first paint). **No cookie = system**: the
 * page follows `prefers-color-scheme`. One setting per browser, shared by the storefront and the
 * admin panel; it is not stored on the account.
 */

export const THEME_COOKIE = "gd_theme";
export const THEME_COOKIE_PATH = "/";
/** One year, in seconds. */
export const THEME_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
/** The same-origin route handler that re-issues the cookie with `Set-Cookie` (Safari caps
    script-written cookies at seven days). */
export const THEME_ROUTE = "/api/shop/theme";

export const THEME_CHOICES = ["light", "dark", "system"] as const;
/** What the visitor picked; `system` follows the device. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];
/** What the page shows (`<html data-theme>`). */
export type ResolvedTheme = Exclude<ThemeChoice, "system">;

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** `<meta name="theme-color">` of each theme: the page surface (`--gd-surface`). */
export const THEME_COLORS: Readonly<Record<ResolvedTheme, string>> = {
  light: "#fbf8f2",
  dark: "#14110d",
};

/**
 * The `viewport` fields of every root layout: both colour schemes are supported, and the browser
 * chrome follows the device until `ThemeSync` sets the chosen theme's colour.
 */
function viewport(dark: string): Required<Pick<Viewport, "colorScheme" | "themeColor">> {
  return {
    colorScheme: "light dark",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
      { media: DARK_QUERY, color: dark },
    ],
  };
}

export const CUSTOMER_DARK_COLOR = "#101713";
export const CUSTOMER_VIEWPORT = viewport(CUSTOMER_DARK_COLOR);
export const THEME_VIEWPORT = viewport(THEME_COLORS.dark);

/** A stored value as a choice: `light` / `dark`, anything else (absent, unknown) is `system`. */
export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  const trimmed = value?.trim().toLowerCase();
  return trimmed === "light" || trimmed === "dark" ? trimmed : "system";
}

/** A known choice or `null`, for values from outside (a request body). */
export function knownThemeChoice(value: unknown): ThemeChoice | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return (THEME_CHOICES as ReadonlyArray<string>).includes(trimmed)
    ? (trimmed as ThemeChoice)
    : null;
}

/** The theme shown for a choice, given whether the device prefers dark. */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

/** The choice from a `Cookie` header (`a=1; gd_theme=dark`, or `document.cookie`). */
export function themeFromCookieHeader(header: string | null | undefined): ThemeChoice {
  if (!header) return "system";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== THEME_COOKIE) continue;
    return parseThemeChoice(part.slice(separator + 1));
  }
  return "system";
}

export interface ThemeCookie {
  name: string;
  /** `""` with `maxAge: 0` deletes the cookie (the `system` choice). */
  value: ResolvedTheme | "";
  attributes: {
    httpOnly: false;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
}

/**
 * The `Set-Cookie` of a choice as a plain object, applied with
 * `response.cookies.set(cookie.name, cookie.value, cookie.attributes)`. `system` deletes it.
 */
export function themeCookie(choice: ThemeChoice, secure: boolean): ThemeCookie {
  const keep = choice !== "system";
  return {
    name: THEME_COOKIE,
    value: keep ? choice : "",
    attributes: {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: THEME_COOKIE_PATH,
      maxAge: keep ? THEME_MAX_AGE_SECONDS : 0,
    },
  };
}

/** The same cookie as a `document.cookie` assignment. */
export function themeCookieString(choice: ThemeChoice, secure: boolean): string {
  const { name, value, attributes } = themeCookie(choice, secure);
  return `${name}=${value}; Path=${attributes.path}; Max-Age=${attributes.maxAge}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

/**
 * The inline `<head>` script of every document ("Preventing flash before hydration", cookie
 * variant): reads `gd_theme` while the HTML is parsed and sets `<html data-theme>` before the first
 * paint; without the cookie it follows `prefers-color-scheme`. The documents render
 * `data-theme="light"` (the no-JavaScript default) with `suppressHydrationWarning`.
 */
// A fixed literal (no interpolation): the cookie name and media query are spelled out here and a
// unit test checks they match THEME_COOKIE and DARK_QUERY.
export const THEME_SCRIPT =
  '(function(){try{var d=document.documentElement,m=document.cookie.match(/(?:^|; )gd_theme=(light|dark)(?:;|$)/),t=m?m[1]:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");d.setAttribute("data-theme",t)}catch(e){}})()';
