/**
 * Clinic facts the API does not carry yet, for the MedicalClinic JSON-LD
 * (U14), from optional env vars (both documented in README / .env.example):
 *
 * - `GLOWDERMA_SHOP_OPENING_HOURS` — `Mo-Fr 09:00-20:00; Sa 10:00-18:00`
 *   (days `Mo Tu We Th Fr Sa Su`, a range or a comma list; 24-hour times).
 * - `GLOWDERMA_SHOP_GEO` — `41.3111,69.2797` (latitude,longitude); used when
 *   no specialist location carries coordinates.
 *
 * A malformed value is ignored (nothing is better than wrong structured
 * data). Pure parsers; unit-tested.
 */

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const DAY_NAMES: Record<(typeof DAYS)[number], string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

export type OpeningHours = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
};

function dayIndex(value: string): number {
  return DAYS.indexOf(value as (typeof DAYS)[number]);
}

function parseDays(spec: string): string[] | null {
  const days: string[] = [];
  for (const part of spec.split(",")) {
    const [from, to] = part.trim().split("-");
    const start = dayIndex(from ?? "");
    const end = to === undefined ? start : dayIndex(to);
    if (start < 0 || end < start) return null;
    for (let index = start; index <= end; index += 1) days.push(DAY_NAMES[DAYS[index]!]);
  }
  return days.length ? days : null;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseOpeningHours(value: string | undefined): OpeningHours[] {
  if (!value?.trim()) return [];
  const result: OpeningHours[] = [];
  for (const group of value.split(";")) {
    const match = /^\s*(\S+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s*$/.exec(group);
    if (!match) return [];
    const [, daySpec, opens, closes] = match;
    const days = parseDays(daySpec!);
    if (!days || !TIME.test(opens!) || !TIME.test(closes!) || closes! <= opens!) return [];
    result.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: opens!,
      closes: closes!,
    });
  }
  return result;
}

export function parseGeo(
  value: string | undefined,
): { latitude: number; longitude: number } | null {
  const match = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value ?? "");
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function clinicFacts(env: Record<string, string | undefined> = process.env) {
  return {
    openingHours: parseOpeningHours(env.GLOWDERMA_SHOP_OPENING_HOURS),
    geo: parseGeo(env.GLOWDERMA_SHOP_GEO),
  };
}
