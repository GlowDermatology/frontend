import type { Tone } from "@/components/ui/badge";
import type { ShipmentStage } from "@/domain/shop-delivery";
import { formatDayMonthShortLocale, formatTime, tashkentParts } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Presentation of the delivery window and stage (checkout options and the
 * order page). The window is the server's (`eta_from`/`eta_to`, Tashkent
 * time); it is only formatted here, never computed. Pure; unit-tested.
 */

function valid(value: string | null): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function dayIndex(input: string | number): number {
  const p = tashkentParts(new Date(input));
  return Date.UTC(p.year, p.month, p.day) / 86_400_000;
}

/**
 * "26-okt, 14:30–16:00", "26 Oct, 18:00 – 27 Oct, 10:00"; with `relative`
 * the day of today and tomorrow (Tashkent) reads "Bugun"/"Ertaga".
 * `null` when the server sent no window.
 */
export function formatEtaWindow(
  from: string | null,
  to: string | null,
  locale: Locale,
  relative?: { nowMs: number; today: string; tomorrow: string },
): string | null {
  const start = valid(from) ?? valid(to);
  const end = valid(to) ?? valid(from);
  if (!start || !end) return null;
  const day = (input: string) => {
    if (relative) {
      const offset = dayIndex(input) - dayIndex(relative.nowMs);
      if (offset === 0) return relative.today;
      if (offset === 1) return relative.tomorrow;
    }
    return formatDayMonthShortLocale(input, locale);
  };
  if (dayIndex(start) === dayIndex(end)) {
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    return startTime === endTime
      ? `${day(start)}, ${startTime}`
      : `${day(start)}, ${startTime}–${endTime}`;
  }
  return `${day(start)}, ${formatTime(start)} – ${day(end)}, ${formatTime(end)}`;
}

/** Badge tone of a shipment stage. */
export function stageTone(stage: ShipmentStage | null): Tone {
  switch (stage) {
    case "delivered":
      return "success";
    case "returning":
    case "returned":
    case "failed":
      return "warning";
    case "cancelled":
      return "muted";
    default:
      return "gold";
  }
}
