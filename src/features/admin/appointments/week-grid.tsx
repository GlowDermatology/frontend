"use client";

import Link from "next/link";

import { ScrollRegion } from "@/components/ui/scroll-region";
import type { AppointmentDay, AppointmentRangeDay, DayAppointment } from "@/data/appointments";
import type { Workspace } from "@/data/auth/next-param";
import { minutesOfDay } from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { weekdayOf } from "@/lib/datetime";
import type { AdminFormatter } from "@/lib/format";
import { toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy } from "./copy";
import { customerName } from "./labels";
import {
  assignLanes,
  capLanes,
  heightOf,
  hourMarks,
  hoursSpan,
  laneBox,
  nowMinute,
  offsetOf,
  timeWindow,
  unavailableSpans,
  visitSpan,
  type Span,
} from "./layout";
import { dayHref, noonOf } from "./query";
import { STATUS_LOOK, StatusLegend } from "./status";

/** Height of one hour row, px (denser than the day board). */
export const WEEK_HOUR_PX = 60;
/** Columns a day draws before the rest of an overlap becomes «+N». */
export const WEEK_MAX_LANES = 3;

interface WeekGridProps {
  /** The seven days of `appointments/range/` (counts, working, hours), Monday first. */
  days: ReadonlyArray<AppointmentRangeDay>;
  /** The same days' schedules (`detail=full`): the specialists' hours and blocks. */
  schedules: ReadonlyArray<AppointmentDay>;
  /** The visits of the week (the board's local copy, so actions show at once). */
  appointments: ReadonlyArray<DayAppointment>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: string;
  today: string;
  /** The specialist filter, kept on the links to a day. */
  specialist: string;
  /** Whose board the day links open. */
  workspace: Workspace;
}

/** Weekday name of a day in the admin language (the formatter's arrays are Sunday-first). */
export function weekdayName(fmt: AdminFormatter, date: string, short = true): string {
  const sundayFirst = (weekdayOf(date) + 1) % 7;
  return (short ? fmt.weekdaysShort : fmt.weekdays)[sundayFirst] ?? "";
}

/**
 * The week board (DESIGN §B): a time axis and seven day columns. Hours nobody works are hatched
 * (with one specialist chosen, their breaks too), visits sit in greedy overlap lanes and a
 * cluster wider than three lanes ends in a «+N» link to that day. Each day header opens the day.
 */
