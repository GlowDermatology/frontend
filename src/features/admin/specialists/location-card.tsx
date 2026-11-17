"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/components/ui/toast";
import { saveLocation } from "@/data/clinic.actions";
import { clinicSchemas, type LocationFormValues } from "@/data/clinic.schema";
import {
  LOCATION_ADDRESS_MAX,
  locationRecommendedToAsk,
  SERVICE_NAME_MAX,
  type ClinicLocation,
} from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { specialistsCopy, type SpecialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

interface Inputs {
  name: Record<ContentLanguage, string>;
  address: Record<ContentLanguage, string>;
  /** `+998…` (complete or partial) or "" — the phone input's value. */
  phone: string;
  latitude: string;
  longitude: string;
}

function toInputs(location: ClinicLocation | null): Inputs {
  return {
    name: { ...(location?.name ?? { uz: "", ru: "", en: "" }) },
    address: { ...(location?.address ?? { uz: "", ru: "", en: "" }) },
    phone: location?.phone ?? "",
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
    phone: inputs.phone.trim(),
    latitude: coordinate(inputs.latitude),
    longitude: coordinate(inputs.longitude),
  };
}

/** The form's fields in their order (server field errors outside them become the form error). */
const FIELDS = [
  ...LANGUAGES.map((l) => `name.${l}`),
  ...LANGUAGES.map((l) => `address.${l}`),
  "phone",
  "latitude",
  "longitude",
];

/** The summary label of a clinic field ("Manzil (ruscha)" for `address.ru`). */
export function locationFieldLabel(name: string, copy: SpecialistsCopy): string | undefined {
  const t = copy.location;
  const [field, language] = name.split(".") as [string, ContentLanguage | undefined];
  if ((field === "name" || field === "address") && language && language in copy.profile.language) {
    return copy.profile.inLanguage(
      field === "name" ? t.name : t.address,
      copy.profile.language[language],
    );
  }
  return (
    { phone: t.phone, latitude: t.latitude, longitude: t.longitude } as Record<string, string>
  )[field];
}

/**
 * Klinika (contract §2.17, decision P4: one location): name and address per
 * language, phone and coordinates, shown to customers with every
 * specialist and appointment. The first save creates the clinic. Without an
 * address or a phone the save asks "save anyway?".
 */
export function LocationCard({ location: initial }: { location: ClinicLocation | null }) {
  const copy = useCopy(specialistsCopy);
  const t = copy.location;
  const fmt = useFormat();
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [source, setSource] = useState(initial);
  const [inputs, setInputs] = useState(() => toInputs(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const recommended = useRecommendedConfirm();
  const summary = errorItems(errors, (name) => locationFieldLabel(name, copy), FIELDS);

  const values = toValues(inputs);
  const baseline = saved ? toValues(toInputs(saved)) : null;
  const dirty = JSON.stringify(values) !== JSON.stringify(toValues(toInputs(saved)));
  if (initial !== source) {
    setSource(initial);
    setSaved(initial);
    if (!dirty) setInputs(toInputs(initial));
  }

  const setText = (key: "name" | "address", language: ContentLanguage, value: string) =>
    setInputs((current) => ({ ...current, [key]: { ...current[key], [language]: value } }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.location.safeParse(values);
    if (!local.success) {
      setErrors(issuesToErrors(local.error));
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    // Asked only when it is news: the first save of the card, a field just emptied.
    const missing = locationRecommendedToAsk(local.data, baseline).map((name) => ({
      name,
      label: name === "phone" ? copy.recommended.phone : copy.recommended.address,
    }));
    if (
      (await recommended.confirm(missing, { remember: { kind: "location", id: "clinic" } })) ===
      "fix"
    ) {
      inFlight.current = false;
      await afterDialogsClose();
      reveal({ name: missing[0]!.name, shake: false });
      return;
    }
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
      toast({
        tone: "danger",
        title: copy.saveFailed,
        description: split.formError ?? result.error,
      });
      reveal();
      return;
    }
    setSaved(result.data);
    setInputs(toInputs(result.data));
    toast({ tone: "success", title: saved ? t.saved : t.created });
  };

  return (
    <Card aria-labelledby="clinic-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="clinic-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          {t.text} {saved ? t.updated(fmt.dateTimeShort(saved.updatedAt)) : t.missing}
        </p>
      </div>
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        <div className="grid gap-4 md:grid-cols-3">
          {LANGUAGES.map((language) => (
            <Field
              key={language}
              label={locationFieldLabel(`name.${language}`, copy)}
              name={`name.${language}`}
              error={errors[`name.${language}`]}
            >
              {(c) => (
                <TextInput
                  {...c}
                  name={`name.${language}`}
                  autoComplete="off"
                  maxLength={SERVICE_NAME_MAX}
                  value={inputs.name[language]}
                  onChange={(event) => setText("name", language, event.target.value)}
                />
              )}
            </Field>
          ))}
          {LANGUAGES.map((language) => (
            <Field
              key={language}
              label={locationFieldLabel(`address.${language}`, copy)}
              name={`address.${language}`}
              error={errors[`address.${language}`]}
            >
              {(c) => (
                <TextInput
                  {...c}
                  name={`address.${language}`}
                  autoComplete="off"
                  maxLength={LOCATION_ADDRESS_MAX}
                  value={inputs.address[language]}
                  onChange={(event) => setText("address", language, event.target.value)}
                />
              )}
            </Field>
          ))}
          <Field label={t.phone} name="phone" error={errors.phone}>
            {(c) => (
              <PhoneInput
                {...c}
                name="phone"
                value={inputs.phone}
                onValueChange={(phone) => setInputs((current) => ({ ...current, phone }))}
              />
            )}
          </Field>
          <Field
            label={t.latitude}
            name="latitude"
            error={errors.latitude}
            hint={t.example("41.311081")}
          >
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
          <Field
            label={t.longitude}
            name="longitude"
            error={errors.longitude}
            hint={t.example("69.240562")}
          >
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
          <Button
            type="submit"
            busy={busy}
            disabledReason={!busy && !dirty && saved !== null && t.noChanges}
          >
            <Icon name="check" size={18} />
            {busy ? copy.saving : copy.save}
          </Button>
        </div>
        {recommended.dialog}
      </form>
    </Card>
  );
}
