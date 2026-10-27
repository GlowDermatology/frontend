import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n/locales";

/** The languages served under `/{locale}` (Uzbek lives at the root). */
export type IntlLocale = Exclude<Locale, "uz">;

/** `ru` / `en` from the `[locale]` segment; anything else (incl. `uz`) is a 404. */
export function intlLocale(value: string): IntlLocale {
  if (!isLocale(value) || value === "uz") notFound();
  return value;
}

export async function intlLocaleFrom(params: Promise<{ locale: string }>): Promise<IntlLocale> {
  return intlLocale((await params).locale);
}
