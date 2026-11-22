"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { DayAppointment } from "@/data/appointments";
import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  HoursOverride,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { staffProfileActions, staffScheduleActions } from "./card-actions";
import { ConflictsCard } from "./conflicts-card";
import { specialistsCopy } from "./copy";
import { HoursCard } from "./hours-card";
import { OffersCard } from "./offers-card";
import { ProfileCard } from "./profile-card";
import { OwnerCard, PublishChecklist } from "./publish-cards";
import { BlocksCard, OverridesCard } from "./schedule-cards";

interface SpecialistDetailViewProps {
  specialist: ClinicSpecialist;
  /** A manager: the owner card links to «Xodimlar» for account changes. */
  manageAccess?: boolean;
  services: ReadonlyArray<ClinicService>;
  clinics: ReadonlyArray<ClinicLocation>;
  overrides: ReadonlyArray<HoursOverride>;
  blocks: ReadonlyArray<BlockedPeriod>;
  conflicts: ReadonlyArray<DayAppointment>;
  /** Today in Tashkent (`YYYY-MM-DD`), the earliest date an override or a block may take. */
  today: string;
}

/**
 * One specialist (gap FND-1, contract §2.17): the profile and photo, the
 * publish checklist, the owner account (read-only), the
 * offered services with their prices and durations, the weekly hours, the
 * date overrides and blocked periods, and the booked appointments the
 * schedule no longer covers. Booked appointments never change when any of
 * this does; only new bookings follow it.
 */
export function SpecialistDetailView(props: SpecialistDetailViewProps) {
  const copy = useCopy(specialistsCopy);
  const t = copy.detail;
  const m = useCopy(clinicDataCopy);
  const fmt = useFormat();
  const [source, setSource] = useState(props.specialist);
  const [specialist, setSpecialist] = useState(props.specialist);
  if (props.specialist !== source) {
    setSource(props.specialist);
    setSpecialist(props.specialist);
  }
  const profileActions = useMemo(() => staffProfileActions(specialist.id), [specialist.id]);
  const scheduleActions = useMemo(() => staffScheduleActions(specialist.id), [specialist.id]);
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
              specialist.role ? m.role[specialist.role] : copy.list.noRole,
              fmt.number(bookable),
              fmt.number(specialist.upcomingAppointments),
            )}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-serif text-display leading-10 tracking-normal break-words text-ink">
              {specialist.name}
            </h1>
            {specialist.isActive ? (
              <Badge tone="success">{copy.list.published}</Badge>
            ) : (
              <Badge tone="muted">{copy.list.draft}</Badge>
            )}
          </div>
        </div>
      </div>

      {props.conflicts.length > 0 && <ConflictsCard conflicts={props.conflicts} />}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <ProfileCard
            specialist={specialist}
            clinics={props.clinics}
            onUpdated={setSpecialist}
            actions={profileActions}
            clinicAccess="edit"
          />
          <OffersCard specialist={specialist} services={props.services} onUpdated={setSpecialist} />
        </div>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <PublishChecklist specialist={specialist} />
          <OwnerCard owner={specialist.account} manageAccess={props.manageAccess ?? false} />
          <HoursCard
            specialist={specialist}
            clinics={assigned}
            onUpdated={setSpecialist}
            actions={scheduleActions}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <OverridesCard
            actions={scheduleActions}
            clinics={assigned}
            defaultClinicId={specialist.locationId ?? ""}
            overrides={props.overrides}
            today={props.today}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <BlocksCard actions={scheduleActions} blocks={props.blocks} today={props.today} />
        </div>
      </div>
    </>
  );
}