export function WeekGrid({
  days,
  schedules,
  appointments,
  selectedId,
  onSelect,
  now,
  today,
  specialist,
  workspace,
}: WeekGridProps) {
  const copy = useCopy(appointmentsCopy);
  const t = copy.week;
  const fmt = useFormat();
  const names = new Map(
    schedules.flatMap((day) => day.specialists.map((s) => [s.id, s.name] as const)),
  );
  const byDay = new Map<string, DayAppointment[]>();
  for (const appointment of appointments) {
    const date = toLocalIsoDate(appointment.start);
    byDay.set(date, [...(byDay.get(date) ?? []), appointment]);
  }
  const frame = timeWindow([
    ...days.map((day) => hoursSpan(day.hours)),
    ...appointments.map(visitSpan),
  ]);
  const marks = hourMarks(frame);
  const height = marks.length * WEEK_HOUR_PX;
  const top = (minute: number) => offsetOf(minute, frame, WEEK_HOUR_PX);
  const columns = "56px repeat(7, minmax(100px, 1fr))";

  return (
    <section
      aria-label={t.label}
      className="min-w-0 flex-[3_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <StatusLegend className="border-b border-line px-5 py-3.5" />
      <ScrollRegion label={t.columns}>
        <div className="min-w-[760px]">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
            <span />
            {days.map((day) => {
              const isToday = day.date === today;
              const label = fmt.weekdayDayMonth(noonOf(day.date));
              return (
                <Link
                  key={day.date}
                  href={dayHref(day.date, today, specialist, workspace)}
                  aria-label={t.openDay(label)}
                  aria-current={isToday ? "date" : undefined}
                  className="group flex flex-col items-center gap-0.5 border-l border-line px-2 py-2.5 text-ink no-underline hover:bg-gold-soft/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink motion-safe:transition-colors"
                >
                  <span className="text-[11px] leading-[14px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                    {weekdayName(fmt, day.date)}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-body font-bold tabular-nums",
                      isToday ? "bg-gold text-on-gold" : "group-hover:bg-surface-raised",
                    )}
                  >
                    {Number(day.date.slice(8))}
                  </span>
                  <span className="text-[11px] leading-[14px] text-ink-muted tabular-nums">
                    {day.working ? copy.month.visits(day.total) : t.dayOff}
                  </span>
                </Link>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: columns,
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--gd-line) 0 1px, transparent 1px ${WEEK_HOUR_PX}px)`,
            }}
          >
            <div
              aria-hidden="true"
              className="relative text-[11px] leading-[14px] text-ink-muted tabular-nums"
            >
              {marks.map((hour, index) => (
                <span
                  key={hour}
                  className="absolute right-2"
                  style={{ top: index * WEEK_HOUR_PX + 4 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {days.map((day) => {
              const schedule = schedules.find((s) => s.date === day.date);
              const only = schedule?.specialists.length === 1 ? schedule.specialists[0] : undefined;
              const blocks: Span[] =
                only && only.working !== false
                  ? only.blocks.map((b) => ({
                      from: minutesOfDay(b.start),
                      to: minutesOfDay(b.end),
                    }))
                  : [];
              const hatch = unavailableSpans(
                day.working ? hoursSpan(day.hours) : null,
                frame,
                blocks,
              );
              const visits = byDay.get(day.date) ?? [];
              const { placed, overflow } = capLanes(
                assignLanes(visits.map((v) => ({ id: v.id, ...visitSpan(v) }))),
                WEEK_MAX_LANES,
              );
              const byId = new Map(visits.map((v) => [v.id, v]));
              const dayLabel = fmt.weekdayDayMonth(noonOf(day.date));
              const nowAt = nowMinute(now, day.date, frame);
              return (
                <ol
                  key={day.date}
                  aria-label={t.dayColumn(dayLabel)}
                  className={cn(
                    "relative m-0 list-none border-l border-line p-0",
                    day.date === today && "bg-gold-soft/25",
                  )}
                >
                  {hatch.map((span) => (
                    <li
                      key={`h-${span.from}`}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 hatch opacity-80"
                      style={{ top: top(span.from), height: top(span.to) - top(span.from) }}
                    />
                  ))}
                  {!day.working && (
                    <li className="absolute inset-x-1.5 top-2 rounded-sm bg-surface-raised/90 px-2 py-1 text-center text-caption font-semibold text-ink-muted">
                      {t.dayOff}
                    </li>
                  )}
                  {placed.map(({ item, lane, columns: laneCount }) => {
                    const visit = byId.get(item.id)!;
                    const look = STATUS_LOOK[visit.status];
                    const isSelected = visit.id === selectedId;
                    const start = fmt.time(visit.start);
                    const end = fmt.time(visit.end);
                    const name = customerName(copy, visit.customer.name);
                    const boxHeight = heightOf(item, WEEK_HOUR_PX, 26) - 2;
                    const roomy = laneCount === 1 && boxHeight >= 40;
                    // Two or more lanes leave 40–60px per chip: no dot, tighter padding, so «14:30» fits.
                    const dense = laneCount >= 2;
                    return (
                      <li key={visit.id}>
                        <button
                          type="button"
                          data-appointment-id={visit.id}
                          data-status={visit.status}
                          onClick={() => onSelect(visit.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "hover:shadow-md absolute flex flex-col overflow-hidden rounded-sm py-1 text-left text-ink hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink motion-safe:transition-shadow motion-safe:duration-150",
                            laneCount >= 3 ? "px-px" : dense ? "px-0.5" : "px-1.5",
                            look.box,
                            isSelected &&
                              "z-10 shadow-[0_0_0_2px_var(--gd-surface-raised),0_0_0_4px_var(--gd-gold-ink)]",
                          )}
                          style={{
                            top: top(item.from) + 1,
                            height: boxHeight,
                            ...laneBox(lane, laneCount),
                          }}
                        >
                          <span
                            className={cn(
                              "flex min-w-0 items-center gap-1",
                              dense && "justify-center",
                            )}
                          >
                            {!dense && (
                              <span
                                aria-hidden="true"
                                className={cn("size-1.5 shrink-0 rounded-full", look.dot)}
                              />
                            )}
                            <span
                              className={cn(
                                "truncate leading-[14px] font-bold tabular-nums",
                                laneCount >= 3
                                  ? "text-[9px] tracking-[-0.04em] text-clip"
                                  : dense
                                    ? "text-[10px] tracking-[-0.02em]"
                                    : "text-[11px]",
                              )}
                            >
                              {start}
                            </span>
                          </span>
                          {roomy && (
                            <span className="truncate text-[11px] leading-[14px] font-semibold">
                              {name}
                            </span>
                          )}
                          <span className="sr-only">
                            {roomy ? "" : `, ${name}`}, {copy.until(end)},{" "}
                            {names.get(visit.specialistId) ?? ""}, {copy.status[visit.status]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {overflow.map((chip) => (
                    <li key={`more-${chip.cluster}`}>
                      <Link
                        href={dayHref(day.date, today, specialist, workspace)}
                        aria-label={t.more(chip.ids.length, dayLabel)}
                        className="shadow-xs absolute flex items-start justify-center rounded-sm border border-line-strong bg-surface-raised pt-1 text-[11px] leading-[14px] font-bold text-ink no-underline hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
                        style={{
                          top: top(chip.from) + 1,
                          height: heightOf(chip, WEEK_HOUR_PX, 26) - 2,
                          ...laneBox(chip.column, chip.columns),
                        }}
                      >
                        +{chip.ids.length}
                      </Link>
                    </li>
                  ))}
                  {nowAt !== null && (
                    <li
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-danger"
                      style={{ top: top(nowAt) }}
                    >
                      <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-danger" />
                    </li>
                  )}
                </ol>
              );
            })}
          </div>
        </div>
      </ScrollRegion>
      {appointments.length === 0 && (
        <p className="m-0 border-t border-line px-5 py-3.5 text-body-sm text-ink-muted">
          {t.empty}
        </p>
      )}
    </section>
  );
}
