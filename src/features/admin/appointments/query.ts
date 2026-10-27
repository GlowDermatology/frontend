import type { Route } from "next";

import { toLocalIsoDate } from "@/lib/format";

import { firstParam, type SearchParams } from "../shared/url-state";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?date=2026-10-27`, validated; falls back to `today` (the default day from
 * `defaultAppointmentDay()`: today in api mode, the design day in mock mode).
 */
export function parseDay(params: SearchParams, today: string): string {
  const value = firstParam(params, "date");
  if (!value || !ISO_DATE.test(value)) return today;
  const date = new Date(`${value}T12:00:00+05:00`);
  return Number.isNaN(date.getTime()) || toLocalIsoDate(date) !== value ? today : value;
}

/** The default day keeps the bare URL, so it stays shareable and bookmarkable. */
export function dayHref(day: string, today: string): Route {
  return (day === today ? "/admin/appointments" : `/admin/appointments?date=${day}`) as Route;
}
