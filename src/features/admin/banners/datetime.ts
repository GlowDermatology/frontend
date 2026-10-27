import { tashkentParts } from "@/lib/format";

/**
 * `datetime-local` inputs ↔ the API's aware ISO datetimes. The business runs
 * in Tashkent (UTC+5, no DST), so the inputs are read and written in that
 * zone whatever the browser's locale.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO with offset → "YYYY-MM-DDTHH:MM" (Tashkent); `null`/invalid → "". */
export function toLocalInput(iso: string | null): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  const p = tashkentParts(iso);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`;
}

/** "YYYY-MM-DDTHH:MM[:SS]" → "YYYY-MM-DDTHH:MM:SS+05:00"; "" → `null`; garbage → `null`. */
export function fromLocalInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4] ?? "00"}+05:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
