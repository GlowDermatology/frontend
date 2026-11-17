import type { Locale } from "@/lib/i18n/locales";

/**
 * Deterministic formatting for the admin panel (uz / ru / en) and the storefront.
 *
 * Intl's locale data differs between Node and browsers, which would cause hydration mismatches,
 * so numbers and dates are formatted by hand. Money is an integer amount of so‘m (UZS), as stored
 * by the backend. Dates are Tashkent wall-clock (UTC+5, no daylight saving).
 *
 * Admin code formats through `createFormatter(locale)` — `useFormat()` in client components
 * (`@/lib/i18n/admin-hooks`), `await getFormat()` on the server (`@/lib/i18n/admin-locale`). The
 * Uzbek functions below (`formatSom`, `formatDateTimeShort`, …) are the `uz` formatter's methods,
 * kept for the call sites that are not migrated yet.
 */

const NBSP = "\u00A0";
const MINUS = "−";

type DateInput = string | Date;

/* -------------------------------------------------------------------------- */
/* Calendar names                                                             */
/* -------------------------------------------------------------------------- */

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

const MONTHS_RU_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

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

const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
] as const;
const WEEKDAYS_RU_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const WEEKDAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const WEEKDAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* -------------------------------------------------------------------------- */
/* Tashkent wall clock                                                        */
/* -------------------------------------------------------------------------- */

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

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

function sameLocalDay(a: LocalDateParts, b: LocalDateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/* -------------------------------------------------------------------------- */
/* Plurals                                                                    */
/* -------------------------------------------------------------------------- */

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

/** English plural form: 1 order, 2 orders (`forms` = one, other). */
export function pluralEn(count: number, forms: readonly [string, string]): string {
  return Math.abs(count) === 1 ? forms[0] : forms[1];
}

/**
 * The noun forms of one language for `AdminFormatter.plural` / `count`: Uzbek needs `one` only
 * ("5 ta buyurtma"), English `one` + `other`, Russian `one` + `few` + `many`. A missing form
 * falls back to `other`, then `one`.
 */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other?: string;
}

/* -------------------------------------------------------------------------- */
/* The admin formatter                                                        */
/* -------------------------------------------------------------------------- */

/** Every admin formatting rule of one language. Obtain it with `createFormatter(locale)`. */
export interface AdminFormatter {
  readonly locale: Locale;
  /** 1128000 → "1 128 000" (uz, ru: non-breaking spaces) · "1,128,000" (en); minus is U+2212. */
  number(value: number): string;
  /** 784400 → "784 400 so‘m" · "784 400 сум" · "784,400 UZS". */
  som(value: number): string;
  /** Ledger-style amount with an explicit sign: "+5 680", "−48 600". */
  signed(value: number): string;
  /** 6420000 → "6,42 mln" · "6,42 млн" · "6.42M". */
  millions(value: number, maxFractionDigits?: number): string;
  /** "12,5 %" · "12,5 %" · "12.5%" (a percent value, not a fraction). */
  percent(value: number, maxFractionDigits?: number): string;
  /** "+998901234567" → "+998 90 123 45 67" (the same in every language). */
  phone(e164: string): string;
  /** "14:02" */
  time(input: DateInput): string;
  /** "23-okt" · "23 окт" · "23 Oct" */
  dayMonthShort(input: DateInput): string;
  /** "24-oktabr" · "24 октября" · "24 October" */
  dayMonth(input: DateInput): string;
  /** "23-oktabr 2026" · "23 октября 2026" · "23 October 2026" */
  dateLong(input: DateInput): string;
  /** "23-okt, 14:02" · "23 окт, 14:02" · "23 Oct, 14:02" */
  dateTimeShort(input: DateInput): string;
  /** "23-oktabr 2026, 14:02" · "23 октября 2026, 14:02" · "23 October 2026, 14:02" */
  dateTimeLong(input: DateInput): string;
  /** "24-oktabr, shanba" · "24 октября, суббота" · "24 October, Saturday" */
  dayMonthWeekday(input: DateInput): string;
  /** "Dushanba, 26-oktabr" · "Понедельник, 26 октября" · "Monday, 26 October" */
  weekdayDayMonth(input: DateInput): string;
  /** "Du, 26-okt, 09:00" · "Пн, 26 окт, 09:00" · "Mon, 26 Oct, 09:00" */
  weekdayShortDateTime(input: DateInput): string;
  /** "oktabr 2026" · "октябрь 2026" · "October 2026" (calendar titles). */
  monthYear(input: DateInput): string;
  /** "Bugun, 11:42" · "Сегодня, 11:42" · "Today, 11:42" for today, else `dateTimeShort`. */
  relativeDateTime(input: DateInput, now: DateInput): string;
  /**
   * Elapsed time up to a day: "hozirgina" · "только что" · "just now" (< 1 min), "10 daqiqa oldin"
   * · "10 минут назад" · "10 min ago", "3 soat oldin" · "3 часа назад" · "3 h ago"; older ones
   * read as `dateTimeShort`.
   */
  ago(input: DateInput, now: DateInput): string;
  /** "1 soat 30 daqiqa" · "1 ч 30 мин" · "1 h 30 min". */
  duration(minutes: number): string;
  /** The form of `forms` that goes with `count` (Russian one/few/many, English one/other). */
  plural(count: number, forms: PluralForms): string;
  /** "5 ta buyurtma" · "5 заказов" · "5 orders": the number (grouped) and its noun form. */
  count(count: number, forms: PluralForms): string;
  /** Month names, lower case in uz/ru (nominative), capitalised in en; index 0 = January. */
  readonly months: ReadonlyArray<string>;
  readonly monthsShort: ReadonlyArray<string>;
  /** Weekday names, Sunday-first (`Date#getUTCDay`); lower case in uz/ru. */
  readonly weekdays: ReadonlyArray<string>;
  readonly weekdaysShort: ReadonlyArray<string>;
}

