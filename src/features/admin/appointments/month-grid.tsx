"use client";

import Link from "next/link";

import type { AppointmentRangeDay } from "@/data/appointments";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy, type AppointmentsCopy } from "./copy";
import { monthCells, statusPills, STATUS_ORDER, type MonthCell } from "./layout";
import { dayHref, noonOf } from "./query";
import { STATUS_LOOK, StatusLegend } from "./status";
import { weekdayName } from "./week-grid";

interface MonthGridProps {
  /** Any day of the month shown. */
  date: string;
  /** `appointments/range/` over the six-week page (`detail=counts`). */
  days: ReadonlyArray<AppointmentRangeDay>;
  today: string;
  /** The specialist filter, kept on the links to a day. */
  specialist: string;
}

/** The full spoken name of a month cell: the date, its visits by status, day off, today. */
export function monthCellLabel(t: AppointmentsCopy, fmt: AdminFormatter, cell: MonthCell): string {
  const parts = [fmt.weekdayDayMonth(noonOf(cell.iso))];
  const data = cell.data;
  if (data && data.total > 0) {
    const pills = statusPills(data.counts).map(({ status, count }) =>
      t.month.counts[status](count),
    );
    parts.push(`${t.month.visits(data.total)} (${pills.join(", ")})`);
  } else {
    parts.push(t.month.noVisits);
  }
  if (data && !data.working) parts.push(t.month.dayOff);
  if (cell.isToday) parts.push(t.month.today);
  return parts.join(", ");
}

/**
 * The month board (DESIGN §B): the six-week page, Monday first. Every cell is a link to that
 * day's board carrying a full spoken summary; it shows the day number (today ringed), one pill per
 * status with visits, and a hatch on days nobody works. Days of the neighbouring months are muted.
 */
export function MonthGrid({ date, days, today, specialist }: MonthGridProps) {
  const copy = useCopy(appointmentsCopy);
  const t = copy.month;
  const fmt = useFormat();
  const weeks = monthCells(date, days, today);
  const totals = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<
    (typeof STATUS_ORDER)[number],
    number
  >;
  for (const day of days) {
    if (day.date.slice(0, 7) !== date.slice(0, 7)) continue;
    for (const status of STATUS_ORDER) totals[status] += day.counts[status];
  }
  const monthTotal = STATUS_ORDER.reduce((sum, status) => sum + totals[status], 0);

  return (
    <section
      aria-label={t.label}
      className="min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-3.5">
        <StatusLegend />
        <p className="m-0 text-body-sm text-ink-muted tabular-nums">
          {t.visits(monthTotal)} · {t.hint}
        </p>
      </div>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            {weeks[0]!.map((cell) => (
              <th
                key={cell.weekday}
                scope="col"
                abbr={weekdayName(fmt, cell.iso, false)}
                className="border-b border-line px-1 py-2 text-[11px] leading-[14px] font-bold tracking-[0.08em] text-ink-muted uppercase"
              >
                {weekdayName(fmt, cell.iso)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]!.iso}>
              {week.map((cell) => (
                <td
                  key={cell.iso}
                  className="h-[92px] border-b border-l border-line p-0 align-top first:border-l-0 sm:h-[112px]"
                >
                  <MonthDay
                    cell={cell}
                    copy={copy}
                    fmt={fmt}
                    today={today}
                    specialist={specialist}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MonthDay({
  cell,
  copy,
  fmt,
  today,
  specialist,
}: {
  cell: MonthCell;
  copy: AppointmentsCopy;
  fmt: AdminFormatter;
  today: string;
  specialist: string;
}) {
  const data = cell.data;
  const off = data !== null && !data.working;
  const pills = data ? statusPills(data.counts) : [];
  return (
    <Link
      href={dayHref(cell.iso, today, specialist)}
      aria-label={monthCellLabel(copy, fmt, cell)}
      aria-current={cell.isToday ? "date" : undefined}
      data-date={cell.iso}
      className={cn(
        "group relative flex size-full flex-col gap-1.5 p-1.5 text-ink no-underline hover:bg-gold-soft/50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink motion-safe:transition-colors sm:p-2",
        !cell.inMonth && "bg-surface/60 text-ink-muted",
      )}
    >
      {off && <span aria-hidden="true" className="absolute inset-0 hatch opacity-60" />}
      <span className="relative flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-body-sm font-bold tabular-nums",
            cell.isToday &&
              "bg-gold text-on-gold ring-2 ring-gold ring-offset-2 ring-offset-surface-raised",
          )}
        >
          {cell.day}
        </span>
        {data && data.total > 0 && (
          <span className="hidden text-[11px] leading-[14px] font-semibold text-ink-muted tabular-nums sm:inline">
            {data.total}
          </span>
        )}
      </span>
      {pills.length > 0 && (
        <span className="relative flex flex-wrap gap-1">
          {pills.map(({ status, count }) => (
            <span
              key={status}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] leading-[14px] font-bold tabular-nums",
                STATUS_LOOK[status].pill,
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", STATUS_LOOK[status].dot)}
              />
              {count}
            </span>
          ))}
        </span>
      )}
      {off && (
        <span className="relative mt-auto hidden truncate text-[11px] leading-[14px] font-semibold text-ink-muted sm:block">
          {copy.week.dayOff}
        </span>
      )}
    </Link>
  );
}
