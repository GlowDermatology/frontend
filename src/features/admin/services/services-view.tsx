"use client";

import type { Route } from "next";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AffixInput, Field, TextArea, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveService } from "@/data/clinic.actions";
import { clinicSchemas, EMPTY_SERVICE, type ServiceFormValues } from "@/data/clinic.schema";
import type { Page } from "@/data/types";
import {
  SERVICE_CATEGORIES,
  SERVICE_NAME_MAX,
  SERVICE_SHORT_MAX,
  serviceRecommendedToAsk,
  TEXT_MAX,
  type ClinicService,
  type ServiceListQuery,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose } from "../products/form-reveal";
import { LanguageTabs } from "../products/language-tabs";
import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import { DirectoryPageSizeMenu, DirectoryToolbar } from "../specialists/directory-toolbar";
import { errorItems, issuesToErrors, pageRangeText } from "../specialists/form-kit";
import { serviceName } from "../specialists/offers-card";
import { hasDirectoryFilters, serviceListHref } from "../specialists/query";
import { servicesCopy, type ServicesCopy } from "./copy";

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

/** The summary label of a service field ("Nomi (ruscha)" for `name.ru`). */
export function serviceFieldLabel(name: string, t: ServicesCopy): string | undefined {
  const d = t.dialog;
  const [field, language] = name.split(".") as [string, ContentLanguage | undefined];
  const texts: Record<string, string> = {
    name: d.name,
    shortName: d.shortName,
    description: d.description,
  };
  if (texts[field] && language && language in d.language) {
    return d.inLanguage(texts[field]!, d.language[language]);
  }
  return (
    {
      category: d.category,
      defaultDurationMin: d.duration,
      defaultPrice: d.price,
      isActive: d.active,
    } as Record<string, string>
  )[field];
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
  const t = useCopy(servicesCopy);
  const m = useCopy(clinicDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
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
        eyebrow={(filtered ? t.found : t.count)(page.total, fmt.number(page.total))}
        title={t.title}
        actions={
          <>
            <ExportMenu
              href={serviceListHref(
                { ...query, page: undefined, pageSize: undefined },
                "/admin/services/export",
              )}
              label={t.export}
            />
            <Link href="/admin/specialists" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="user" size={18} />
              {t.specialists}
            </Link>
            <Button onClick={() => open(null)}>
              <Icon name="plus" size={18} />
              {t.create}
            </Button>
          </>
        }
      />

      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <DirectoryToolbar kind="services" query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label={t.tableLabel}>
              <table className="data-table min-w-[900px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">{t.caption}</caption>
                <thead className="uppercase">
                  <tr>
                    <th scope="col">{t.service}</th>
                    <th scope="col">{t.category}</th>
                    <th scope="col" className="text-right!">
                      {t.duration}
                    </th>
                    <th scope="col" className="text-right!">
                      {t.price}
                    </th>
                    <th scope="col" className="text-right!">
                      {t.specialistCount}
                    </th>
                    <th scope="col">{t.status}</th>
                    <th scope="col">
                      <span className="sr-only">{t.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const name = serviceName(row, locale);
                    const others = (["uz", "ru", "en"] as const)
                      .filter((language) => language !== locale && row.name[language].trim())
                      .map((language) => row.name[language])
                      .filter((other) => other !== name);
                    const short = row.shortName[locale]?.trim() || row.shortName.uz;
                    return (
                      <tr key={row.id}>
                        <td>
                          <span className="flex max-w-[360px] min-w-0 flex-col">
                            <span className="font-bold break-words text-ink">{name}</span>
                            <span className="truncate text-[12px] text-ink-muted">
                              {short && short !== name ? `${short} · ` : ""}
                              {others.join(" · ") || t.noTranslations}
                            </span>
                          </span>
                        </td>
                        <td>{m.category[row.category]}</td>
                        <td className="text-right whitespace-nowrap tabular-nums">
                          {fmt.duration(row.defaultDurationMin)}
                        </td>
                        <td className="text-right whitespace-nowrap tabular-nums">
                          {row.defaultPrice === null ? "—" : fmt.som(row.defaultPrice)}
                        </td>
                        <td className="text-right tabular-nums">
                          {fmt.number(row.specialistCount)}
                        </td>
                        <td>
                          {row.isActive ? (
                            <Badge tone="success">{m.status.active}</Badge>
                          ) : (
                            <Badge tone="muted">{m.status.inactive}</Badge>
                          )}
                        </td>
                        <td className="text-right">
                          <IconButton size="sm" aria-label={t.edit(name)} onClick={() => open(row)}>
                            <Icon name="pencil" size={18} />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollRegion>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="sparkle" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {filtered ? t.emptyFiltered : t.emptyAll}
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
            tone: "success",
            title: created ? t.created : t.saved,
            description: serviceName(service, locale),
          });
        }}
      />
    </>
  );
}

const TEXT_KEYS = ["name", "shortName", "description"] as const;

const FIELDS = [
  ...LANGUAGES.flatMap((l) => TEXT_KEYS.map((k) => `${k}.${l}`)),
  "category",
  "defaultDurationMin",
  "defaultPrice",
  "isActive",
];

