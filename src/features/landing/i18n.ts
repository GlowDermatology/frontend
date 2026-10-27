import type { Route } from "next";

import { en } from "./content/en";
import { ru } from "./content/ru";
import { uz, type LandingDictionary } from "./content/uz";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_INFO,
  PREFIXED_LOCALES,
  isLocale,
  type Locale,
} from "@/lib/i18n/locales";

const DICTIONARIES: Record<Locale, LandingDictionary> = { uz, ru, en };

export function getDictionary(locale: Locale): LandingDictionary {
  return DICTIONARIES[locale];
}

export function localePath(locale: Locale): Route {
  return locale === DEFAULT_LOCALE ? "/" : (`/${locale}` as Route);
}
