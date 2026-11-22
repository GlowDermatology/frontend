"use client";

import type { Route } from "next";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { ClinicLocation, ClinicSpecialist, PublishBlocker } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { specialistsCopy } from "../specialists/copy";
import { OWN_PROFILE_ACTIONS } from "../specialists/card-actions";
import { ProfileCard } from "../specialists/profile-card";
import { PublishChecklist } from "../specialists/publish-cards";
import { workspaceCopy } from "./copy";

/** Where the specialist fixes each publish blocker (the profile ones are on this page). */
const BLOCKER_HREF: Partial<Record<PublishBlocker, Route>> = {
  service: "/admin/my-services",
  availability: "/admin/my-schedule",
};

/**
 * The specialist's own profile in the staff detail page's layout: the profile card (photo, texts,
 * discipline, slug, slot step, the publish switch with its «unpublish anyway» dialog; clinics
 * listed read-only) beside the publish checklist, whose entries link to the page that fixes them.
 */
export function MyProfileView(props: {
  specialist: ClinicSpecialist;
  clinics: ReadonlyArray<ClinicLocation>;
}) {
  const t = useCopy(workspaceCopy).profile;
  const copy = useCopy(specialistsCopy);
  const m = useCopy(clinicDataCopy);
  const [source, setSource] = useState(props.specialist);
  const [specialist, setSpecialist] = useState(props.specialist);
  if (props.specialist !== source) {
    setSource(props.specialist);
    setSpecialist(props.specialist);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-body-sm text-ink-muted">
          {specialist.role ? `${t.eyebrow} · ${m.role[specialist.role]}` : t.eyebrow}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal break-words text-ink">
            {specialist.name || specialist.account?.displayName || copy.list.specialist}
          </h1>
          {specialist.isActive ? (
            <Badge tone="success">{t.published}</Badge>
          ) : (
            <Badge tone="muted">{t.draft}</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <ProfileCard
            specialist={specialist}
            clinics={props.clinics}
            onUpdated={setSpecialist}
            actions={OWN_PROFILE_ACTIONS}
            clinicAccess="read"
          />
        </div>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-4">
          <PublishChecklist
            specialist={specialist}
            blockerHref={BLOCKER_HREF}
            blockerText={{ clinic: t.clinicBlocker }}
          />
        </div>
      </div>
    </>
  );
}
