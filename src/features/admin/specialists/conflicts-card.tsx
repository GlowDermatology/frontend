"use client";

import type { Route } from "next";
import Link from "next/link";

import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { DayAppointment } from "@/data/appointments";
import { toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy } from "../appointments/copy";
import { customerName } from "../appointments/labels";
import { specialistsCopy } from "./copy";

/** The staff board's day view of a date (`YYYY-MM-DD`). */
export const adminBoardDay = (date: string): Route => `/admin/appointments?date=${date}` as Route;

/**
 * Open appointments ahead that the schedule no longer covers (§2.17 `conflicts/`). `dayHref` is
 * the board each row opens on the visit's day: the staff board by default, the specialist's own
 * board in their workspace.
 */
export function ConflictsCard({
  conflicts,
  dayHref = adminBoardDay,
}: {
  conflicts: ReadonlyArray<DayAppointment>;
  dayHref?: (date: string) => Route;
}) {
  const t = useCopy(specialistsCopy).detail;
  const visits = useCopy(appointmentsCopy);
  const fmt = useFormat();
  return (
    <Card aria-labelledby="conflicts-title" className="flex flex-col gap-3 border border-warning">
      <div className="flex flex-col gap-1">
        <CardTitle id="conflicts-title" className="flex items-center gap-2 text-heading">
          <Icon name="alert-triangle" size={20} className="text-warning" />
          {t.conflictsTitle}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{t.conflictsText}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {conflicts.map((visit) => (
          <li
            key={visit.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
          >
            <span className="flex flex-col">
              <span className="font-semibold text-ink tabular-nums">
                {fmt.dateTimeShort(visit.start)} · {visit.serviceShort}
              </span>
              <span className="text-caption font-normal text-ink-muted">
                {customerName(visits, visit.customer.name)}
              </span>
            </span>
            <Link
              href={dayHref(toLocalIsoDate(visit.start))}
              className="text-[13px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
            >
              {t.openBoard}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
