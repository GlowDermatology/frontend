/**
 * The site's languages (shared by the landing, the storefront, the proxy and
 * the sitemaps). Dependency-free so the proxy bundle stays small.
 */
export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Uzbek is served at `/`; the other languages live under `/ru` and `/en`. */
export const DEFAULT_LOCALE: Locale = "uz";

/** Locales served by the `[locale]` segment (everything except the default). */
export const PREFIXED_LOCALES = LOCALES.filter(
  (locale): locale is Exclude<Locale, typeof DEFAULT_LOCALE> => locale !== DEFAULT_LOCALE,
);

export const LOCALE_INFO: Record<
  Locale,
  { short: string; name: string; ogLocale: string; htmlLang: string }
> = {
  uz: { short: "UZ", name: "O‘zbekcha", ogLocale: "uz_UZ", htmlLang: "uz" },
  ru: { short: "RU", name: "Русский", ogLocale: "ru_RU", htmlLang: "ru" },
  en: { short: "EN", name: "English", ogLocale: "en_US", htmlLang: "en" },
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as ReadonlyArray<string>).includes(value);
}
