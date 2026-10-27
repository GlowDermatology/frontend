"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { createSpecialist } from "@/data/clinic.actions";
import { EMPTY_SPECIALIST, specialistFormSchema } from "@/data/clinic.schema";
import type { Page } from "@/data/types";
import {
  SPECIALIST_ROLE_LABEL,
  workingDaysShort,
  type ClinicSpecialist,
  type SpecialistListQuery,
} from "@/domain/clinic";
import { formatNumber } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { DirectoryPageSizeMenu, DirectoryToolbar } from "./directory-toolbar";
import {
  experienceValue,
  PROFILE_FIELDS,
  SpecialistProfileFields,
  type StaffOption,
} from "./profile-fields";
import { hasDirectoryFilters, specialistListHref } from "./query";

interface SpecialistsViewProps {
  page: Page<ClinicSpecialist>;
  query: SpecialistListQuery;
  staffOptions: ReadonlyArray<StaffOption>;
  /** No clinic yet: a specialist cannot be created before it (§2.17 `location_id`). */
  hasClinic: boolean;
}

/**
 * Mutaxassislar (gap FND-1, contract §2.17): the list with search, status,
 * category, ordering, pages and the `mutaxassislar` export; «Yangi
 * mutaxassis» creates one (inactive, decision PS-6) and opens its page to
 * add the services and the hours.
 */
export function SpecialistsView({ page, query, staffOptions, hasClinic }: SpecialistsViewProps) {
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

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(page.total)} ta mutaxassis${filtered ? " topildi" : ""}`}
        title="Mutaxassislar"
        actions={
          <>
            <ExportMenu
              href={specialistListHref(
                { ...query, page: undefined, pageSize: undefined },
                "/admin/specialists/export",
              )}
            />
            <Link href="/admin/services" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="sparkle" size={18} />
              Xizmatlar
            </Link>
            <button
              type="button"
              disabled={!hasClinic}
              aria-describedby={hasClinic ? undefined : "no-clinic-hint"}
              onClick={() => {
                setInstance((n) => n + 1);
                setOpen(true);
              }}
              className={buttonStyles()}
            >
              <Icon name="plus" size={18} />
              Yangi mutaxassis
            </button>
          </>
        }
      />
      {!hasClinic && (
        <p
          id="no-clinic-hint"
          className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink"
        >
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          Avval pastdagi «Klinika» kartasida klinika nomi va manzilini saqlang: mutaxassis klinikaga
          bog‘lanadi.
        </p>
      )}

      <ListTransition className="group">
        <section
          aria-label="Mutaxassislar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <DirectoryToolbar kind="specialists" query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label="Mutaxassislar jadvali">
              <table className="data-table min-w-[960px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">Mutaxassislar</caption>
                <thead>
                  <tr>
                    <th scope="col">MUTAXASSIS</th>
                    <th scope="col">XIZMATLAR</th>
                    <th scope="col">ISH KUNLARI</th>
                    <th scope="col" className="text-right!">
                      KELGUSI QABULLAR
                    </th>
                    <th scope="col">HOLAT</th>
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
                            <span className="flex flex-col">
                              {draft ? (
                                <span className="font-bold text-ink">{row.name}</span>
                              ) : (
                                <Link
                                  href={`/admin/specialists/${row.id}` as Route}
                                  className="font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                                >
                                  {row.name}
                                </Link>
                              )}
                              <span className="text-[12px] text-ink-muted">
                                {SPECIALIST_ROLE_LABEL[row.role]}
                                {row.experienceYears !== null
                                  ? ` · ${row.experienceYears} yil`
                                  : ""}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td>
                          {offers.length > 0 ? (
                            <span className="line-clamp-2 max-w-[320px]">
                              {offers.map((s) => s.shortName).join(", ")}
                            </span>
                          ) : (
                            <span className="text-ink-muted">Xizmat yo‘q</span>
                          )}
                        </td>
                        <td className="tabular-nums">
                          {row.workingHours.length > 0 ? (
                            workingDaysShort(row.workingHours)
                          ) : (
                            <span className="text-ink-muted">Jadval yo‘q</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatNumber(row.upcomingAppointments)}
                        </td>
                        <td>
                          {row.isActive ? (
                            <Badge tone="success">Faol</Badge>
                          ) : (
                            <Badge tone="muted">Nofaol</Badge>
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
              <p className="m-0 text-subheading text-ink">Mutaxassis topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {filtered
                  ? "Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
                  : "«Yangi mutaxassis» bilan birinchi mutaxassisni qo‘shing."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
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
        onCreated={(specialist) => {
          toast({
            title: "Mutaxassis qo‘shildi",
            description: "Endi xizmatlar va ish vaqtini kiriting, so‘ng faollashtiring.",
          });
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
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idempotency: ReturnType<typeof useIdempotencyKey>;
  staffOptions: ReadonlyArray<StaffOption>;
  onCreated: (specialist: ClinicSpecialist) => void;
}) {
  const [values, setValues] = useState(EMPTY_SPECIALIST);
  const [experience, setExperience] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const focusInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = specialistFormSchema.safeParse({
      ...values,
      experienceYears: experienceValue(experience),
    });
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      focusInvalid();
      return;
    }
    inFlight.current = true;
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
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      focusInvalid();
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
      title="Yangi mutaxassis"
      description="Mutaxassis nofaol holda qo‘shiladi: xizmatlar va ish vaqtini kiritgach, faollashtiring."
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <SpecialistProfileFields
          values={values}
          onChange={setValues}
          experience={experience}
          onExperienceChange={setExperience}
          errors={errors}
          staffOptions={staffOptions}
          linkedStaff={null}
          activeHint="Faol mutaxassis ilovada ko‘rinadi va unga yozilish mumkin."
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
          <DialogClose disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? "Qo‘shilmoqda…" : "Qo‘shish"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
