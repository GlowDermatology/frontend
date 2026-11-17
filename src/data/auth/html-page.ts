import { NextResponse } from "next/server";

import { authDataCopy, type AuthDataCopy } from "@/domain/copy/auth";
import { themeFromCookieHeader, type ThemeChoice } from "@/lib/theme/theme-cookie";

/**
 * Minimal self-contained HTML answers of the auth route handlers (the
 * same-origin bounce, the refresh retry page, the fake OAuth provider): no
 * app chrome, no scripts, `noindex`, never cached.
 */

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The page colours as custom properties (`--fg`, `--bg`, `--muted`, `--line`, `--field`, `--accent`,
 * `--danger`), the light and Espresso dark values of `globals.css`. */
const LIGHT_VARS =
  "--bg:#fbf8f2;--fg:#2a2418;--muted:#5c5240;--line:#d9cfba;--field-line:#8a7d63;--field:#ffffff;--accent:#7a5a14;--danger:#a12c2c;color-scheme:light";
const DARK_VARS =
  "--bg:#14110d;--fg:#f3ece0;--muted:#a99d87;--line:#332c23;--field-line:#a99d87;--field:#1e1a15;--accent:#e8c77e;--danger:#f08a8a;color-scheme:dark";

/** The colours for a saved theme choice; `system` follows the device (`prefers-color-scheme`). */
export function themeStyle(theme: ThemeChoice): string {
  if (theme === "dark") return `:root{${DARK_VARS}}`;
  if (theme === "light") return `:root{${LIGHT_VARS}}`;
  return `:root{${LIGHT_VARS}}@media (prefers-color-scheme:dark){:root{${DARK_VARS}}}`;
}

/** The theme choice of a request (its `gd_theme` cookie; none = the device's setting). */
export function requestTheme(request: Request): ThemeChoice {
  return themeFromCookieHeader(request.headers.get("cookie"));
}

const BASE_STYLE =
  "*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg)}main{max-width:360px;padding:24px;text-align:center}a{color:var(--accent);font-weight:700}";

/**
 * `title` is escaped; `body` is trusted markup (callers escape what they interpolate). `lang` is
 * the `<html lang>` of the page's language (Uzbek by default). `theme` is the visitor's saved
 * choice (`requestTheme(request)`); `extraStyle` should use the colour properties above.
 */
export function htmlPage(
  title: string,
  body: string,
  init: ResponseInit,
  extraStyle = "",
  lang = "uz",
  theme: ThemeChoice = "system",
): NextResponse {
  const scheme = theme === "system" ? "light dark" : theme;
  const html = `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="${scheme}"><title>${escapeHtml(title)}</title><style>${themeStyle(theme)}${BASE_STYLE}${extraStyle}</style></head><body><main>${body}</main></body></html>`;
  return new NextResponse(html, {
    ...init,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE, ...init.headers },
  });
}

/**
 * A 200 page that re-requests `selfPath` from this origin. Used when a GET
 * arrives cross-site (a link from elsewhere, an OAuth provider's redirect):
 * SameSite=Strict session cookies are absent on such a navigation, and a
 * navigation started by this page carries them.
 */
export function sameOriginBounce(
  selfPath: string,
  title = "Glow Derma Admin",
  texts: Pick<AuthDataCopy["page"], "redirecting" | "continue"> = authDataCopy.uz.page,
  lang = "uz",
  theme: ThemeChoice = "system",
): NextResponse {
  const self = escapeHtml(selfPath);
  return htmlPage(
    title,
    `<meta http-equiv="refresh" content="0;url=${self}"><p>${escapeHtml(texts.redirecting)}</p><p><a href="${self}">${escapeHtml(texts.continue)}</a></p>`,
    { status: 200 },
    "",
    lang,
    theme,
  );
}

export function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location, ...NO_STORE } });
}