interface CalendarNames {
  /** Nominative month names (month titles). */
  months: ReadonlyArray<string>;
  /** The month form after a day number ("24 октября"). */
  monthsAfterDay: ReadonlyArray<string>;
  monthsShort: ReadonlyArray<string>;
  weekdays: ReadonlyArray<string>;
  weekdaysShort: ReadonlyArray<string>;
}

const CALENDAR: Record<Locale, CalendarNames> = {
  uz: {
    months: MONTHS,
    monthsAfterDay: MONTHS,
    monthsShort: MONTHS_SHORT,
    weekdays: WEEKDAYS,
    weekdaysShort: WEEKDAYS_SHORT,
  },
  ru: {
    months: MONTHS_RU_NOMINATIVE,
    monthsAfterDay: MONTHS_RU_GENITIVE,
    monthsShort: MONTHS_RU_SHORT,
    weekdays: WEEKDAYS_RU,
    weekdaysShort: WEEKDAYS_RU_SHORT,
  },
  en: {
    months: MONTHS_EN,
    monthsAfterDay: MONTHS_EN,
    monthsShort: MONTHS_EN_SHORT,
    weekdays: WEEKDAYS_EN,
    weekdaysShort: WEEKDAYS_EN_SHORT,
  },
};

const RELATIVE: Record<
  Locale,
  {
    today: string;
    justNow: string;
    minutesAgo: (n: string, count: number) => string;
    hoursAgo: (n: string, count: number) => string;
    duration: { h: string; m: string };
    millions: string;
  }
> = {
  uz: {
    today: "Bugun",
    justNow: "hozirgina",
    minutesAgo: (n) => `${n} daqiqa oldin`,
    hoursAgo: (n) => `${n} soat oldin`,
    duration: { h: "soat", m: "daqiqa" },
    millions: "mln",
  },
  ru: {
    today: "Сегодня",
    justNow: "только что",
    minutesAgo: (n, count) => `${n} ${pluralRu(count, ["минуту", "минуты", "минут"])} назад`,
    hoursAgo: (n, count) => `${n} ${pluralRu(count, ["час", "часа", "часов"])} назад`,
    duration: { h: "ч", m: "мин" },
    millions: "млн",
  },
  en: {
    today: "Today",
    justNow: "just now",
    minutesAgo: (n) => `${n} min ago`,
    hoursAgo: (n) => `${n} h ago`,
    duration: { h: "h", m: "min" },
    millions: "M",
  },
};

