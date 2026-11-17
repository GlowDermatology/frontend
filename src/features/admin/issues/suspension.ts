import type { DispatchSuspension } from "@/domain/delivery-issue";
import { createFormatter, tashkentParts } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { issuesCopy } from "./copy";

/**
 * The courier-dispatch switch (`delivery/suspension/`, plan decision 13):
 * the Tashkent `datetime-local` value ↔ the aware instant the API takes, and
 * the switch's status line. Uzbekistan keeps UTC+5 all year.
 */

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** `2026-10-25T18:00` (Tashkent) → `2026-10-25T18:00:00+05:00`; empty → `null`; malformed → `undefined`. */
export function untilFromLocal(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = LOCAL.exec(trimmed);
  if (!match) return undefined;
  const iso = `${trimmed}:00+05:00`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return undefined;
  // `Date.parse` rolls 2026-02-30 over; the local parts must survive the round trip.
  const parts = tashkentParts(new Date(ms));
  const [, year, month, day, hours, minutes] = match.map(Number);
  if (
    parts.year !== year ||
    parts.month + 1 !== month ||
    parts.day !== day ||
    parts.hours !== hours ||
    parts.minutes !== minutes
  ) {
    return undefined;
  }
  return iso;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** An instant → the `datetime-local` value in Tashkent (`YYYY-MM-DDTHH:MM`). */
export function localInputValue(instant: string | Date): string {
  const p = tashkentParts(instant);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`;
}

/** "Kuryer chaqirish ishlayapti" / "To‘xtatilgan · 25-okt, 18:00 gacha" / "… · qo‘lda yoqilguncha". */
export function suspensionLine(suspension: DispatchSuspension, locale: Locale = "uz"): string {
  const t = issuesCopy[locale].suspension;
  if (!suspension.suspended) return t.working;
  return suspension.until
    ? t.until(createFormatter(locale).dateTimeShort(suspension.until))
    : t.manual;
}

/** Whether an aware `until` is not after `now` (the API refuses it: `in_past`). */
export function untilInPast(until: string | null, now: string | Date): boolean {
  if (until === null) return false;
  const at = Date.parse(until);
  return Number.isNaN(at) || at <= new Date(now).getTime();
}
