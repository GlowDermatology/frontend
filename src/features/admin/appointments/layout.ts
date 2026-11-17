import type { AppointmentRangeDay } from "@/data/appointments";
import type { AppointmentStatus } from "@/domain/appointment";
import { minutesOfDay, tashkentMinutes } from "@/domain/appointment";
import { monthGrid, parseIsoDate } from "@/lib/datetime";
import { toLocalIsoDate } from "@/lib/format";

/**
 * Pure geometry of the appointment grids (DESIGN §B): the time window drawn, minute → pixel
 * positions, the hatched hours nobody works, greedy overlap lanes with a «+N» overflow, the
 * now-line and the month page. Kept free of React so it is unit-tested (`layout.test.ts`).
 */

/** Order of the statuses in legends, pills and summaries (open first, closed last). */
export const STATUS_ORDER: ReadonlyArray<AppointmentStatus> = [
  "requested",
  "confirmed",
  "attended",
  "rejected",
  "cancelled",
];

/** Cancelled and rejected visits are drawn first, so a new booking in their slot sits on top. */
export const DRAW_ORDER: Readonly<Record<AppointmentStatus, number>> = {
  cancelled: 0,
  rejected: 0,
  requested: 1,
  confirmed: 1,
  attended: 1,
};

/* ------------------------------------------------------------------ time */

/** Minutes since midnight, `start` inclusive, `end` exclusive. */
export interface Span {
  from: number;
  to: number;
}

/** The hours a grid draws: whole hours, minutes since midnight. */
export interface TimeWindow {
  start: number;
  end: number;
}

/** The clinic's usual day, always inside the window so grids keep their shape. */
export const DEFAULT_WINDOW: TimeWindow = { start: 9 * 60, end: 18 * 60 };

/**
 * The window covering every given span (working hours, visits), widened to whole hours and
 * never narrower than 09:00–18:00.
 */
export function timeWindow(
  spans: ReadonlyArray<Span | null | undefined>,
  base: TimeWindow = DEFAULT_WINDOW,
): TimeWindow {
  let start = base.start;
  let end = base.end;
  for (const span of spans) {
    if (!span) continue;
    start = Math.min(start, span.from);
    end = Math.max(end, span.to);
  }
  return {
    start: Math.max(0, Math.floor(start / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
  };
}

/** `{start: "09:00", end: "18:00"}` → minutes. */
export function hoursSpan(hours: { start: string; end: string } | null | undefined): Span | null {
  return hours ? { from: minutesOfDay(hours.start), to: minutesOfDay(hours.end) } : null;
}

/** The hour marks of a window: `[9, 10, …, 17]` for 09:00–18:00. */
export function hourMarks(window: TimeWindow): number[] {
  const marks: number[] = [];
  for (let minute = window.start; minute < window.end; minute += 60) marks.push(minute / 60);
  return marks;
}

/** Pixel offset of a minute inside the window, `hourPx` pixels per hour. */
export function offsetOf(minute: number, window: TimeWindow, hourPx: number): number {
  return ((minute - window.start) * hourPx) / 60;
}

/** Pixel height of a span, never below `minPx` so a short visit stays clickable. */
export function heightOf(span: Span, hourPx: number, minPx: number): number {
  return Math.max(minPx, ((span.to - span.from) * hourPx) / 60);
}

/** A visit's start and end as Tashkent minutes (an end after midnight is clamped to 24:00). */
export function visitSpan(visit: { start: string; end: string }): Span {
  const from = tashkentMinutes(visit.start);
  const sameDay = toLocalIsoDate(visit.start) === toLocalIsoDate(visit.end);
  const to = sameDay ? tashkentMinutes(visit.end) : 24 * 60;
  return { from, to: Math.max(to, from + 1) };
}

/**
 * The parts of the window nobody works, to hatch: before and after the working hours (the whole
 * window when `hours` is null) plus the given blocks (breaks, held time), clipped to the window
 * and merged.
 */
export function unavailableSpans(
  hours: Span | null,
  window: TimeWindow,
  blocks: ReadonlyArray<Span> = [],
): Span[] {
  const raw: Span[] = hours
    ? [{ from: window.start, to: hours.from }, { from: hours.to, to: window.end }, ...blocks]
    : [{ from: window.start, to: window.end }];
  const clipped = raw
    .map((span) => ({
      from: Math.max(window.start, span.from),
      to: Math.min(window.end, span.to),
    }))
    .filter((span) => span.to > span.from)
    .sort((a, b) => a.from - b.from);
  const merged: Span[] = [];
  for (const span of clipped) {
    const last = merged[merged.length - 1];
    if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else merged.push({ ...span });
  }
  return merged;
}

/**
 * Minutes since midnight of `now` when it falls on `date` inside the window (the now-line),
 * else `null`.
 */
export function nowMinute(now: string, date: string, window: TimeWindow): number | null {
  if (toLocalIsoDate(now) !== date) return null;
  const minute = tashkentMinutes(now);
  return minute >= window.start && minute <= window.end ? minute : null;
}

/* ----------------------------------------------------------------- lanes */

export interface LaneItem extends Span {
  id: string;
}

export interface Laned<T extends LaneItem> {
  item: T;
  /** 0-based lane inside its cluster. */
  lane: number;
  /** Lanes its cluster needs (≥ 1). */
  lanes: number;
  /** Index of its cluster (items that overlap, directly or through others). */
  cluster: number;
}

/**
 * Greedy interval partitioning: items sorted by start (longer first on ties) go to the first
 * lane that is free at their start; a cluster closes when the next item starts after every
 * earlier one ended, and all its items share the cluster's lane count. Touching visits
 * (10:00–10:30, 10:30–11:00) do not overlap.
 */
export function assignLanes<T extends LaneItem>(items: ReadonlyArray<T>): Array<Laned<T>> {
  const sorted = [...items].sort(
    (a, b) => a.from - b.from || b.to - a.to || a.id.localeCompare(b.id),
  );
  const result: Array<Laned<T>> = [];
  let laneEnds: number[] = [];
  let clusterStart = 0;
  let clusterEnd = -Infinity;
  let cluster = -1;
  const close = () => {
    for (let index = clusterStart; index < result.length; index += 1) {
      result[index]!.lanes = laneEnds.length;
    }
  };
  for (const item of sorted) {
    if (item.from >= clusterEnd) {
      close();
      laneEnds = [];
      clusterStart = result.length;
      cluster += 1;
    }
    let lane = laneEnds.findIndex((end) => end <= item.from);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.to);
    } else {
      laneEnds[lane] = item.to;
    }
    clusterEnd = Math.max(clusterEnd, item.to);
    result.push({ item, lane, lanes: 0, cluster });
  }
  close();
  return result;
}

