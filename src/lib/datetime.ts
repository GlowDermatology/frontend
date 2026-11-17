/**
 * Calendar and wall-clock helpers for the admin pickers. The business runs in
 * Tashkent (UTC+5, no DST), and every value the forms exchange is a Tashkent
 * wall-clock string in the formats the native inputs used before:
 *
 * - day `YYYY-MM-DD`, time `HH:MM`, both `YYYY-MM-DDTHH:MM`;
 * - shown to people as `DD.MM.YYYY`, `HH:MM` and `DD.MM.YYYY HH:MM`.
 *
 * Everything below is string and integer math (no `Intl`, no browser time
 * zone): the same input gives the same output on the server, in every
 * browser and in tests. Only `tashkentNow`/`tashkentToday` and the aware-ISO
 * conversions read an instant.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** The offset the API's aware datetimes carry for Tashkent. */
export const TASHKENT_OFFSET = "+05:00";

/** Years the pickers accept (four digits, as `YYYY-MM-DD` requires). */
export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;

export interface DateParts {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in `month` (1–12) of `year`. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** `YYYY-MM-DD` from parts (no validation; see `isValidDate`). */
export function isoDate(year: number, month: number, day: number): string {
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

function isValidParts(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/** `YYYY-MM-DD` → parts; anything else (incl. 2026-02-30) → `null`. */
export function parseIsoDate(value: string | null | undefined): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isValidParts(year, month, day) ? { year, month, day } : null;
}

export function isIsoDate(value: string | null | undefined): value is string {
  return parseIsoDate(value) !== null;
}

/** `HH:MM`, 00:00–23:59. */
export function isIsoTime(value: string | null | undefined): value is string {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  return match !== null && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

/** `YYYY-MM-DDTHH:MM`. */
export function isIsoDateTime(value: string | null | undefined): value is string {
  const { date, time } = splitDateTime(value ?? "");
  return isIsoDate(date) && isIsoTime(time) && (value ?? "").length === 16;
}

/* Day numbers (days since 1970-01-01, proleptic Gregorian; H. Hinnant's algorithm). */

function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): DateParts {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function requireDate(iso: string): DateParts {
  const parts = parseIsoDate(iso);
  if (!parts) throw new RangeError(`Not a YYYY-MM-DD day: ${iso}`);
  return parts;
}

/** Days since 1970-01-01 of a `YYYY-MM-DD` day (throws on an invalid day). */
export function dayNumber(iso: string): number {
  const { year, month, day } = requireDate(iso);
  return daysFromCivil(year, month, day);
}

/** The `YYYY-MM-DD` day of a day number. */
export function fromDayNumber(days: number): string {
  const { year, month, day } = civilFromDays(days);
  return isoDate(year, month, day);
}

/** `iso` plus `n` days (negative goes back). */
export function addDays(iso: string, n: number): string {
  return fromDayNumber(dayNumber(iso) + n);
}

/**
 * `iso` plus `n` months; the day is kept, or clamped to the last day of a
 * shorter month (31 Jan + 1 month = 28/29 Feb).
 */
export function addMonths(iso: string, n: number): string {
  const { year, month, day } = requireDate(iso);
  const index = year * 12 + (month - 1) + n;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;
  return isoDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

/** `iso` plus `n` years (29 Feb → 28 Feb in a common year). */
export function addYears(iso: string, n: number): string {
  return addMonths(iso, n * 12);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** Day of the week, Monday first: 0 = Monday … 6 = Sunday. */
export function weekdayOf(iso: string): number {
  // 1970-01-01 was a Thursday (3 with Monday = 0).
  return (((dayNumber(iso) + 3) % 7) + 7) % 7;
}

/** The Monday of the week of `iso`. */
export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}

/** The Sunday of the week of `iso`. */
export function endOfWeek(iso: string): string {
  return addDays(iso, 6 - weekdayOf(iso));
}

export function startOfMonth(iso: string): string {
  const { year, month } = requireDate(iso);
  return isoDate(year, month, 1);
}

export function endOfMonth(iso: string): string {
  const { year, month } = requireDate(iso);
  return isoDate(year, month, daysInMonth(year, month));
}

/** `YYYY-MM` of a day. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export interface MonthGridDay {
  iso: string;
  /** Day of the month, 1–31. */
  day: number;
  /** `false` for the leading/trailing days of the neighbouring months. */
  inMonth: boolean;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
}

/**
 * The calendar page of `month` (1–12): always six Monday-first weeks, so the
 * grid keeps its height from month to month; the neighbouring months' days
 * fill the first and last rows.
 */
export function monthGrid(year: number, month: number): MonthGridDay[][] {
  const first = isoDate(year, month, 1);
  const start = dayNumber(first) - weekdayOf(first);
  const weeks: MonthGridDay[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const row: MonthGridDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const parts = civilFromDays(start + week * 7 + weekday);
      row.push({
        iso: isoDate(parts.year, parts.month, parts.day),
        day: parts.day,
        inMonth: parts.month === month && parts.year === year,
        weekday,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/**
 * Keeps `value` within `[min, max]`. Works for any one of the fixed-width
 * formats (`YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM`), whose string order is
 * their time order. A missing bound is open.
 */
export function clampIso(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/** `value` within `[min, max]` (same formats as `clampIso`). */
export function isWithin(value: string, min?: string, max?: string): boolean {
  return !(min && value < min) && !(max && value > max);
}

/* Display formats. */

/** `YYYY-MM-DD` → `DD.MM.YYYY`; anything else → "". */
export function formatDisplayDate(iso: string | null | undefined): string {
  const parts = parseIsoDate(iso);
  return parts ? `${pad2(parts.day)}.${pad2(parts.month)}.${pad4(parts.year)}` : "";
}

/**
 * What a person typed or pasted into a day field → `YYYY-MM-DD`, or `null`
 * when it is not a whole, real day. Accepts `DD.MM.YYYY` (also with `/`, `-`
 * or spaces, one-digit day and month), eight digits `DDMMYYYY`, and ISO
 * `YYYY-MM-DD` (also the day of a pasted `YYYY-MM-DDTHH:MM[:SS…]`), so a
 * test's `.fill("2026-11-17")` works as it did on the native input. The year
 * must have four digits (a two-digit year would commit 2020 while 2026 is
 * still being typed).
 */
export function parseDisplayDate(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const iso =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      value,
    );
  if (iso) return fromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /^(\d{1,2})\s*[./\-\s]\s*(\d{1,2})\s*[./\-\s]\s*(\d{4})$/.exec(value);
  if (local) return fromParts(Number(local[3]), Number(local[2]), Number(local[1]));
  const packed = /^(\d{2})(\d{2})(\d{4})$/.exec(value);
  if (packed) return fromParts(Number(packed[3]), Number(packed[2]), Number(packed[1]));
  return null;
}

function fromParts(year: number, month: number, day: number): string | null {
  return isValidParts(year, month, day) ? isoDate(year, month, day) : null;
}

/** Digits of the start of a day draft, the way the mask counts them. */
const DIGITS_ONLY = /^\d+$/;

/**
 * Typing mask of a day field: while digits are typed at the end, the dots of
 * `DD.MM.YYYY` are inserted ("17" → "17.", "17.11" → "17.11.", "17112026" →
 * "17.11.2026"). Deleting never re-inserts a dot, and anything that already
 * has separators or looks like ISO (`2026-…`) is left as typed, so pasting or
 * `.fill()`-ing an ISO day works.
 */
export function maskDateDraft(previous: string, next: string): string {
  if (next.length <= previous.length) return next;
  if (DIGITS_ONLY.test(next)) {
    if (next.length < 2) return next;
    const [day, month, year] = [next.slice(0, 2), next.slice(2, 4), next.slice(4, 8)];
    if (next.length === 2) return `${day}.`;
    if (next.length < 4) return `${day}.${month}`;
    if (next.length === 4) return `${day}.${month}.`;
    return `${day}.${month}.${year}`;
  }
  if (/^\d{1,2}\.\d{2}$/.test(next)) return `${next}.`;
  const packed = /^(\d{1,2})\.(\d{2})(\d{1,4})\d*$/.exec(next);
  if (packed) return `${packed[1]}.${packed[2]}.${packed[3]}`;
  return next;
}

/**
 * A typed time → `HH:MM`, or `null`. Accepts `H`, `HH`, `H:MM`, `HH:MM`
 * (also with `.`), `HHMM`, `HMM` and seconds (`13:00:00`, dropped).
 */
export function parseDisplayTime(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  let hours: number;
  let minutes: number;
  const separated = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(value);
  const packed = /^(\d{1,2})(\d{2})$/.exec(value);
  if (separated) {
    hours = Number(separated[1]);
    minutes = Number(separated[2]);
  } else if (packed) {
    hours = Number(packed[1]);
    minutes = Number(packed[2]);
  } else if (/^\d{1,2}$/.test(value)) {
    hours = Number(value);
    minutes = 0;
  } else {
    return null;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/**
 * Typing mask of a time field: "13" → "13:", "1300" → "13:00", a first
 * digit 3–9 is an hour on its own ("9" → "09:"). Deleting never re-inserts
 * the colon.
 */
export function maskTimeDraft(previous: string, next: string): string {
  if (next.length <= previous.length || !DIGITS_ONLY.test(next)) return next;
  if (next.length === 1) return Number(next) >= 3 ? `0${next}:` : next;
  if (next.length === 2) return `${next}:`;
  return `${next.slice(0, 2)}:${next.slice(2, 4)}`;
}

/** `YYYY-MM-DDTHH:MM` → `{ date, time }` (either may be ""). */
export function splitDateTime(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

/** `date` + `time` → `YYYY-MM-DDTHH:MM`; "" unless both are valid. */
export function joinDateTime(date: string, time: string): string {
  return isIsoDate(date) && isIsoTime(time) ? `${date}T${time}` : "";
}

/** `YYYY-MM-DDTHH:MM` → `DD.MM.YYYY HH:MM`; anything else → "". */
export function formatDisplayDateTime(value: string | null | undefined): string {
  if (!isIsoDateTime(value)) return "";
  const { date, time } = splitDateTime(value);
  return `${formatDisplayDate(date)} ${time}`;
}

/**
 * A typed or pasted date and time → `YYYY-MM-DDTHH:MM`, or `null`. Accepts
 * `DD.MM.YYYY HH:MM` (also with a comma), ISO `YYYY-MM-DDTHH:MM[:SS]` and
 * `YYYY-MM-DD HH:MM`. An aware ISO datetime (`…+05:00`, `…Z`) is converted to
 * the Tashkent wall clock.
 */
export function parseDisplayDateTime(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return toLocalInput(value) || null;
  }
  const match = /^(.+?)(?:[T\s,]+)(\d{1,2}[:.]\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(value);
  if (!match) return null;
  const date = parseDisplayDate(match[1]!);
  const time = parseDisplayTime(match[2]!.replace(/(:\d{2}:\d{2})\.\d+$/, "$1"));
  return date && time ? `${date}T${time}` : null;
}

/**
 * Typing mask of a date-and-time field: the day part is masked like
 * `maskDateDraft`, a space follows a complete day, and the time part is
 * masked like `maskTimeDraft`.
 */
export function maskDateTimeDraft(previous: string, next: string): string {
  if (next.length <= previous.length || /^\d{4}-/.test(next)) return next;
  if (DIGITS_ONLY.test(next) && next.length > 8) {
    return `${maskDateDraft("", next.slice(0, 8))} ${maskTimeDraft("", next.slice(8, 12))}`;
  }
  const space = next.indexOf(" ");
  if (space === -1) {
    const day = maskDateDraft(previous, next);
    return /^\d{2}\.\d{2}\.\d{4}$/.test(day) ? `${day} ` : day;
  }
  const date = next.slice(0, space);
  const time = next.slice(space + 1);
  const previousTime = previous.startsWith(`${date} `) ? previous.slice(space + 1) : "";
  return `${date} ${maskTimeDraft(previousTime, time)}`;
}

/* Times. */

/** `HH:MM` → minutes after midnight. */
export function timeToMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** Minutes after midnight → `HH:MM` (wraps around the day). */
export function minutesToTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** The minutes of the hour on a `step`-minute grid (5 → 0, 5, …, 55). */
export function minuteSteps(step = 5): number[] {
  const size = Math.max(1, Math.min(60, Math.floor(step)));
  const steps: number[] = [];
  for (let m = 0; m < 60; m += size) steps.push(m);
  return steps;
}

/* Tashkent wall clock. */

function wallClock(now: Date | number): string {
  const ms = typeof now === "number" ? now : now.getTime();
  return new Date(ms + TASHKENT_OFFSET_MS).toISOString().slice(0, 16);
}

/** The Tashkent wall clock at `now` as `YYYY-MM-DDTHH:MM`. */
export function tashkentNow(now: Date | number = Date.now()): string {
  return wallClock(now);
}

/** Today in Tashkent as `YYYY-MM-DD`. */
export function tashkentToday(now: Date | number = Date.now()): string {
  return wallClock(now).slice(0, 10);
}

/* The API's aware datetimes (moved from `features/admin/banners/datetime.ts`). */

/** ISO with offset → "YYYY-MM-DDTHH:MM" (Tashkent); `null`/invalid → "". */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : wallClock(ms);
}

/** "YYYY-MM-DDTHH:MM[:SS]" → "YYYY-MM-DDTHH:MM:SS+05:00"; "" → `null`; garbage → `null`. */
export function fromLocalInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match || !isIsoDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59) {
    return null;
  }
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4] ?? "00"}${TASHKENT_OFFSET}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
