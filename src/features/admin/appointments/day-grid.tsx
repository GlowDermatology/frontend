"use client";

import { Avatar } from "@/components/ui/avatar";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { DayAppointment } from "@/data/appointments";
import { minutesOfDay, type Specialist } from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy } from "./copy";
import { blockText, customerName, roleText } from "./labels";
import {
  DRAW_ORDER,
  heightOf,
  hourMarks,
  hoursSpan,
  nowMinute,
  offsetOf,
  timeWindow,
  visitSpan,
} from "./layout";
import { STATUS_LOOK, StatusLegend } from "./status";

/** Height of one hour row, px. */
export const DAY_HOUR_PX = 88;

interface DayGridProps {
  date: string;
  specialists: ReadonlyArray<Specialist>;
  appointments: ReadonlyArray<DayAppointment>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Server "now" (ISO), for the now-line. */
  now: string;
}

const selectedRing = "shadow-[0_0_0_2px_var(--gd-surface-raised),0_0_0_4px_var(--gd-gold-ink)]";

/**
 * The day board: one column per specialist on a shared time axis, the specialist's blocks
 * (breaks, held time, the whole day when they do not work) hatched, visits coloured by status.
 * A visit is a toggle button (`aria-pressed`) that selects it for the visit panel.
 */
export function DayGrid({
  date,
  specialists,
  appointments,
  selectedId,
  onSelect,
  now,
}: DayGridProps) {
  const copy = useCopy(appointmentsCopy);
  const t = copy.day;
  const fmt = useFormat();
  const frame = timeWindow([
    ...specialists.map((s) => hoursSpan(s.workingHours)),
    ...appointments.map(visitSpan),
  ]);
  const marks = hourMarks(frame);
  const height = marks.length * DAY_HOUR_PX;
  const top = (minute: number) => offsetOf(minute, frame, DAY_HOUR_PX) + 2;
  const box = (from: number, to: number) => heightOf({ from, to }, DAY_HOUR_PX, 44) - 4;
  const nowAt = nowMinute(now, date, frame);
  const columns = `64px repeat(${Math.max(1, specialists.length)}, minmax(200px, 1fr))`;

  return (
    <section
      aria-label={t.label}
      className="min-w-0 flex-[3_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <StatusLegend className="border-b border-line px-5 py-3.5" />

      {specialists.length === 0 ? (
        <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">{t.noSpecialists}</p>
      ) : (
        <ScrollRegion label={t.columns}>
          <div className="min-w-fit">
            <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
              <span />
              {specialists.map((specialist) => (
                <span
                  key={specialist.id}
                  className="flex items-center gap-2.5 border-l border-line p-3"
                >
                  <Avatar name={specialist.name} size={32} className="text-[12px]" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-bold text-ink">
                      {specialist.name}
                    </span>
                    <span className="text-caption font-normal text-ink-muted">
                      {roleText(copy, specialist.role)}
                      {specialist.isActive === false && (
                        <span className="ml-1.5 rounded-sm border border-line-strong px-1 text-[10px] font-bold tracking-[0.06em] text-ink uppercase">
                          {copy.inactive}
                        </span>
                      )}
                    </span>
                    {specialist.location && (
                      <span
                        className="truncate text-caption text-ink-muted"
                        title={specialist.location.address}
                      >
                        {specialist.location.name}
                      </span>
                    )}
                  </span>
                </span>
              ))}
            </div>

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: columns,
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--gd-line) 0 1px, transparent 1px ${DAY_HOUR_PX}px)`,
              }}
            >
              <div
                aria-hidden="true"
                className="relative text-[11px] leading-[14px] text-ink-muted tabular-nums"
              >
                {marks.map((hour, index) => (
                  <span
                    key={hour}
                    className="absolute right-2.5"
                    style={{ top: index * DAY_HOUR_PX + 4 }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </span>
                ))}
              </div>

              {specialists.map((specialist) => (
                <ol
                  key={specialist.id}
                  aria-label={t.specialistColumn(specialist.name)}
                  className="relative m-0 list-none border-l border-line p-0"
                >
                  {specialist.blocks.map((block) => {
                    const from = minutesOfDay(block.start);
                    const to = minutesOfDay(block.end);
                    const tall = to - from >= 45;
                    return (
                      <li
                        key={`${block.start}-${block.end}`}
                        className={cn(
                          "absolute right-1.5 left-1.5 flex rounded-sm border border-line hatch px-2.5 text-caption font-semibold text-ink-muted",
                          tall ? "items-start py-2" : "items-center py-1",
                        )}
                        style={{ top: top(from), height: box(from, to) }}
                      >
                        {blockText(copy, block)}
                        <span className="sr-only">
                          , {block.start}–{block.end}
                        </span>
                      </li>
                    );
                  })}
                  {appointments
                    .filter((a) => a.specialistId === specialist.id)
                    .sort((a, b) => DRAW_ORDER[a.status] - DRAW_ORDER[b.status])
                    .map((appointment) => {
                      const span = visitSpan(appointment);
                      const tall = span.to - span.from >= 45;
                      const look = STATUS_LOOK[appointment.status];
                      const isSelected = appointment.id === selectedId;
                      const name = customerName(copy, appointment.customer.name);
                      const start = fmt.time(appointment.start);
                      const end = fmt.time(appointment.end);
                      return (
                        <li key={appointment.id}>
                          <button
                            type="button"
                            data-appointment-id={appointment.id}
                            data-status={appointment.status}
                            onClick={() => onSelect(appointment.id)}
                            aria-pressed={isSelected}
                            className={cn(
                              "hover:shadow-md absolute right-1.5 left-1.5 flex gap-2 rounded-sm px-2.5 text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink motion-safe:transition-shadow motion-safe:duration-150",
                              tall ? "items-start py-2" : "items-center py-1",
                              look.box,
                              isSelected && selectedRing,
                            )}
                            style={{ top: top(span.from), height: box(span.from, span.to) }}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                look.dot,
                                tall && "mt-1",
                              )}
                            />
                            <span className="flex min-w-0 flex-col">
                              {tall ? (
                                <>
                                  <span className="text-caption font-bold tabular-nums">
                                    {start}–{end}
                                  </span>
                                  <span className="truncate text-caption font-bold">{name}</span>
                                </>
                              ) : (
                                <span className="truncate text-caption font-bold tabular-nums">
                                  {start} · {name}
                                </span>
                              )}
                              <span className="truncate text-[11px] leading-[14px] text-ink-muted">
                                {appointment.serviceShort}
                              </span>
                              {/* The visible text is the button's name (WCAG 2.5.3); the end of a
                                  short visit and the status are added for screen readers. */}
                              <span className="sr-only">
                                {tall ? "" : `, ${copy.until(end)}`},{" "}
                                {copy.status[appointment.status]}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ol>
              ))}

              {nowAt !== null && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-16 z-10 h-0.5 bg-danger"
                  style={{ top: offsetOf(nowAt, frame, DAY_HOUR_PX) }}
                >
                  <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-danger" />
                </span>
              )}
            </div>
          </div>
        </ScrollRegion>
      )}
      {specialists.length > 0 && appointments.length === 0 && (
        <p className="m-0 border-t border-line px-5 py-3.5 text-body-sm text-ink-muted">
          {t.empty}
        </p>
      )}
    </section>
  );
}
