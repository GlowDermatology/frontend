import type { Route } from "next";

import { en } from "./content/en";
import { ru } from "./content/ru";
import { uz, type LandingDictionary } from "./content/uz";

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Uzbek is served at `/`; the other languages live under `/ru` and `/en`. */
export const DEFAULT_LOCALE: Locale = "uz";

/** Locales served by the `[locale]` segment (everything except the default). */
export const PREFIXED_LOCALES = LOCALES.filter(
  (locale): locale is Exclude<Locale, typeof DEFAULT_LOCALE> => locale !== DEFAULT_LOCALE,
);

export const LOCALE_INFO: Record<Locale, { short: string; name: string; ogLocale: string }> = {
  uz: { short: "UZ", name: "O‘zbekcha", ogLocale: "uz_UZ" },
  ru: { short: "RU", name: "Русский", ogLocale: "ru_RU" },
  en: { short: "EN", name: "English", ogLocale: "en_US" },
};

const DICTIONARIES: Record<Locale, LandingDictionary> = { uz, ru, en };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as ReadonlyArray<string>).includes(value);
}

export function getDictionary(locale: Locale): LandingDictionary {
  return DICTIONARIES[locale];
}

export function localePath(locale: Locale): Route {
  return locale === DEFAULT_LOCALE ? "/" : (`/${locale}` as Route);
}
