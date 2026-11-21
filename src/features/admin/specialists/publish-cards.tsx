"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ClinicSpecialist, PublishBlocker, SpecialistOwner } from "@/domain/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { staffListHref } from "../staff/query";
import { specialistsCopy } from "./copy";

/**
 * The publish checklist (`publish_blockers`): what is missing before the profile can be published,
 * read-only. Staff publish from the profile card (its switch stays off while anything is listed);
 * the specialist's own page shows the same list without a way to publish.
 */
export function PublishChecklist({
  specialist,
  titleId = "publish-title",
  readyText,
}: {
  specialist: Pick<ClinicSpecialist, "isActive" | "publishBlockers">;
  titleId?: string;
  /** Replaces «switch on Publish» where the reader cannot publish (the specialist's own page). */
  readyText?: string;
}) {
  const t = useCopy(specialistsCopy).publish;
  const blockers = specialist.publishBlockers;
  return (
    <Card aria-labelledby={titleId} className="flex flex-col gap-3">
      <CardTitle id={titleId} className="text-heading">
        {t.title}
      </CardTitle>
      {blockers.length === 0 ? (
        <p className="m-0 flex items-start gap-2 text-body-sm text-ink">
          <Icon name="check" size={18} className="mt-px shrink-0 text-success" />
          {specialist.isActive ? t.published : (readyText ?? t.ready)}
        </p>
      ) : (
        <>
          <p className="m-0 text-body-sm text-ink-muted">{t.missing}</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-publish-blockers="">
            {blockers.map((blocker: PublishBlocker) => (
              <li
                key={blocker}
                data-blocker={blocker}
                className="flex items-start gap-2 rounded-md bg-surface px-3 py-2 text-body-sm text-ink"
              >
                <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0 text-warning" />
                {t.blockers[blocker]}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/**
 * The account that owns the profile, read-only: sign-in and role are managed on «Xodimlar»
 * (login activation is separate from publication).
 */
export function OwnerCard({
  owner,
  manageAccess,
}: {
  owner: SpecialistOwner | null;
  manageAccess: boolean;
}) {
  const t = useCopy(specialistsCopy).owner;
  return (
    <Card aria-labelledby="owner-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CardTitle id="owner-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{t.text}</p>
      </div>
      {owner ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
          <dt className="text-ink-muted">{t.name}</dt>
          <dd className="m-0 font-semibold break-words text-ink">{owner.displayName}</dd>
          <dt className="text-ink-muted">{t.email}</dt>
          <dd className="m-0 break-all text-ink">{owner.email}</dd>
          <dt className="text-ink-muted">{t.role}</dt>
          <dd className="m-0">
            <Badge tone={owner.role === "specialist" ? "gold" : "warning"} dot={false}>
              {t.roles[owner.role]}
            </Badge>
          </dd>
          <dt className="text-ink-muted">{t.login}</dt>
          <dd className="m-0">
            {owner.isActive ? (
              <Badge tone="success">{t.loginActive}</Badge>
            ) : (
              <Badge tone="muted">{t.loginInactive}</Badge>
            )}
          </dd>
        </dl>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">{t.none}</p>
      )}
      {manageAccess && (
        <Link
          className="self-start text-body-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
          href={
            owner
              ? staffListHref({ q: owner.email, status: owner.isActive ? "active" : "inactive" })
              : "/admin/staff"
          }
        >
          {t.manage}
        </Link>
      )}
    </Card>
  );
}
