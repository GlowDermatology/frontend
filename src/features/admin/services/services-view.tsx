"use client";

import type { Route } from "next";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { AffixInput, Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveService } from "@/data/clinic.actions";
import { EMPTY_SERVICE, serviceFormSchema, type ServiceFormValues } from "@/data/clinic.schema";
import type { Page } from "@/data/types";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICE_NAME_MAX,
  SERVICE_SHORT_MAX,
  TEXT_MAX,
  type ClinicService,
  type ServiceListQuery,
} from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";
import { formatNumber, formatSom } from "@/lib/format";

import { LanguageTabs } from "../products/language-tabs";
import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { DirectoryPageSizeMenu, DirectoryToolbar } from "../specialists/directory-toolbar";
import { hasDirectoryFilters, serviceListHref } from "../specialists/query";

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

function toValues(service: ClinicService | null): ServiceFormValues {
  if (!service) return structuredClone(EMPTY_SERVICE);
  return {
    name: { ...service.name },
    shortName: { ...service.shortName },
    description: { ...service.description },
    category: service.category,
    defaultDurationMin: service.defaultDurationMin,
    defaultPrice: service.defaultPrice,
    isActive: service.isActive,
  };
}

/**
 * Xizmatlar (gap FND-7, contract §2.17): bookable services with search,
 * status, category, ordering, pages and the `xizmatlar` export, created and
 * edited in a dialog. A service is retired (inactive), never deleted;
 * prices live on each specialist's offer.
 */
