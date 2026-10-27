/**
 * Deterministic Uzbek formatting.
 *
 * Intl's `uz` locale data differs between Node and browsers, which would cause
 * hydration mismatches, so numbers and dates are formatted by hand. Money is
 * an integer amount of so‘m (UZS), as stored by the backend.
 */

const NBSP = " ";
const MINUS = "−";

/** 1128000 → "1 128 000" (non-breaking spaces). */
export function formatNumber(value: number): string {
  const sign = value < 0 ? MINUS : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 784400 → "784 400 so‘m". */
export function formatSom(value: number): string {
  return `${formatNumber(value)}${NBSP}so‘m`;
}

/** Ledger-style amount with an explicit sign: "+5 680", "−48 600". */
export function formatSigned(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

/** 6420000 → "6,42 mln"; 20000000 → "20 mln". */
export function formatMillions(value: number, maxFractionDigits = 2): string {
  const rounded = Number((value / 1_000_000).toFixed(maxFractionDigits));
  return `${String(rounded).replace(".", ",")}${NBSP}mln`;
}

/** Digits only, e.g. for money inputs: "1 200 000 so‘m" → 1200000. */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** "+998901234567" → "+998 90 123 45 67". */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length !== 12 || !d.startsWith("998")) return e164;
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/* -------------------------------------------------------------------------- */
/* Dates — the business runs in Asia/Tashkent (UTC+5, no daylight saving).    */
/* -------------------------------------------------------------------------- */

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

export const MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyun",
  "iyul",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
] as const;

/** Sunday-first, matching `Date#getUTCDay`. */
export const WEEKDAYS = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
] as const;

export const WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"] as const;

export interface LocalDateParts {
  year: number;
  /** 0-based month index. */
  month: number;
  day: number;
  hours: number;
  minutes: number;
  /** 0 = Sunday. */
  weekday: number;
}

type DateInput = string | Date;

function toDate(input: DateInput): Date {
  return typeof input === "string" ? new Date(input) : input;
}

