"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { createSpecialist } from "@/data/clinic.actions";
import { clinicSchemas, EMPTY_SPECIALIST } from "@/data/clinic.schema";
import type { Page } from "@/data/types";
import {
  clinicText,
  specialistRecommendedMissing,
  type ClinicLocation,
  workingDaysShort,
  type ClinicSpecialist,
  type SpecialistListQuery,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import { specialistsCopy } from "./copy";
import { DirectoryPageSizeMenu, DirectoryToolbar } from "./directory-toolbar";
import { errorItems, issuesToErrors, pageRangeText } from "./form-kit";
import {
  experienceValue,
  firstTextErrorLanguage,
  PROFILE_FIELDS,
  PROFILE_ORDER,
  profileFieldLabel,
  SpecialistProfileFields,
  specialistRecommendedFields,
  type StaffOption,
} from "./profile-fields";
import { hasDirectoryFilters, specialistListHref } from "./query";

interface SpecialistsViewProps {
  page: Page<ClinicSpecialist>;
  query: SpecialistListQuery;
  staffOptions: ReadonlyArray<StaffOption>;
  clinics: ReadonlyArray<ClinicLocation>;
}

/**
 * Mutaxassislar (gap FND-1, contract §2.17): the list with search, status,
 * category, ordering, pages and the `mutaxassislar` export; «Yangi
 * mutaxassis» creates one (inactive, decision PS-6) and opens its page to
 * add the services and the hours.
 */
export function SpecialistsView({ page, query, staffOptions, clinics }: SpecialistsViewProps) {
  const copy = useCopy(specialistsCopy);
  const t = copy.list;
  const m = useCopy(clinicDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useToast();
  const router = useRouter();
  const [source, setSource] = useState(page);
  const [rows, setRows] = useState(page.items);
  if (page !== source) {
    setSource(page);
    setRows(page.items);
  }
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();
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
            <Link href="/admin/services" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="sparkle" size={18} />
              {t.services}
            </Link>
            <Link href="/admin/clinics" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="map-pin" size={18} />
              {copy.location.listTitle}
            </Link>
            <Button
              disabledReason={!hasClinic && copy.location.none}
              onClick={() => {
                setInstance((n) => n + 1);
                setOpen(true);
              }}
            >
              <Icon name="plus" size={18} />
              {t.create}
            </Button>
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
          <DirectoryToolbar kind="specialists" query={query} />
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
                    const offers = row.services.filter((s) => s.isActive && s.serviceIsActive);
                    const draft = row.id.startsWith("draft-");
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
                              {draft ? (
                                <span className="max-w-[260px] truncate font-bold text-ink">
                                  {row.name}
                                </span>
                              ) : (
                                <Link
                                  href={`/admin/specialists/${row.id}` as Route}
                                  title={row.name}
                                  className="max-w-[260px] truncate font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                                >
                                  {row.name}
                                </Link>
                              )}
                              <span className="text-[12px] text-ink-muted">
                                {m.role[row.role]}
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
                              {offers.map((s) => s.shortName).join(", ")}
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
                            <Badge tone="success">{m.status.active}</Badge>
                          ) : (
                            <Badge tone="muted">{m.status.inactive}</Badge>
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
              <p className="m-0 text-body-sm text-ink-muted">
                {filtered ? copy.emptyFiltered : t.emptyAll}
              </p>
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
            <DirectoryPageSizeMenu kind="specialists" query={query} />
          </div>
        </section>
      </ListTransition>

      <CreateSpecialistDialog
        key={instance}
        open={open}
        onOpenChange={setOpen}
        idempotency={idempotency}
        staffOptions={staffOptions}
        clinics={activeClinics}
        onCreated={(specialist) => {
          toast({ tone: "success", title: t.created, description: t.createdText });
          if (specialist.id.startsWith("draft-")) {
            // The demo keeps nothing: the new row stays on this list only.
            setRows((current) => [...current, specialist]);
          } else {
            router.push(`/admin/specialists/${specialist.id}` as Route);
          }
        }}
      />
    </>
  );
}

function CreateSpecialistDialog({
  open,
  onOpenChange,
  idempotency,
  staffOptions,
  clinics,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idempotency: ReturnType<typeof useIdempotencyKey>;
  staffOptions: ReadonlyArray<StaffOption>;
  clinics: ReadonlyArray<ClinicLocation>;
  onCreated: (specialist: ClinicSpecialist) => void;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.create;
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [values, setValues] = useState(() => {
    const locationId = clinics.length === 1 ? clinics[0]!.id : "";
    return { ...EMPTY_SPECIALIST, locationId, locationIds: locationId ? [locationId] : [] };
  });
  const [experience, setExperience] = useState("");
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const recommended = useRecommendedConfirm();
  const summary = errorItems(errors, (name) => profileFieldLabel(name, copy), PROFILE_ORDER);

  /** Shows `next`, switching the text tab to the first language with an error, then reveals. */
  const showErrors = (next: Record<string, string>, message: string | null) => {
    const failing = firstTextErrorLanguage(next);
    if (failing && !next[`qualifications.${language}`] && !next[`bio.${language}`]) {
      setLanguage(failing);
    }
    setErrors(next);
    setFormError(message);
    reveal();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.specialist.safeParse({
      ...values,
      experienceYears: experienceValue(experience),
    });
    if (!local.success) {
      showErrors(issuesToErrors(local.error), null);
      return;
    }
    inFlight.current = true;
    const missing = specialistRecommendedFields(specialistRecommendedMissing(local.data), copy);
    if ((await recommended.confirm(missing)) === "fix") {
      inFlight.current = false;
      setLanguage("uz");
      await afterDialogsClose();
      reveal({ name: missing[0]!.name, shake: false });
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => createSpecialist(local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, PROFILE_FIELDS);
      showErrors(split.fieldErrors, split.formError);
      toast({
        tone: "danger",
        title: copy.list.createFailed,
        description: split.formError ?? result.error,
      });
      return;
    }
    onOpenChange(false);
    onCreated(result.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title={t.title}
      description={t.description}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => {
            const failing = firstTextErrorLanguage({ [name]: "x" });
            if (failing) setLanguage(failing);
            reveal({ name });
          }}
        />
        <SpecialistProfileFields
          values={values}
          onChange={setValues}
          experience={experience}
          onExperienceChange={setExperience}
          errors={errors}
          staffOptions={staffOptions}
          clinics={clinics}
          linkedStaff={null}
          activeHint={copy.profile.activeHint}
          savedSlug={null}
          language={language}
          onLanguageChange={setLanguage}
        />
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabledReason={busy && copy.busyReason}
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button type="submit" busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? t.submitting : t.submit}
          </Button>
        </div>
        {recommended.dialog}
      </form>
    </Dialog>
  );
}
