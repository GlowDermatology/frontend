import { LOCALES, type Locale } from "@/lib/i18n/locales";

import { equivalentPath, shopPath } from "../routing/routes";

/** The query a language switch keeps: the catalog's filters, nothing else. */
export const KEPT_PARAMS = ["q", "category", "sort", "stock", "page"] as const;

/**
 * The same page in `target`: `/mahsulotlar/x?q=a&utm=b` → `/ru/products/x?q=a` (unknown paths →
 * that language's home page; only `KEPT_PARAMS` survive, in their order).
 */
export function languageHref(pathname: string, search: string, target: Locale): string {
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const key of KEPT_PARAMS) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  return `${equivalentPath(pathname, target)}${query ? `?${query}` : ""}`;
}

/** Every language's address of the current page. */
export function languageHrefs(pathname: string, search: string): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, languageHref(pathname, search, locale)]),
  ) as Record<Locale, string>;
}

/** Before the URL is known (the static shell): each language's home page. */
export function homeHrefs(): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, shopPath(locale, { kind: "home" })]),
  ) as Record<Locale, string>;
}
