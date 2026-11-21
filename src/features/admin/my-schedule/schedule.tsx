"use client";

import type { Route } from "next";
import Link from "next/link";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import type {
  SpecialistAvailability,
  SpecialistBooking,
  SpecialistCalendar,
} from "@/data/specialist";
import { addDays, toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { Availability } from "./availability";
import { Booking } from "./booking";
import { Field, inputClass } from "./controls";
import { myScheduleCopy } from "./copy";

const href = (date: string, week: boolean): Route =>
  (SPECIALIST_HOME + "?date=" + encodeURIComponent(date) + (week ? "&view=week" : "")) as Route;

export function Schedule({
  data,
  date,
  today,
  week,
  now,
}: {
  data: SpecialistCalendar & {
    availability: SpecialistAvailability;
    conflicts: SpecialistBooking[];
  };
  date: string;
  today: string;
  week: boolean;
  now: number;
}) {
  const t = useCopy(myScheduleCopy);
  const fmt = useFormat();
  const step = week ? 7 : 1;
  const link = buttonStyles({ variant: "outline", size: "sm" });
  const conflicts = new Set(data.conflicts.map((item) => item.id));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-serif text-display">{t.title}</h1>
          <p className="m-0 mt-1 text-body-sm text-ink-muted">{t.tashkent}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonStyles({ variant: week ? "outline" : "primary", size: "sm" })}
            aria-current={week ? undefined : "page"}
            href={href(date, false)}
          >
            {t.day}
          </Link>
          <Link
            className={buttonStyles({ variant: week ? "primary" : "outline", size: "sm" })}
            aria-current={week ? "page" : undefined}
            href={href(date, true)}
          >
            {t.week}
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link className={link} href={href(addDays(date, -step), week)}>
            {t.previous}
          </Link>
          <Link className={link} href={href(today, week)}>
            {t.today}
          </Link>
          <Link className={link} href={href(addDays(date, step), week)}>
            {t.next}
          </Link>
        </div>
        <form action={SPECIALIST_HOME} className="flex flex-wrap items-end gap-2">
          {week && <input type="hidden" name="view" value="week" />}
          <Field label={t.date}>
            <input
              key={date}
              className={inputClass}
              type="date"
              name="date"
              defaultValue={date}
              required
            />
          </Field>
          <Button variant="outline" type="submit" size="sm">
            {t.go}
          </Button>
        </form>
      </div>
      {data.conflicts.length > 0 && (
        <Card className="grid gap-2 border-warning bg-warning-soft">
          <CardTitle>{t.conflicts}</CardTitle>
          <p className="m-0 text-body-sm">{t.conflictHint}</p>
          <ul className="m-0 grid list-none gap-1 p-0">
            {data.conflicts.map((item) => (
              <li key={item.id}>
                <Link
                  href={href(toLocalIsoDate(item.start), false)}
                  className="text-body-sm font-semibold underline"
                >
                  {fmt.dateTimeShort(item.start)} · {item.customer_name || item.service}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-3">
        {data.schedules.map((day) => {
          const items = data.appointments.filter((item) => toLocalIsoDate(item.start) === day.date);
          return (
            <Card key={day.date} className="grid gap-3">
              <div>
                <CardTitle>{fmt.dateLong(day.date + "T12:00:00+05:00")}</CardTitle>
                <p className="m-0 mt-1 text-body-sm text-ink-muted">
                  {day.working_hours
                    ? day.working_hours.start + "–" + day.working_hours.end
                    : t.dayOff}
                  {day.location && " · " + day.location.name}
                </p>
              </div>
              {day.blocks.length > 0 && (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-caption text-ink-muted">
                  {day.blocks.map((block, i) => (
                    <li key={i} className="rounded-md bg-surface px-2 py-1">
                      {block.start}–{block.end} ·{" "}
                      {block.label || (block.kind === "busy" ? t.busy : t.off)}
                    </li>
                  ))}
                </ul>
              )}
              {items.length ? (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {items.map((item) => (
                    <Booking
                      key={item.id}
                      item={item}
                      clinics={data.availability.clinics}
                      now={now}
                      conflict={conflicts.has(item.id)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-body-sm text-ink-muted">{t.empty}</p>
              )}
            </Card>
          );
        })}
      </div>
      <Availability data={data.availability} today={today} />
    </>
  );
}
