import type { Route } from "next";

import { DEFAULT_APPOINTMENT_DAY } from "@/data/appointments";
import { toLocalIsoDate } from "@/lib/format";

import { firstParam, type SearchParams } from "../shared/url-state";

/** `?date=2026-10-27`, validated; falls back to the default day. */
export function parseDay(params: SearchParams): string {
  const value = firstParam(params, "date");
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return DEFAULT_APPOINTMENT_DAY;
  const date = new Date(`${value}T12:00:00+05:00`);
  return Number.isNaN(date.getTime()) || toLocalIsoDate(date) !== value
    ? DEFAULT_APPOINTMENT_DAY
    : value;
}

export function dayHref(day: string): Route {
  return (
    day === DEFAULT_APPOINTMENT_DAY ? "/admin/appointments" : `/admin/appointments?date=${day}`
  ) as Route;
}