function groupDigits(value: number, separator: string): string {
  const sign = value < 0 ? MINUS : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function decimal(value: number, maxFractionDigits: number, comma: boolean): string {
  const rounded = Number(value.toFixed(maxFractionDigits));
  const text = String(Math.abs(rounded));
  return (rounded < 0 ? MINUS : "") + (comma ? text.replace(".", ",") : text);
}

function buildFormatter(locale: Locale): AdminFormatter {
  const names = CALENDAR[locale];
  const words = RELATIVE[locale];
  const comma = locale !== "en";
  const number = (value: number) => groupDigits(value, locale === "en" ? "," : NBSP);
  const time = (input: DateInput) => {
    const p = tashkentParts(input);
    return `${pad(p.hours)}:${pad(p.minutes)}`;
  };
  // uz "23-okt" (hyphen), ru/en "23 окт" (non-breaking space).
  const dayAnd = (day: number, month: string) =>
    locale === "uz" ? `${day}-${month}` : `${day}${NBSP}${month}`;
  const dayMonthShort = (input: DateInput) => {
    const p = tashkentParts(input);
    return dayAnd(p.day, names.monthsShort[p.month]!);
  };
  const dayMonth = (input: DateInput) => {
    const p = tashkentParts(input);
    return dayAnd(p.day, names.monthsAfterDay[p.month]!);
  };
  const dateLong = (input: DateInput) => `${dayMonth(input)} ${tashkentParts(input).year}`;
  const dateTimeShort = (input: DateInput) => `${dayMonthShort(input)}, ${time(input)}`;
  const plural = (count: number, forms: PluralForms) => {
    if (locale === "ru") {
      return pluralRu(count, [
        forms.one,
        forms.few ?? forms.other ?? forms.one,
        forms.many ?? forms.other ?? forms.one,
      ]);
    }
    if (locale === "en") return pluralEn(count, [forms.one, forms.other ?? forms.one]);
    return forms.one;
  };

  return {
    locale,
    number,
    som: (value) => {
      if (locale === "en") return `${number(value)}${NBSP}UZS`;
      return `${number(value)}${NBSP}${locale === "ru" ? "сум" : "so‘m"}`;
    },
    signed: (value) => (value > 0 ? `+${number(value)}` : value === 0 ? "0" : number(value)),
    millions: (value, maxFractionDigits = 2) => {
      const amount = decimal(value / 1_000_000, maxFractionDigits, comma);
      return locale === "en" ? `${amount}${words.millions}` : `${amount}${NBSP}${words.millions}`;
    },
    percent: (value, maxFractionDigits = 2) => {
      const amount = decimal(value, maxFractionDigits, comma);
      return locale === "en" ? `${amount}%` : `${amount}${NBSP}%`;
    },
    phone: (e164) => {
      const d = e164.replace(/\D/g, "");
      if (d.length !== 12 || !d.startsWith("998")) return e164;
      return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    },
    time,
    dayMonthShort,
    dayMonth,
    dateLong,
    dateTimeShort,
    dateTimeLong: (input) => `${dateLong(input)}, ${time(input)}`,
    dayMonthWeekday: (input) =>
      `${dayMonth(input)}, ${names.weekdays[tashkentParts(input).weekday]}`,
    weekdayDayMonth: (input) =>
      `${capitalize(names.weekdays[tashkentParts(input).weekday] ?? "")}, ${dayMonth(input)}`,
    weekdayShortDateTime: (input) =>
      `${names.weekdaysShort[tashkentParts(input).weekday]}, ${dateTimeShort(input)}`,
    monthYear: (input) => {
      const p = tashkentParts(input);
      return `${names.months[p.month]} ${p.year}`;
    },
    relativeDateTime: (input, now) =>
      sameLocalDay(tashkentParts(input), tashkentParts(now))
        ? `${words.today}, ${time(input)}`
        : dateTimeShort(input),
    ago: (input, now) => {
      const elapsed = Math.max(0, toDate(now).getTime() - toDate(input).getTime());
      const minutes = Math.floor(elapsed / 60_000);
      if (minutes < 1) return words.justNow;
      if (minutes < 60) return words.minutesAgo(number(minutes), minutes);
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return words.hoursAgo(number(hours), hours);
      return dateTimeShort(input);
    },
    duration: (minutes) => {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}${NBSP}${words.duration.h}`);
      if (rest > 0 || hours === 0) parts.push(`${rest}${NBSP}${words.duration.m}`);
      return parts.join(" ");
    },
    plural,
    count: (count, forms) =>
      locale === "uz"
        ? `${number(count)} ta ${plural(count, forms)}`
        : `${number(count)} ${plural(count, forms)}`,
    months: names.months,
    monthsShort: names.monthsShort,
    weekdays: names.weekdays,
    weekdaysShort: names.weekdaysShort,
  };
}

const formatters = new Map<Locale, AdminFormatter>();

/** The (memoised) formatter of one admin language. */
export function createFormatter(locale: Locale): AdminFormatter {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = buildFormatter(locale);
    formatters.set(locale, formatter);
  }
  return formatter;
}

/* -------------------------------------------------------------------------- */
/* Uzbek functions (the `uz` formatter), kept for unmigrated call sites       */
/* -------------------------------------------------------------------------- */

const uz = () => createFormatter("uz");

/** 1128000 → "1 128 000" (non-breaking spaces). */
export function formatNumber(value: number): string {
  return uz().number(value);
}

/** 784400 → "784 400 so‘m". */
export function formatSom(value: number): string {
  return uz().som(value);
}

/** Ledger-style amount with an explicit sign: "+5 680", "−48 600". */
export function formatSigned(value: number): string {
  return uz().signed(value);
}

/** 6420000 → "6,42 mln"; 20000000 → "20 mln". */
export function formatMillions(value: number, maxFractionDigits = 2): string {
  return uz().millions(value, maxFractionDigits);
}

/** Digits only, e.g. for money inputs: "1 200 000 so‘m" → 1200000. */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** "+998901234567" → "+998 90 123 45 67". */
export function formatPhone(e164: string): string {
  return uz().phone(e164);
}

/** "14:02" */
export function formatTime(input: DateInput): string {
  return uz().time(input);
}

/** "23-okt" */
export function formatDayMonthShort(input: DateInput): string {
  return uz().dayMonthShort(input);
}

/** "24-oktabr" */
export function formatDayMonth(input: DateInput): string {
  return uz().dayMonth(input);
}

/** "23-oktabr 2026" */
export function formatDateLong(input: DateInput): string {
  return uz().dateLong(input);
}

/** "23-okt, 14:02" */
export function formatDateTimeShort(input: DateInput): string {
  return uz().dateTimeShort(input);
}

/** "23-oktabr 2026, 14:02" */
export function formatDateTimeLong(input: DateInput): string {
  return uz().dateTimeLong(input);
}

/** "24-oktabr, shanba" */
export function formatDayMonthWeekday(input: DateInput): string {
  return uz().dayMonthWeekday(input);
}

/** "Dushanba, 26-oktabr" */
export function formatWeekdayDayMonth(input: DateInput): string {
  return uz().weekdayDayMonth(input);
}

/** "Du, 26-okt, 09:00" */
export function formatWeekdayShortDateTime(input: DateInput): string {
  return uz().weekdayShortDateTime(input);
}

/** "Bugun, 11:42" for today, otherwise "23-okt, 18:30". */
export function formatRelativeDateTime(input: DateInput, now: DateInput): string {
  return uz().relativeDateTime(input, now);
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

/** "1-oktabr 2026" · "1 октября 2026" · "1 October 2026" (Tashkent calendar day). */
export function formatLongDate(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  // Uzbek long dates read year first: "2026-yil 28-oktabr".
  if (locale === "uz") return `${p.year}-yil ${p.day}-${MONTHS[p.month]}`;
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

/** "23-oktabr 2026, 14:02" · "23 октября 2026, 14:02" · "23 October 2026, 14:02" (Tashkent). */
export function formatDateTime(input: DateInput, locale: SiteLocale): string {
  return `${formatLongDate(input, locale)}, ${formatTime(input)}`;
}

/** "23-okt, 14:02" · "23 окт, 14:02" · "23 Oct, 14:02" (Tashkent). */
export function formatShortDateTime(input: DateInput, locale: SiteLocale): string {
  const p = tashkentParts(input);
  if (locale === "uz") return formatDateTimeShort(input);
  const month = (locale === "ru" ? MONTHS_RU_SHORT : MONTHS_EN_SHORT)[p.month];
  return `${p.day}${NBSP}${month}, ${formatTime(input)}`;
}

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
