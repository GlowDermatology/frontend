import type { Locale } from "@/lib/i18n/locales";

import { en } from "./en";
import { ru } from "./ru";
import { uz, type ShopDictionary } from "./uz";

export type { ShopDictionary };

const DICTIONARIES: Record<Locale, ShopDictionary> = { uz, ru, en };

export function getShopDictionary(locale: Locale): ShopDictionary {
  return DICTIONARIES[locale];
}
