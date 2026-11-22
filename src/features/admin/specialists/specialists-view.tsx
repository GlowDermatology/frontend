"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { Page } from "@/data/types";
import {
  clinicText,
  type ClinicLocation,
  workingDaysShort,
  type ClinicSpecialist,
  type SpecialistListQuery,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import { specialistsCopy } from "./copy";
import { DirectoryPageSizeMenu, DirectoryToolbar } from "./directory-toolbar";
import { pageRangeText } from "./form-kit";
import { hasDirectoryFilters, specialistListHref } from "./query";

interface SpecialistsViewProps {
  page: Page<ClinicSpecialist>;
  query: SpecialistListQuery;
  clinics: ReadonlyArray<ClinicLocation>;
}

/**
 * Mutaxassislar (gap FND-1, contract §2.17): every specialist profile, drafts
 * included, with search, publication status («E’lon qilingan» / «Qoralama»),
 * category, ordering, pages and the `mutaxassislar` export. Profiles are not
 * created here: inviting a Specialist on «Xodimlar» creates the account and
 * its draft profile together.
 */
export function SpecialistsView({ page, query, clinics }: SpecialistsViewProps) {
  const copy = useCopy(specialistsCopy);
  const t = copy.list;
  const m = useCopy(clinicDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const rows = page.items;
  const filtered = hasDirectoryFilters(query);
  const activeClinics = clinics.filter((clinic) => clinic.isActive);
  const hasClinic = activeClinics.length > 0;

  return (
    <>
      <PageHeader
        eyebrow={(filtered ? t.found : t.count)(page.total, fmt.number(page.total))}
        title={t.title}
        actions={
          <>
            <ExportMenu
              href={specialistListHref(
                { ...query, page: undefined, pageSize: undefined },
                "/admin/specialists/export",
              )}
              label={copy.export}
            />
            <Link href="/admin/clinics" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="map-pin" size={18} />
              {copy.location.listTitle}
            </Link>
          </>
        }
      />
      {!hasClinic && (
        <p
          id="no-clinic-hint"
          className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink"
        >
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          {copy.location.none}
        </p>
      )}

      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <DirectoryToolbar query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label={t.tableLabel}>
              <table className="data-table min-w-[960px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">{t.caption}</caption>
                <thead className="uppercase">
                  <tr>
                    <th scope="col">{t.specialist}</th>
                    <th scope="col">{copy.location.listTitle}</th>
                    <th scope="col">{t.offers}</th>
                    <th scope="col">{t.days}</th>
                    <th scope="col" className="text-right!">
                      {t.upcoming}
                    </th>
                    <th scope="col">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const offers = row.services.filter((s) => s.isActive);
                    return (
                      <tr key={row.id}>
                        <td>
                          <span className="flex items-center gap-3">
                            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-ink-muted">
                              {row.photoUrl ? (
                                <Image
                                  src={row.photoUrl}
                                  alt=""
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <Icon name="user" size={18} />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <Link
                                href={`/admin/specialists/${row.id}` as Route}
                                title={row.name}
                                className="max-w-[260px] truncate font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                              >
                                {row.name || row.account?.displayName || t.specialist}
                              </Link>
                              <span className="text-[12px] text-ink-muted">
                                {row.role ? m.role[row.role] : t.noRole}
                                {row.experienceYears !== null
                                  ? ` · ${t.years(row.experienceYears, fmt.number(row.experienceYears))}`
                                  : ""}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td>
                          {clinics
                            .filter((clinic) => row.locationIds.includes(clinic.id))
                            .map((clinic) => clinicText(clinic.name, locale))
                            .join(", ") || copy.location.placeholder}
                        </td>
                        <td>
                          {offers.length > 0 ? (
                            <span className="line-clamp-2 max-w-[320px]">
                              {offers.map((s) => clinicText(s.shortName, locale)).join(", ")}
                            </span>
                          ) : (
                            <span className="text-ink-muted">{t.noServices}</span>
                          )}
                        </td>
                        <td className="tabular-nums">
                          {row.workingHours.length > 0 ? (
                            workingDaysShort(row.workingHours, locale)
                          ) : (
                            <span className="text-ink-muted">{t.noSchedule}</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">
                          {fmt.number(row.upcomingAppointments)}
                        </td>
                        <td>
                          {row.isActive ? (
                            <Badge tone="success">{t.published}</Badge>
                          ) : (
                            <Badge tone="muted">{t.draft}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollRegion>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="user" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
              <p className="m-0 max-w-[520px] text-body-sm text-ink-muted">
                {filtered ? copy.emptyFiltered : t.emptyAll}
              </p>
              {!filtered && (
                <Link href="/admin/staff" className={buttonStyles({ variant: "secondary" })}>
                  <Icon name="users" size={18} />
                  {t.openStaff}
                </Link>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRangeText(fmt, page.page, page.pageSize, page.total)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => specialistListHref({ ...query, page: p })}
            />
            <DirectoryPageSizeMenu query={query} />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
