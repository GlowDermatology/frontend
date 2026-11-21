"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { DayAppointment } from "@/data/appointments";
import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  HoursOverride,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy } from "../appointments/copy";
import { customerName } from "../appointments/labels";
import { specialistsCopy } from "./copy";

import { SpecialistAccessCard } from "./access-card";
import { HoursCard } from "./hours-card";
import { OffersCard } from "./offers-card";
import { ProfileCard } from "./profile-card";
import type { StaffOption } from "./profile-fields";
import { BlocksCard, OverridesCard } from "./schedule-cards";

interface SpecialistDetailViewProps {
  specialist: ClinicSpecialist;
  manageAccess?: boolean;
  emailInvite?: boolean;
  services: ReadonlyArray<ClinicService>;
  clinics: ReadonlyArray<ClinicLocation>;
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
  const t = useCopy(specialistsCopy).detail;
  const m = useCopy(clinicDataCopy);
  const fmt = useFormat();
  const [source, setSource] = useState(props.specialist);
  const [specialist, setSpecialist] = useState(props.specialist);
  if (props.specialist !== source) {
    setSource(props.specialist);
    setSpecialist(props.specialist);
  }
  const bookable = specialist.services.filter((s) => s.isActive && s.serviceIsActive).length;
  const assigned = props.clinics.filter((clinic) => specialist.locationIds.includes(clinic.id));

  return (
    <>
      <Breadcrumbs
        items={[{ label: t.crumbs, href: "/admin/specialists" }, { label: specialist.name }]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-muted">
            {t.summary(
              m.role[specialist.role],
              fmt.number(bookable),
              fmt.number(specialist.upcomingAppointments),
            )}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-serif text-display leading-10 tracking-normal break-words text-ink">
              {specialist.name}
            </h1>
            {specialist.isActive ? (
              <Badge tone="success">{m.status.active}</Badge>
            ) : (
              <Badge tone="muted">{m.status.inactive}</Badge>
            )}
          </div>
        </div>
      </div>
      {!specialist.isActive && (bookable === 0 || specialist.workingHours.length === 0) && (
        <p className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink">
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          {t.notBookable}
        </p>
      )}

      {props.conflicts.length > 0 && <ConflictsCard conflicts={props.conflicts} />}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <ProfileCard
            specialist={specialist}
            staffOptions={props.staffOptions}
            clinics={props.clinics}
            onUpdated={setSpecialist}
          />
          {props.manageAccess && (
            <SpecialistAccessCard
              specialist={specialist}
              emailInvite={props.emailInvite ?? false}
            />
          )}
          <OffersCard specialist={specialist} services={props.services} onUpdated={setSpecialist} />
        </div>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <HoursCard specialist={specialist} clinics={assigned} onUpdated={setSpecialist} />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <OverridesCard
            specialistId={specialist.id}
            clinics={assigned}
            defaultClinicId={specialist.locationId}
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
              href={`/admin/appointments?date=${toLocalIsoDate(visit.start)}` as Route}
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
