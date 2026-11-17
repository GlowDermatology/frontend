"use client";

import { useRef, useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AffixInput, Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveOfferedServices } from "@/data/clinic.actions";
import { clinicSchemas } from "@/data/clinic.schema";
import type { ClinicService, ClinicSpecialist } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { specialistsCopy, type SpecialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";

interface Row {
  key: string;
  serviceId: string;
  price: string;
  duration: string;
  isActive: boolean;
}

let counter = 0;
const nextKey = () => `row-${(counter += 1)}`;

function toRows(specialist: ClinicSpecialist): Row[] {
  return specialist.services.map((offer) => ({
    key: nextKey(),
    serviceId: offer.serviceId,
    price: String(offer.price),
    duration: String(offer.durationMin),
    isActive: offer.isActive,
  }));
}

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

/** A service's name in the admin language when it has one there (Uzbek is always filled). */
export function serviceName(service: Pick<ClinicService, "name">, locale: ContentLanguage): string {
  return service.name[locale]?.trim() || service.name.uz;
}

/** The summary label of an offer error (`services.2.price` → "3-xizmat · Narx"). */
export function offerErrorLabel(name: string, t: SpecialistsCopy): string | undefined {
  const match = /^services\.(\d+)\.(\w+)$/.exec(name);
  if (!match) return undefined;
  const field = {
    serviceId: t.offers.service,
    price: t.offers.price,
    durationMin: t.offers.duration,
  }[match[2] as "serviceId" | "price" | "durationMin"];
  return field
    ? `${t.offers.row(Number(match[1]) + 1)} · ${field}`
    : t.offers.row(Number(match[1]) + 1);
}

/**
 * Xizmatlar va narxlar (contract §2.17 `PUT specialists/{id}/services/`):
 * the exact set of offers — a service left out stops being offered — with
 * the price in so‘m (0 = free) and the duration (empty = the service's
 * default). Existing appointments keep their snapshots. Row errors are listed
 * above the rows; the first one is revealed.
 */
export function OffersCard({
  specialist,
  services,
  onUpdated,
}: {
  specialist: ClinicSpecialist;
  services: ReadonlyArray<ClinicService>;
  onUpdated: (specialist: ClinicSpecialist) => void;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.offers;
  const m = useCopy(clinicDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [rows, setRows] = useState(() => toRows(specialist));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const reveal = useErrorReveal(cardRef);
  const idempotency = useIdempotencyKey();

  const signature = (list: Row[]) =>
    JSON.stringify(
      list.map(({ serviceId, price, duration, isActive }) => [
        serviceId,
        price,
        duration,
        isActive,
      ]),
    );
  const dirty = signature(rows) !== signature(toRows(source));
  if (specialist !== source) {
    setSource(specialist);
    if (!dirty) setRows(toRows(specialist));
  }

  const used = new Set(rows.map((row) => row.serviceId));
  const free = services.filter((s) => !used.has(s.id));
  const serviceOf = (id: string) => services.find((s) => s.id === id);
  const summary = errorItems(errors, (name) => offerErrorLabel(name, copy));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const add = () => {
    const first = free.find((s) => s.isActive) ?? free[0];
    if (!first) return;
    setRows((current) => [
      ...current,
      {
        key: nextKey(),
        serviceId: first.id,
        price: first.defaultPrice === null ? "" : String(first.defaultPrice),
        duration: "",
        isActive: true,
      },
    ]);
  };

  const show = (next: Record<string, string>, message: string | null) => {
    setErrors(next);
    setFormError(message);
    reveal();
  };

  const save = async () => {
    if (inFlight.current) return;
    const values = {
      services: rows.map((row) => ({
        serviceId: row.serviceId,
        price: row.price === "" ? Number.NaN : Number(row.price),
        durationMin: row.duration === "" ? null : Number(row.duration),
        isActive: row.isActive,
      })),
    };
    const local = schemas.offers.safeParse(values);
    if (!local.success) {
      const next = issuesToErrors(local.error);
      show(next, next.services ?? null);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        saveOfferedServices(specialist.id, local.data, idempotency.key, csrf),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      const placed = Object.keys(next).some((k) => /^services\.\d+\./.test(k));
      show(next, placed ? null : result.error);
      toast({ tone: "danger", title: copy.saveFailed, description: result.error });
      return;
    }
    onUpdated(result.data);
    setRows(toRows(result.data));
    toast({ tone: "success", title: t.saved });
  };

  const addReason = services.length === 0 ? t.noServices : free.length === 0 ? t.allAdded : null;

  return (
    <Card aria-labelledby="offers-title" className="flex flex-col gap-4">
      <div ref={cardRef} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle id="offers-title" className="text-heading">
            {t.title}
          </CardTitle>
          <p className="m-0 text-body-sm text-ink-muted">{t.text}</p>
        </div>
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        <div className="flex flex-col gap-2">
          {rows.length === 0 && (
            <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
              {t.empty}
            </p>
          )}
          {rows.map((row, index) => {
            const service = serviceOf(row.serviceId);
            const path = (name: string) => `services.${index}.${name}`;
            const field = (name: string) => errors[path(name)];
            const label = service ? serviceName(service, locale) : `#${row.serviceId}`;
            return (
              <fieldset
                key={row.key}
                className="m-0 grid min-w-0 grid-cols-1 items-start gap-2 rounded-md border border-line p-3 sm:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
              >
                <legend className="sr-only">{label}</legend>
                <Field label={t.service} name={path("serviceId")} error={field("serviceId")}>
                  {(c) => (
                    <Select<string>
                      {...c}
                      value={row.serviceId}
                      onValueChange={(id) => {
                        const next = serviceOf(id);
                        update(row.key, {
                          serviceId: id,
                          price:
                            row.price ||
                            (next?.defaultPrice != null ? String(next.defaultPrice) : ""),
                        });
                      }}
                      options={services
                        .filter((s) => s.id === row.serviceId || !used.has(s.id))
                        .map((s) => ({
                          value: s.id,
                          label: serviceName(s, locale),
                          text: serviceName(s, locale),
                          description: s.isActive
                            ? m.category[s.category]
                            : `${m.category[s.category]} · ${t.inactive}`,
                        }))}
                    />
                  )}
                </Field>
                <Field label={t.price} name={path("price")} error={field("price")}>
                  {(c) => (
                    <AffixInput
                      {...c}
                      suffix={t.currency}
                      inputMode="numeric"
                      autoComplete="off"
                      value={row.price}
                      onChange={(event) =>
                        update(row.key, { price: digits(event.target.value, 9) })
                      }
                    />
                  )}
                </Field>
                <Field
                  label={t.duration}
                  name={path("durationMin")}
                  error={field("durationMin")}
                  hint={
                    service && !row.duration
                      ? t.durationHint(fmt.duration(service.defaultDurationMin))
                      : undefined
                  }
                >
                  {(c) => (
                    <AffixInput
                      {...c}
                      suffix={t.minutes}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={service ? String(service.defaultDurationMin) : ""}
                      value={row.duration}
                      onChange={(event) =>
                        update(row.key, { duration: digits(event.target.value, 3) })
                      }
                    />
                  )}
                </Field>
                <span className="flex items-center gap-2 self-center pt-0 sm:pt-7">
                  <Switch
                    checked={row.isActive}
                    onCheckedChange={(checked) => update(row.key, { isActive: checked })}
                    aria-label={t.offerActive(label)}
                  />
                  <IconButton
                    size="sm"
                    aria-label={t.remove(label)}
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    className="hover:text-danger"
                  >
                    <Icon name="trash" size={18} />
                  </IconButton>
                </span>
                {service && !service.isActive && (
                  <p className="m-0 text-caption font-normal text-ink-muted sm:col-span-4">
                    {t.serviceInactive}
                  </p>
                )}
              </fieldset>
            );
          })}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={add} disabledReason={addReason}>
            <Icon name="plus" size={18} />
            {t.add}
          </Button>
          <Button onClick={save} busy={busy} disabledReason={!busy && !dirty && copy.noChanges}>
            <Icon name="check" size={18} />
            {busy ? copy.saving : copy.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}
