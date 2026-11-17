import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/**
 * The admin panel's language cookie (DESIGN §G): `gd_admin_language`, one of `uz | ru | en`, on
 * `Path=/admin` for a year. Not HttpOnly: the inline head script of `app/admin/layout.tsx` reads it
 * to set `<html lang>` before the first paint, and the sign-in page's small switcher may write it.
 * Pure and dependency-free (shared by the server helpers, the route handlers and the head script).
 *
 * The source of truth for a signed-in member is `StaffUser.language` (`PATCH auth/me/`); the cookie
 * is its copy in this browser, written at sign-in from the login answer and by the Settings switcher.
 */

export const ADMIN_LOCALE_COOKIE = "gd_admin_language";
export const ADMIN_LOCALE_PATH = "/admin";
/** One year, in seconds. */
export const ADMIN_LOCALE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** The admin language for a raw value: a known locale, else Uzbek (the source language). */
export function parseAdminLocale(value: string | null | undefined): Locale {
  const trimmed = value?.trim().toLowerCase();
  return isLocale(trimmed) ? trimmed : DEFAULT_LOCALE;
}

/**
 * A known locale or `null`: for values that come from outside (the login answer's
 * `user.language`, a form field), where "absent" and "unknown" must not overwrite a choice.
 */
export function knownAdminLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return isLocale(trimmed) ? trimmed : null;
}

/**
 * The admin language from a `Cookie` request header (`a=1; gd_admin_language=ru`). Used where the
 * request headers are already at hand (the API client reads them for the client IP), so no second
 * request API is touched.
 */
export function adminLocaleFromCookieHeader(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== ADMIN_LOCALE_COOKIE) continue;
    let value = part.slice(separator + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return DEFAULT_LOCALE;
    }
    return parseAdminLocale(value);
  }
  return DEFAULT_LOCALE;
}

export interface AdminLocaleCookie {
  name: string;
  value: Locale;
  attributes: {
    httpOnly: false;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
}

/**
 * The `Set-Cookie` of a language choice, as a plain object (unit-tested), applied with
 * `store.set(cookie.name, cookie.value, cookie.attributes)` to `cookies()` (Server Actions) or
 * `NextResponse.cookies` (route handlers). `secure` follows `GLOWDERMA_COOKIE_SECURE`.
 */
export function adminLocaleCookie(locale: Locale, secure: boolean): AdminLocaleCookie {
  return {
    name: ADMIN_LOCALE_COOKIE,
    value: locale,
    attributes: {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: ADMIN_LOCALE_PATH,
      maxAge: ADMIN_LOCALE_MAX_AGE_SECONDS,
    },
  };
}

/** The subset of `ResponseCookies` / `cookies()` that `applyAdminLocaleCookie` needs. */
export interface AdminLocaleCookieSink {
  set(name: string, value: string, options: AdminLocaleCookie["attributes"]): unknown;
}

export function applyAdminLocaleCookie(
  sink: AdminLocaleCookieSink,
  locale: Locale,
  secure: boolean,
): void {
  const cookie = adminLocaleCookie(locale, secure);
  sink.set(cookie.name, cookie.value, cookie.attributes);
}

/**
 * The inline `<head>` script of the admin root layout ("Preventing flash before hydration",
 * cookie variant): reads the cookie while the HTML is parsed and sets `<html lang>` before the
 * first paint, so the static shell stays prerendered with the Uzbek default and screen readers
 * still announce the right language. Only the three known values are applied.
 */
export const HTML_LANG_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${ADMIN_LOCALE_COOKIE}=(uz|ru|en)(?:;|$)/);if(m)document.documentElement.lang=m[1]}catch(e){}})()`;

/**
 * The saved language of a signed-in staff member from a login answer's `user` (`StaffUser.language`,
 * DESIGN §E/§G), or `null` when the backend did not send one (an older API) or sent an unknown value.
 */
export function staffLanguage(user: unknown): Locale | null {
  if (typeof user !== "object" || user === null || !("language" in user)) return null;
  return knownAdminLocale((user as { language?: unknown }).language);
}
