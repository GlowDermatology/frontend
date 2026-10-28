import type { Locale } from "@/lib/i18n/locales";

/**
 * Localizes the unit of a product volume (U6). The catalog stores one free
 * text per product ("30 ml", "50 g", "2 dona"), written in Latin script; a
 * Russian page reads «30 мл». Only a unit right after a number changes, the
 * rest of the text is kept as is.
 */
const UNITS: Record<string, Record<Locale, string>> = {
  ml: { uz: "ml", ru: "мл", en: "ml" },
  l: { uz: "l", ru: "л", en: "l" },
  g: { uz: "g", ru: "г", en: "g" },
  gr: { uz: "g", ru: "г", en: "g" },
  kg: { uz: "kg", ru: "кг", en: "kg" },
  mg: { uz: "mg", ru: "мг", en: "mg" },
  dona: { uz: "dona", ru: "шт.", en: "pcs" },
  pcs: { uz: "dona", ru: "шт.", en: "pcs" },
};

const ALIASES: Record<string, string> = {
  мл: "ml",
  л: "l",
  г: "g",
  гр: "g",
  кг: "kg",
  мг: "mg",
  шт: "pcs",
  "шт.": "pcs",
  pc: "pcs",
  ta: "pcs",
};

const PATTERN = /(\d(?:[\d\s.,]*\d)?)(\s*)(шт\.|[a-zа-я]+)(?![\p{L}])/giu;

export function localizeVolume(volume: string, locale: Locale): string {
  return volume.replace(PATTERN, (match, amount: string, space: string, raw: string) => {
    const key = raw.toLowerCase();
    const unit = UNITS[ALIASES[key] ?? key];
    return unit ? `${amount}${space || " "}${unit[locale]}` : match;
  });
}
