"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { saveLocation } from "@/data/clinic.actions";
import { locationFormSchema, type LocationFormValues } from "@/data/clinic.schema";
import { LOCATION_ADDRESS_MAX, SERVICE_NAME_MAX, type ClinicLocation } from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";
import { formatDateTimeShort, formatPhone } from "@/lib/format";
import { maskPhone, normalizePhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useFocusFirstInvalid } from "../shared/focus-invalid";
import { useIdempotencyKey } from "../shared/idempotency";

const LANGUAGES: ReadonlyArray<[ContentLanguage, string]> = [
  ["uz", "o‘zbekcha"],
  ["ru", "ruscha"],
  ["en", "inglizcha"],
];

interface Inputs {
  name: Record<ContentLanguage, string>;
  address: Record<ContentLanguage, string>;
  phone: string;
  latitude: string;
  longitude: string;
}

function toInputs(location: ClinicLocation | null): Inputs {
  return {
    name: { ...(location?.name ?? { uz: "", ru: "", en: "" }) },
    address: { ...(location?.address ?? { uz: "", ru: "", en: "" }) },
    phone: location?.phone ? formatPhone(location.phone) : "",
    latitude: location?.latitude === null || !location ? "" : String(location.latitude),
    longitude: location?.longitude === null || !location ? "" : String(location.longitude),
  };
}

function toValues(inputs: Inputs): LocationFormValues {
  const coordinate = (value: string) =>
    value.trim() === "" ? null : Number(value.trim().replace(",", "."));
  return {
    name: inputs.name,
    address: inputs.address,
    phone: inputs.phone.trim() === "" ? "" : normalizePhone(inputs.phone),
    latitude: coordinate(inputs.latitude),
    longitude: coordinate(inputs.longitude),
  };
}

const FIELDS = [
  "phone",
  "latitude",
  "longitude",
  ...LANGUAGES.flatMap(([l]) => [`name.${l}`, `address.${l}`]),
];

/**
 * Klinika (contract §2.17, decision P4: one location): name and address per
 * language, phone and coordinates, shown to customers with every
 * specialist and appointment. The first save creates the clinic.
 */
export function LocationCard({ location: initial }: { location: ClinicLocation | null }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [source, setSource] = useState(initial);
  const [inputs, setInputs] = useState(() => toInputs(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const focusFirstInvalid = useFocusFirstInvalid();

  const values = toValues(inputs);
  const baseline = saved ? toValues(toInputs(saved)) : null;
  const dirty = JSON.stringify(values) !== JSON.stringify(toValues(toInputs(saved)));
  if (initial !== source) {
    setSource(initial);
    setSaved(initial);
    if (!dirty) setInputs(toInputs(initial));
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const local = locationFormSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      focusFirstInvalid(form);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => saveLocation(local.data, baseline, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, FIELDS);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      focusFirstInvalid(form);
      return;
    }
    setSaved(result.data);
    setInputs(toInputs(result.data));
    toast({ title: saved ? "Klinika saqlandi" : "Klinika yaratildi" });
  };

  return (
    <Card aria-labelledby="clinic-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="clinic-title" className="text-heading">
          Klinika
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Ilovada har bir mutaxassis va qabul bilan ko‘rsatiladi.
          {saved
            ? ` Oxirgi o‘zgarish: ${formatDateTimeShort(saved.updatedAt)}.`
            : " Klinika hali kiritilmagan."}
        </p>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          {LANGUAGES.map(([language, label]) => (
            <Field key={language} label={`Nomi (${label})`} error={errors[`name.${language}`]}>
              {(c) => (
                <TextInput
                  {...c}
                  name={`name.${language}`}
                  autoComplete="off"
                  maxLength={SERVICE_NAME_MAX}
                  value={inputs.name[language]}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      name: { ...current.name, [language]: event.target.value },
                    }))
                  }
                />
              )}
            </Field>
          ))}
          {LANGUAGES.map(([language, label]) => (
            <Field key={language} label={`Manzil (${label})`} error={errors[`address.${language}`]}>
              {(c) => (
                <TextInput
                  {...c}
                  name={`address.${language}`}
                  autoComplete="off"
                  maxLength={LOCATION_ADDRESS_MAX}
                  value={inputs.address[language]}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      address: { ...current.address, [language]: event.target.value },
                    }))
                  }
                />
              )}
            </Field>
          ))}
          <Field label="Telefon" error={errors.phone}>
            {(c) => (
              <TextInput
                {...c}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+998 71 200 00 00"
                className="tabular-nums"
                value={inputs.phone}
                onChange={(event) =>
                  setInputs((current) => ({ ...current, phone: maskPhone(event.target.value) }))
                }
              />
            )}
          </Field>
          <Field label="Kenglik (latitude)" error={errors.latitude} hint="Masalan, 41.311081">
            {(c) => (
              <TextInput
                {...c}
                name="latitude"
                inputMode="decimal"
                autoComplete="off"
                value={inputs.latitude}
                onChange={(event) =>
                  setInputs((current) => ({ ...current, latitude: event.target.value }))
                }
              />
            )}
          </Field>
          <Field label="Uzunlik (longitude)" error={errors.longitude} hint="Masalan, 69.240562">
            {(c) => (
              <TextInput
                {...c}
                name="longitude"
                inputMode="decimal"
                autoComplete="off"
                value={inputs.longitude}
                onChange={(event) =>
                  setInputs((current) => ({ ...current, longitude: event.target.value }))
                }
              />
            )}
          </Field>
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
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || (!dirty && saved !== null)} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