export interface PlacedItem<T extends LaneItem> extends Laned<T> {
  /** Columns drawn for its cluster (≤ `maxLanes`). */
  columns: number;
}

export interface LaneOverflow {
  cluster: number;
  /** Column the «+N» chip takes (the last one). */
  column: number;
  columns: number;
  /** Span of the hidden items. */
  from: number;
  to: number;
  ids: string[];
}

/**
 * Caps a cluster at `maxLanes` columns: a cluster that needs more keeps its first
 * `maxLanes - 1` lanes and turns everything in the later lanes into one «+N» chip in the last
 * column (N = hidden items), so the week grid never draws slivers.
 */
export function capLanes<T extends LaneItem>(
  laned: ReadonlyArray<Laned<T>>,
  maxLanes = 3,
): { placed: Array<PlacedItem<T>>; overflow: LaneOverflow[] } {
  const placed: Array<PlacedItem<T>> = [];
  const overflow = new Map<number, LaneOverflow>();
  for (const entry of laned) {
    if (entry.lanes <= maxLanes) {
      placed.push({ ...entry, columns: entry.lanes });
      continue;
    }
    if (entry.lane < maxLanes - 1) {
      placed.push({ ...entry, columns: maxLanes });
      continue;
    }
    const chip = overflow.get(entry.cluster);
    if (chip) {
      chip.from = Math.min(chip.from, entry.item.from);
      chip.to = Math.max(chip.to, entry.item.to);
      chip.ids.push(entry.item.id);
    } else {
      overflow.set(entry.cluster, {
        cluster: entry.cluster,
        column: maxLanes - 1,
        columns: maxLanes,
        from: entry.item.from,
        to: entry.item.to,
        ids: [entry.item.id],
      });
    }
  }
  return { placed, overflow: [...overflow.values()] };
}

/** CSS `left` / `width` of a lane column inside a day column, with a `gapPx` gutter. */
export function laneBox(
  column: number,
  columns: number,
  gapPx = 2,
): { left: string; width: string } {
  const share = 100 / Math.max(1, columns);
  return {
    left: `calc(${share * column}% + ${gapPx}px)`,
    width: `calc(${share}% - ${gapPx * 2}px)`,
  };
}

/* ----------------------------------------------------------------- month */

export interface MonthCell {
  iso: string;
  day: number;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  inMonth: boolean;
  isToday: boolean;
  /** The range endpoint's day, when it was in the fetched range. */
  data: AppointmentRangeDay | null;
}

/** The six-week page of the month of `anchor`, each cell joined with its range day. */
export function monthCells(
  anchor: string,
  days: ReadonlyArray<AppointmentRangeDay>,
  today: string,
): MonthCell[][] {
  const { year, month } = parseIsoDate(anchor)!;
  const byDate = new Map(days.map((day) => [day.date, day]));
  return monthGrid(year, month).map((week) =>
    week.map((cell) => ({
      iso: cell.iso,
      day: cell.day,
      weekday: cell.weekday,
      inMonth: cell.inMonth,
      isToday: cell.iso === today,
      data: byDate.get(cell.iso) ?? null,
    })),
  );
}

/** The statuses of a day with at least one visit, in `STATUS_ORDER`, with their counts. */
export function statusPills(
  counts: Readonly<Record<AppointmentStatus, number>>,
): Array<{ status: AppointmentStatus; count: number }> {
  return STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => ({
    status,
    count: counts[status],
  }));
}