export function tashkentParts(input: DateInput): LocalDateParts {
  const shifted = new Date(toDate(input).getTime() + TASHKENT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:02" */
export function formatTime(input: DateInput): string {
  const p = tashkentParts(input);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

/** "23-okt" */
export function formatDayMonthShort(input: DateInput): string {
  const p = tashkentParts(input);
  return `${p.day}-${MONTHS_SHORT[p.month]}`;
}

/** "24-oktabr" */
export function formatDayMonth(input: DateInput): string {
  const p = tashkentParts(input);
  return `${p.day}-${MONTHS[p.month]}`;
}

/** "23-oktabr 2026" */
export function formatDateLong(input: DateInput): string {
  const p = tashkentParts(input);
  return `${p.day}-${MONTHS[p.month]} ${p.year}`;
}

/** "23-okt, 14:02" */
export function formatDateTimeShort(input: DateInput): string {
  return `${formatDayMonthShort(input)}, ${formatTime(input)}`;
}

/** "23-oktabr 2026, 14:02" */
export function formatDateTimeLong(input: DateInput): string {
  return `${formatDateLong(input)}, ${formatTime(input)}`;
}

/** "24-oktabr, shanba" */
export function formatDayMonthWeekday(input: DateInput): string {
  const p = tashkentParts(input);
  return `${p.day}-${MONTHS[p.month]}, ${WEEKDAYS[p.weekday]}`;
}

/** "Dushanba, 26-oktabr" */
export function formatWeekdayDayMonth(input: DateInput): string {
  const p = tashkentParts(input);
  const weekday = WEEKDAYS[p.weekday] ?? "";
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${p.day}-${MONTHS[p.month]}`;
}

/** "Du, 26-okt, 09:00" */
export function formatWeekdayShortDateTime(input: DateInput): string {
  const p = tashkentParts(input);
  return `${WEEKDAYS_SHORT[p.weekday]}, ${formatDateTimeShort(input)}`;
}

function sameLocalDay(a: LocalDateParts, b: LocalDateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** "Bugun, 11:42" for today, otherwise "23-okt, 18:30". */
export function formatRelativeDateTime(input: DateInput, now: DateInput): string {
  const p = tashkentParts(input);
  if (sameLocalDay(p, tashkentParts(now))) return `Bugun, ${formatTime(input)}`;
  return formatDateTimeShort(input);
}

/** ISO date ("2026-10-26") of the Tashkent calendar day containing `input`. */
export function toLocalIsoDate(input: DateInput): string {
  const p = tashkentParts(input);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** Midnight in Tashkent for an ISO date, as an absolute instant. */
export function startOfLocalDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+05:00`);
}

export function addDays(isoDate: string, days: number): string {
  const start = startOfLocalDay(isoDate);
  return toLocalIsoDate(new Date(start.getTime() + days * 24 * 60 * 60 * 1000));
}

/* -------------------------------------------------------------------------- */
/* Storefront (uz / ru / en) — same hand-written approach, no Intl.           */
/* -------------------------------------------------------------------------- */

export type SiteLocale = "uz" | "ru" | "en";

/**
 * A price in so‘m for the storefront's language: "185 000 so‘m",
 * "185 000 сум", "185,000 UZS". Grouping is deterministic (no `Intl`), so the
 * server and the browser render the same string.
 */
export function formatPrice(value: number, locale: SiteLocale): string {
  if (locale === "uz") return formatSom(value);
  if (locale === "ru") return `${formatNumber(value)}${NBSP}сум`;
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${digits}${NBSP}UZS`;
}

const MONTHS_RU_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "1-oktabr 2026" · "1 октября 2026" · "1 October 2026" (Tashkent calendar day). */
export function formatLongDate(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  if (locale === "uz") return formatDateLong(input);
  if (locale === "ru") return `${p.day}${NBSP}${MONTHS_RU_GENITIVE[p.month]} ${p.year}`;
  return `${p.day}${NBSP}${MONTHS_EN[p.month]} ${p.year}`;
}

/** "30 daqiqa" · "30 мин" · "30 min"; whole hours read "1 soat 30 daqiqa". */
export function formatDuration(minutes: number, locale: SiteLocale): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const unit = {
    uz: { h: "soat", m: "daqiqa" },
    ru: { h: "ч", m: "мин" },
    en: { h: "h", m: "min" },
  }[locale];
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${NBSP}${unit.h}`);
  if (rest > 0 || hours === 0) parts.push(`${rest}${NBSP}${unit.m}`);
  return parts.join(" ");
}

/**
 * Russian plural form: 1 товар, 2 товара, 5 товаров (`forms` = one, few,
 * many). Uzbek and English callers pass their own simple forms.
 */
export function pluralRu(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** "23-oktabr 2026, 14:02" · "23 октября 2026, 14:02" · "23 October 2026, 14:02" (Tashkent). */
export function formatDateTime(input: DateInput, locale: SiteLocale): string {
  return `${formatLongDate(input, locale)}, ${formatTime(input)}`;
}

const MONTHS_RU_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;
const MONTHS_EN_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "23-okt, 14:02" · "23 окт, 14:02" · "23 Oct, 14:02" (Tashkent). */
export function formatShortDateTime(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  if (locale === "uz") return formatDateTimeShort(input);
  const month = (locale === "ru" ? MONTHS_RU_SHORT : MONTHS_EN_SHORT)[p.month];
  return `${p.day}${NBSP}${month}, ${formatTime(input)}`;
}

const WEEKDAYS_RU_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const WEEKDAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Short weekday of a Tashkent date: "Du" · "Пн" · "Mon". */
export function formatWeekdayShort(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  return (
    locale === "uz" ? WEEKDAYS_SHORT : locale === "ru" ? WEEKDAYS_RU_SHORT : WEEKDAYS_EN_SHORT
  )[p.weekday]!;
}

/** Day and short month of a Tashkent date: "26-okt" · "26 окт" · "26 Oct". */
export function formatDayMonthShortLocale(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  if (locale === "uz") return formatDayMonthShort(input);
  return `${p.day}${NBSP}${(locale === "ru" ? MONTHS_RU_SHORT : MONTHS_EN_SHORT)[p.month]}`;
}
