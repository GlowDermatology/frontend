import type { DispatchSuspension } from "@/domain/delivery-issue";
import { formatDateTimeShort, tashkentParts } from "@/lib/format";

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
export function suspensionLine(suspension: DispatchSuspension): string {
  if (!suspension.suspended) return "Kuryer chaqirish ishlayapti";
  return suspension.until
    ? `To‘xtatilgan · ${formatDateTimeShort(suspension.until)} gacha`
    : "To‘xtatilgan · qo‘lda yoqilguncha";
}
