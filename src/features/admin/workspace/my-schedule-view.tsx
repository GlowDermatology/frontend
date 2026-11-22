"use client";

import type { Route } from "next";
import { useState } from "react";

import type { DayAppointment } from "@/data/appointments";
import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicSpecialist,
  HoursOverride,
} from "@/domain/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { dayHref } from "../appointments/query";
import { PageHeader } from "../shared/page-header";
import { shellCopy } from "../shell/copy";
import { OWN_SCHEDULE_ACTIONS } from "../specialists/card-actions";
import { ConflictsCard } from "../specialists/conflicts-card";
import { HoursCard } from "../specialists/hours-card";
import { BlocksCard, OverridesCard } from "../specialists/schedule-cards";
import { workspaceCopy } from "./copy";

/** The visit's day on the specialist's own board. */
const ownBoardDay = (date: string): Route => dayHref(date, "", "", "specialist");

/**
 * The specialist's schedule in the staff detail page's layout: the conflicts first, then the
 * weekly hours beside the date overrides and blocked periods. Hours are entered at the clinics
 * staff assigned (active ones only); every write goes to `specialist/…`.
 */
export function MyScheduleView(props: {
  specialist: ClinicSpecialist;
  clinics: ReadonlyArray<ClinicLocation>;
  overrides: ReadonlyArray<HoursOverride>;
  blocks: ReadonlyArray<BlockedPeriod>;
  conflicts: ReadonlyArray<DayAppointment>;
  /** Today in Tashkent (`YYYY-MM-DD`), the earliest date an override or a block may take. */
  today: string;
}) {
  const shell = useCopy(shellCopy);
  const t = useCopy(workspaceCopy).schedule;
  const [source, setSource] = useState(props.specialist);
  const [specialist, setSpecialist] = useState(props.specialist);
  if (props.specialist !== source) {
    setSource(props.specialist);
    setSpecialist(props.specialist);
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={shell.specialistNav["my-schedule"]} />
      {props.conflicts.length > 0 && (
        <ConflictsCard conflicts={props.conflicts} dayHref={ownBoardDay} />
      )}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <HoursCard
            specialist={specialist}
            clinics={props.clinics}
            onUpdated={setSpecialist}
            actions={OWN_SCHEDULE_ACTIONS}
            noClinicHint={t.noClinic}
          />
        </div>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <OverridesCard
            actions={OWN_SCHEDULE_ACTIONS}
            clinics={props.clinics}
            defaultClinicId={specialist.locationId ?? ""}
            overrides={props.overrides}
            today={props.today}
          />
          <BlocksCard actions={OWN_SCHEDULE_ACTIONS} blocks={props.blocks} today={props.today} />
        </div>
      </div>
    </>
  );
}