export function ServicesView({
  page,
  query,
}: {
  page: Page<ClinicService>;
  query: ServiceListQuery;
}) {
  const toast = useToast();
  const [source, setSource] = useState(page);
  const [rows, setRows] = useState(page.items);
  if (page !== source) {
    setSource(page);
    setRows(page.items);
  }
  const [dialog, setDialog] = useState<{ service: ClinicService | null } | null>(null);
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();
  const filtered = hasDirectoryFilters(query);

  const open = (service: ClinicService | null) => {
    setInstance((n) => n + 1);
    setDialog({ service });
  };

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(page.total)} ta xizmat${filtered ? " topildi" : ""}`}
        title="Xizmatlar"
        actions={
          <>
            <ExportMenu
              href={serviceListHref(
                { ...query, page: undefined, pageSize: undefined },
                "/admin/services/export",
              )}
            />
            <Link href="/admin/specialists" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="user" size={18} />
              Mutaxassislar
            </Link>
            <button type="button" onClick={() => open(null)} className={buttonStyles()}>
              <Icon name="plus" size={18} />
              Yangi xizmat
            </button>
          </>
        }
      />

      <ListTransition className="group">
        <section
          aria-label="Xizmatlar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <DirectoryToolbar kind="services" query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label="Xizmatlar jadvali">
              <table className="data-table min-w-[900px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">Xizmatlar</caption>
                <thead>
                  <tr>
                    <th scope="col">XIZMAT</th>
                    <th scope="col">KATEGORIYA</th>
                    <th scope="col" className="text-right!">
                      DAVOMIYLIGI
                    </th>
                    <th scope="col" className="text-right!">
                      TAVSIYA NARX
                    </th>
                    <th scope="col" className="text-right!">
                      MUTAXASSISLAR
                    </th>
                    <th scope="col">HOLAT</th>
                    <th scope="col">
                      <span className="sr-only">Amallar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="flex flex-col">
                          <span className="font-bold text-ink">{row.name.uz}</span>
                          <span className="text-[12px] text-ink-muted">
                            {row.shortName.uz !== row.name.uz ? `${row.shortName.uz} · ` : ""}
                            {[row.name.ru, row.name.en].filter(Boolean).join(" · ") ||
                              "Tarjimalar to‘ldirilmagan"}
                          </span>
                        </span>
                      </td>
                      <td>{SERVICE_CATEGORY_LABEL[row.category]}</td>
                      <td className="text-right tabular-nums">{row.defaultDurationMin} daq.</td>
                      <td className="text-right tabular-nums">
                        {row.defaultPrice === null ? "—" : formatSom(row.defaultPrice)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatNumber(row.specialistCount)}
                      </td>
                      <td>
                        {row.isActive ? (
                          <Badge tone="success">Faol</Badge>
                        ) : (
                          <Badge tone="muted">Nofaol</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          aria-label={`«${row.name.uz}» — tahrirlash`}
                          onClick={() => open(row)}
                          className="inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                        >
                          <Icon name="pencil" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="sparkle" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">Xizmat topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {filtered
                  ? "Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
                  : "«Yangi xizmat» bilan birinchi xizmatni qo‘shing."}
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
              hrefFor={(p): Route => serviceListHref({ ...query, page: p })}
            />
            <DirectoryPageSizeMenu kind="services" query={query} />
          </div>
        </section>
      </ListTransition>

      <ServiceDialog
        key={instance}
        open={dialog !== null}
        service={dialog?.service ?? null}
        idempotency={idempotency}
        onOpenChange={(next) => {
          if (!next) setDialog(null);
        }}
        onSaved={(service, created) => {
          setRows((current) =>
            created
              ? [...current, service]
              : current.map((row) => (row.id === service.id ? service : row)),
          );
          toast({
            title: created ? "Xizmat qo‘shildi" : "Xizmat saqlandi",
            description: service.name.uz,
          });
        }}
      />
    </>
  );
}

const FIELDS = [
  "category",
  "defaultDurationMin",
  "defaultPrice",
  "isActive",
  ...LANGUAGES.flatMap((l) => [`name.${l}`, `shortName.${l}`, `description.${l}`]),
];

function ServiceDialog({
  open,
  service,
  idempotency,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  service: ClinicService | null;
  idempotency: ReturnType<typeof useIdempotencyKey>;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: ClinicService, created: boolean) => void;
}) {
  const idBase = useId();
  const baseline = toValues(service);
  const [values, setValues] = useState(baseline);
  const [duration, setDuration] = useState(String(baseline.defaultDurationMin));
  const [price, setPrice] = useState(
    baseline.defaultPrice === null ? "" : String(baseline.defaultPrice),
  );
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const setText = (key: "name" | "shortName" | "description", value: string) =>
    setValues((current) => ({ ...current, [key]: { ...current[key], [language]: value } }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = serviceFormSchema.safeParse({
      ...values,
      defaultDurationMin: duration.trim() === "" ? Number.NaN : Number(duration),
      defaultPrice: price.trim() === "" ? null : Number(price.replace(/\s/g, "")),
    });
    const show = (next: Record<string, string>, message: string | null) => {
      setErrors(next);
      setFormError(message);
      const first = LANGUAGES.find((l) =>
        ["name", "shortName", "description"].some((k) => next[`${k}.${l}`]),
      );
      if (first) setLanguage(first);
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
    };
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      return show(next, null);
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        saveService(
          service?.id ?? null,
          local.data,
          service ? baseline : null,
          idempotency.key,
          csrf,
        ),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, FIELDS);
      return show(split.fieldErrors, split.formError);
    }
    onSaved(result.data, service === null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title={service ? "Xizmatni tahrirlash" : "Yangi xizmat"}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <LanguageTabs
          languages={LANGUAGES}
          value={language}
          onChange={setLanguage}
          complete={{
            uz: Boolean(values.name.uz.trim()),
            ru: Boolean(values.name.ru.trim()),
            en: Boolean(values.name.en.trim()),
          }}
          idBase={idBase}
        />
        <div
          role="tabpanel"
          id={`${idBase}-panel`}
          aria-labelledby={`${idBase}-tab-${language}`}
          className="flex flex-col gap-4"
        >
          <Field label={`Nomi (${language})`} error={errors[`name.${language}`]}>
            {(c) => (
              <TextInput
                {...c}
                autoComplete="off"
                maxLength={SERVICE_NAME_MAX}
                value={values.name[language]}
                onChange={(event) => setText("name", event.target.value)}
              />
            )}
          </Field>
          <Field
            label={`Qisqa nomi (${language})`}
            error={errors[`shortName.${language}`]}
            hint="Qabullar jadvali va ilova tugmalarida. Bo‘sh qolsa, nomidan olinadi."
          >
            {(c) => (
              <TextInput
                {...c}
                autoComplete="off"
                maxLength={SERVICE_SHORT_MAX}
                value={values.shortName[language]}
                onChange={(event) => setText("shortName", event.target.value)}
              />
            )}
          </Field>
          <Field label={`Tavsif (${language})`} error={errors[`description.${language}`]}>
            {(c) => (
              <TextArea
                {...c}
                rows={3}
                maxLength={TEXT_MAX}
                value={values.description[language]}
                onChange={(event) => setText("description", event.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kategoriya" error={errors.category}>
            {(c) => (
              <Select
                {...c}
                value={values.category}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    category: event.target.value as ServiceFormValues["category"],
                  }))
                }
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SERVICE_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Davomiyligi" error={errors.defaultDurationMin} hint="5 daqiqaga karrali.">
            {(c) => (
              <AffixInput
                {...c}
                suffix="daq."
                inputMode="numeric"
                autoComplete="off"
                value={duration}
                onChange={(event) => setDuration(event.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            )}
          </Field>
          <Field label="Tavsiya narx" error={errors.defaultPrice} hint="Ixtiyoriy.">
            {(c) => (
              <AffixInput
                {...c}
                suffix="so‘m"
                inputMode="numeric"
                autoComplete="off"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 9))}
              />
            )}
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-label text-ink">Faol</span>
            <span className="text-caption font-normal text-ink-muted">
              Nofaol xizmat ilovadan va yozilish oynasidan darhol yo‘qoladi; mavjud qabullar
              saqlanadi.
            </span>
          </span>
          <Switch
            checked={values.isActive}
            onCheckedChange={(checked) =>
              setValues((current) => ({ ...current, isActive: checked }))
            }
            aria-label="Xizmat faol"
          />
        </div>
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
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
