"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { DayAppointment } from "@/data/appointments";
import {
  SPECIALIST_ROLE_LABEL,
  type BlockedPeriod,
  type ClinicService,
  type ClinicSpecialist,
  type HoursOverride,
} from "@/domain/clinic";
import { formatDateTimeShort, formatNumber, toLocalIsoDate } from "@/lib/format";

import { HoursCard } from "./hours-card";
import { OffersCard } from "./offers-card";
import { ProfileCard } from "./profile-card";
import type { StaffOption } from "./profile-fields";
import { BlocksCard, OverridesCard } from "./schedule-cards";

interface SpecialistDetailViewProps {
  specialist: ClinicSpecialist;
  services: ReadonlyArray<ClinicService>;
  overrides: ReadonlyArray<HoursOverride>;
  blocks: ReadonlyArray<BlockedPeriod>;
  conflicts: ReadonlyArray<DayAppointment>;
  staffOptions: ReadonlyArray<StaffOption>;
  /** Today in Tashkent (`YYYY-MM-DD`), the earliest date an override or a block may take. */
  today: string;
}

/**
 * One specialist (gap FND-1, contract §2.17): the profile and photo, the
 * offered services with their prices and durations, the weekly hours, the
 * date overrides and blocked periods, and the booked appointments the
 * schedule no longer covers. Booked appointments never change when any of
 * this does; only new bookings follow it.
 */
export function SpecialistDetailView(props: SpecialistDetailViewProps) {
  const [source, setSource] = useState(props.specialist);
  const [specialist, setSpecialist] = useState(props.specialist);
  if (props.specialist !== source) {
    setSource(props.specialist);
    setSpecialist(props.specialist);
  }
  const bookable = specialist.services.filter((s) => s.isActive && s.serviceIsActive).length;

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Mutaxassislar", href: "/admin/specialists" }, { label: specialist.name }]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-muted">
            {SPECIALIST_ROLE_LABEL[specialist.role]} · {formatNumber(bookable)} ta faol xizmat ·{" "}
            {formatNumber(specialist.upcomingAppointments)} ta kelgusi qabul
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
              {specialist.name}
            </h1>
            {specialist.isActive ? (
              <Badge tone="success">Faol</Badge>
            ) : (
              <Badge tone="muted">Nofaol</Badge>
            )}
          </div>
        </div>
      </div>
      {!specialist.isActive && (bookable === 0 || specialist.workingHours.length === 0) && (
        <p className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink">
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          Mutaxassisga yozilish uchun kamida bitta faol xizmat va haftalik ish vaqti kerak; so‘ng
          profilda «Faol»ni yoqing.
        </p>
      )}

      {props.conflicts.length > 0 && <ConflictsCard conflicts={props.conflicts} />}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <ProfileCard
            specialist={specialist}
            staffOptions={props.staffOptions}
            onUpdated={setSpecialist}
          />
          <OffersCard specialist={specialist} services={props.services} onUpdated={setSpecialist} />
        </div>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <HoursCard specialist={specialist} onUpdated={setSpecialist} />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <OverridesCard
            specialistId={specialist.id}
            overrides={props.overrides}
            today={props.today}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <BlocksCard specialistId={specialist.id} blocks={props.blocks} today={props.today} />
        </div>
      </div>
    </>
  );
}

/** Open appointments ahead that the schedule no longer covers (§2.17 `conflicts/`). */
function ConflictsCard({ conflicts }: { conflicts: ReadonlyArray<DayAppointment> }) {
  return (
    <Card aria-labelledby="conflicts-title" className="flex flex-col gap-3 border border-warning">
      <div className="flex flex-col gap-1">
        <CardTitle id="conflicts-title" className="flex items-center gap-2 text-heading">
          <Icon name="alert-triangle" size={20} className="text-warning" />
          Jadvalga to‘g‘ri kelmaydigan qabullar
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Bu qabullar o‘zgarmagan, lekin endi ish vaqtidan tashqarida. Ularni boshqa vaqtga yoki
          mutaxassisga ko‘chiring yoki bekor qiling.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {conflicts.map((visit) => (
          <li
            key={visit.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
          >
            <span className="flex flex-col">
              <span className="font-semibold text-ink tabular-nums">
                {formatDateTimeShort(visit.start)} · {visit.serviceShort}
              </span>
              <span className="text-caption font-normal text-ink-muted">{visit.customer.name}</span>
            </span>
            <Link
              href={`/admin/appointments?date=${toLocalIsoDate(visit.start)}` as Route}
              className="text-[13px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
            >
              Qabullar jadvalida ochish
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
