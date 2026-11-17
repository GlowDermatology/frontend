import type { Route } from "next";

import {
  addDays,
  addMonths,
  endOfWeek,
  monthGrid,
  parseIsoDate,
  startOfWeek,
} from "@/lib/datetime";

import { firstParam, isoDateParam, oneOf, type SearchParams } from "../shared/url-state";

/**
 * The appointments board's URL state (DESIGN §B): `?view=day|week|month&date=YYYY-MM-DD&
 * specialist=<id>`. The default (day view of the default day, every specialist) keeps the bare
 * URL, so it stays shareable and bookmarkable; every other state is spelled out.
 */

export const BOARD_VIEWS = ["day", "week", "month"] as const;
export type BoardView = (typeof BOARD_VIEWS)[number];

export interface BoardState {
  view: BoardView;
  /** The anchor day: the day shown, a day of the week shown, a day of the month shown. */
  date: string;
  /** One specialist's id, or "" for everyone. */
  specialist: string;
}

const SPECIALIST_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * `?date=2026-10-27`, validated (a real calendar day in 2000–2099); falls back to `today` (the
 * default day from `defaultAppointmentDay()`: today in api mode, the design day in mock mode).
 */
export function parseDay(params: SearchParams, today: string): string {
  return isoDateParam(firstParam(params, "date")) ?? today;
}

export function parseBoard(params: SearchParams, today: string): BoardState {
  const specialist = firstParam(params, "specialist") ?? "";
  return {
    view: oneOf(firstParam(params, "view"), BOARD_VIEWS) ?? "day",
    date: parseDay(params, today),
    specialist: SPECIALIST_ID.test(specialist) ? specialist : "",
  };
}

/** The board URL of a state; `today` decides whether the date may be left out. */
export function boardHref(state: BoardState, today: string): Route {
  const params = new URLSearchParams();
  if (state.view !== "day") params.set("view", state.view);
  if (state.date !== today) params.set("date", state.date);
  if (state.specialist) params.set("specialist", state.specialist);
  const query = params.toString();
  return (query ? `/admin/appointments?${query}` : "/admin/appointments") as Route;
}

/** The day view of one day (the month cells' and the week headers' target). */
export function dayHref(day: string, today: string, specialist = ""): Route {
  return boardHref({ view: "day", date: day, specialist }, today);
}

/** The anchor one step back (`-1`) or forward (`1`): a day, a week or a month. */
export function shiftDate(view: BoardView, date: string, step: -1 | 1): string {
  if (view === "day") return addDays(date, step);
  if (view === "week") return addDays(date, step * 7);
  return addMonths(date, step);
}

/**
 * The days a view covers, as the range endpoint takes them: the day itself, the Monday–Sunday
 * week, or the whole six-week page of the month grid (42 days, the endpoint's counts limit), so
 * the leading and trailing days of the neighbouring months show their counts too.
 */
export function boardRange(view: BoardView, date: string): { from: string; to: string } {
  if (view === "day") return { from: date, to: date };
  if (view === "week") return { from: startOfWeek(date), to: endOfWeek(date) };
  const { year, month } = parseIsoDate(date)!;
  const weeks = monthGrid(year, month);
  return { from: weeks[0]![0]!.iso, to: weeks[5]![6]!.iso };
}

/** Whether the shown period contains `today` (the «Bugun» control then has nothing to do). */
export function showsToday(view: BoardView, date: string, today: string): boolean {
  if (view === "day") return date === today;
  if (view === "week") return startOfWeek(date) === startOfWeek(today);
  return date.slice(0, 7) === today.slice(0, 7);
}

/** A Tashkent noon instant of a day, the safe input of the date formatters. */
export function noonOf(date: string): string {
  return `${date}T12:00:00+05:00`;
}

/** Whether a string names a board view (the switch's value). */
export function isBoardView(value: string): value is BoardView {
  return (BOARD_VIEWS as ReadonlyArray<string>).includes(value);
}
