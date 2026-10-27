"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AffixInput, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveOfferedServices } from "@/data/clinic.actions";
import { offeredServicesSchema } from "@/data/clinic.schema";
import { SERVICE_CATEGORY_LABEL, type ClinicService, type ClinicSpecialist } from "@/domain/clinic";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

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

/**
 * Xizmatlar va narxlar (contract §2.17 `PUT specialists/{id}/services/`):
 * the exact set of offers — a service left out stops being offered — with
 * the price in so‘m (0 = free) and the duration (empty = the service's
 * default). Existing appointments keep their snapshots.
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
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [rows, setRows] = useState(() => toRows(specialist));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
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
    const local = offeredServicesSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(next.services ?? null);
      requestAnimationFrame(() =>
        tableRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
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
      setErrors(next);
      const placed = Object.keys(next).some((k) => /^services\.\d+\./.test(k));
      setFormError(placed ? null : result.error);
      return;
    }
    onUpdated(result.data);
    setRows(toRows(result.data));
    toast({ title: "Xizmatlar saqlandi" });
  };

  return (
    <Card aria-labelledby="offers-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="offers-title" className="text-heading">
          Xizmatlar va narxlar
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Ro‘yxatdan olib tashlangan xizmat endi taklif qilinmaydi. Mavjud qabullarning narxi va
          davomiyligi o‘zgarmaydi.
        </p>
      </div>
      <div ref={tableRef} className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
            Hali xizmat yo‘q. «Xizmat qo‘shish» bilan qo‘shing.
          </p>
        )}
        {rows.map((row, index) => {
          const service = serviceOf(row.serviceId);
          const field = (name: string) => errors[`services.${index}.${name}`];
          const label = service?.name.uz ?? `#${row.serviceId}`;
          return (
            <fieldset
              key={row.key}
              className="m-0 grid grid-cols-1 items-start gap-2 rounded-md border border-line p-3 sm:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
            >
              <legend className="sr-only">{label}</legend>
              <label className="flex flex-col gap-1">
                <span className="text-caption font-semibold text-ink-muted">Xizmat</span>
                <Select
                  value={row.serviceId}
                  aria-invalid={field("serviceId") ? true : undefined}
                  onChange={(event) => {
                    const next = serviceOf(event.target.value);
                    update(row.key, {
                      serviceId: event.target.value,
                      price:
                        row.price || (next?.defaultPrice != null ? String(next.defaultPrice) : ""),
                    });
                  }}
                >
                  {services
                    .filter((s) => s.id === row.serviceId || !used.has(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name.uz} · {SERVICE_CATEGORY_LABEL[s.category]}
                        {s.isActive ? "" : " (nofaol)"}
                      </option>
                    ))}
                </Select>
                {field("serviceId") && <FieldMessage>{field("serviceId")}</FieldMessage>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption font-semibold text-ink-muted">Narx</span>
                <AffixInput
                  suffix="so‘m"
                  inputMode="numeric"
                  autoComplete="off"
                  value={row.price}
                  aria-invalid={field("price") ? true : undefined}
                  onChange={(event) => update(row.key, { price: digits(event.target.value, 9) })}
                />
                {field("price") && <FieldMessage>{field("price")}</FieldMessage>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption font-semibold text-ink-muted">Davomiylik</span>
                <AffixInput
                  suffix="daq."
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={service ? String(service.defaultDurationMin) : ""}
                  value={row.duration}
                  aria-invalid={field("durationMin") ? true : undefined}
                  onChange={(event) => update(row.key, { duration: digits(event.target.value, 3) })}
                />
                {field("durationMin") && <FieldMessage>{field("durationMin")}</FieldMessage>}
              </label>
              <span className="flex items-center gap-2 self-center pt-0 sm:pt-5">
                <Switch
                  checked={row.isActive}
                  onCheckedChange={(checked) => update(row.key, { isActive: checked })}
                  aria-label={`${label} — taklif faol`}
                />
                <button
                  type="button"
                  aria-label={`${label} — ro‘yxatdan olib tashlash`}
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-danger"
                >
                  <Icon name="trash" size={18} />
                </button>
              </span>
              {service && !service.isActive && (
                <p className="m-0 text-caption font-normal text-ink-muted sm:col-span-4">
                  Xizmat nofaol: faollashtirilgach yozilish mumkin bo‘ladi.
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
      <div className={cn("flex flex-wrap items-center justify-between gap-2")}>
        <Button variant="secondary" onClick={add} disabled={free.length === 0}>
          <Icon name="plus" size={18} />
          Xizmat qo‘shish
        </Button>
        <Button onClick={save} disabled={busy || !dirty} aria-busy={busy}>
          <Icon name="check" size={18} />
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </Button>
      </div>
    </Card>
  );
}

function FieldMessage({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 text-body-sm font-semibold text-ink">
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {children}
    </span>
  );
}