/** The first language whose texts hold an error, keeping `current` when it has one. */
function errorLanguage(
  errors: Readonly<Record<string, string>>,
  current: ContentLanguage,
): ContentLanguage | null {
  const failing = (language: ContentLanguage) =>
    TEXT_KEYS.some((key) => errors[`${key}.${language}`]);
  if (failing(current)) return current;
  return LANGUAGES.find(failing) ?? null;
}

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
  const copy = useCopy(servicesCopy);
  const t = copy.dialog;
  const m = useCopy(clinicDataCopy);
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
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
  const reveal = useErrorReveal(formRef);
  const recommended = useRecommendedConfirm();
  const summary = errorItems(errors, (name) => serviceFieldLabel(name, copy), FIELDS);

  const setText = (key: (typeof TEXT_KEYS)[number], value: string) =>
    setValues((current) => ({ ...current, [key]: { ...current[key], [language]: value } }));

  const show = (next: Record<string, string>, message: string | null) => {
    setErrors(next);
    setFormError(message);
    const lang = errorLanguage(next, language);
    if (lang) setLanguage(lang);
    reveal();
  };

  /** A summary link or "fill in": show the field's language tab first. */
  const goTo = (name: string, shake = true) => {
    const lang = name.split(".")[1] as ContentLanguage | undefined;
    if (lang && LANGUAGES.includes(lang)) setLanguage(lang);
    reveal({ name, shake });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.service.safeParse({
      ...values,
      defaultDurationMin: duration.trim() === "" ? Number.NaN : Number(duration),
      defaultPrice: price.trim() === "" ? null : Number(price.replace(/\s/g, "")),
    });
    if (!local.success) return show(issuesToErrors(local.error), null);
    inFlight.current = true;
    // Asked only when it is news: a create, the save that activates, a field just emptied.
    const missing = serviceRecommendedToAsk(local.data, service ? baseline : null).map((name) => ({
      name,
      label: serviceFieldLabel(name, copy) ?? name,
    }));
    const remember = service ? { kind: "service", id: service.id } : null;
    if ((await recommended.confirm(missing, { remember })) === "fix") {
      inFlight.current = false;
      await afterDialogsClose();
      goTo(missing[0]!.name, false);
      return;
    }
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
      toast({
        tone: "danger",
        title: copy.saveFailed,
        description: split.formError ?? result.error,
      });
      return show(split.fieldErrors, split.formError);
    }
    onSaved(result.data, service === null);
    onOpenChange(false);
  };

  const languageName = t.language[language];
  const invalid = Object.fromEntries(
    LANGUAGES.map((l) => [l, TEXT_KEYS.some((key) => Boolean(errors[`${key}.${l}`]))]),
  ) as Record<ContentLanguage, boolean>;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title={service ? t.editTitle : t.createTitle}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={summary} onSelect={(name) => goTo(name)} />
        <LanguageTabs
          languages={LANGUAGES}
          value={language}
          onChange={setLanguage}
          complete={{
            uz: Boolean(values.name.uz.trim()),
            ru: Boolean(values.name.ru.trim()),
            en: Boolean(values.name.en.trim()),
          }}
          invalid={invalid}
          idBase={idBase}
        />
        <div
          role="tabpanel"
          id={`${idBase}-panel`}
          aria-labelledby={`${idBase}-tab-${language}`}
          data-lang={language}
          className="flex flex-col gap-4"
        >
          <Field
            label={t.inLanguage(t.name, languageName)}
            name={`name.${language}`}
            error={errors[`name.${language}`]}
          >
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
            label={t.inLanguage(t.shortName, languageName)}
            name={`shortName.${language}`}
            error={errors[`shortName.${language}`]}
            hint={t.shortNameHint}
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
          <Field
            label={t.inLanguage(t.description, languageName)}
            name={`description.${language}`}
            error={errors[`description.${language}`]}
          >
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
          <Field label={t.category} name="category" error={errors.category}>
            {(c) => (
              <Select<ServiceFormValues["category"]>
                {...c}
                value={values.category}
                onValueChange={(category) => setValues((current) => ({ ...current, category }))}
                options={SERVICE_CATEGORIES.map((category) => ({
                  value: category,
                  label: m.category[category],
                }))}
              />
            )}
          </Field>
          <Field
            label={t.duration}
            name="defaultDurationMin"
            error={errors.defaultDurationMin}
            hint={t.durationHint}
          >
            {(c) => (
              <AffixInput
                {...c}
                suffix={t.minutes}
                inputMode="numeric"
                autoComplete="off"
                value={duration}
                onChange={(event) => setDuration(event.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            )}
          </Field>
          <Field label={t.price} name="defaultPrice" error={errors.defaultPrice} hint={t.priceHint}>
            {(c) => (
              <AffixInput
                {...c}
                suffix={t.currency}
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
            <span className="text-label text-ink">{t.active}</span>
            <span className="text-caption font-normal text-ink-muted">{t.activeText}</span>
          </span>
          <Switch
            checked={values.isActive}
            onCheckedChange={(checked) =>
              setValues((current) => ({ ...current, isActive: checked }))
            }
            aria-label={t.activeSwitch}
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
          <Button
            type="button"
            variant="outline"
            disabledReason={busy && t.busyReason}
            onClick={() => onOpenChange(false)}
          >
            {t.cancel}
          </Button>
          <Button type="submit" busy={busy}>
            <Icon name="check" size={18} />
            {busy ? t.saving : t.save}
          </Button>
        </div>
        {recommended.dialog}
      </form>
    </Dialog>
  );
}
