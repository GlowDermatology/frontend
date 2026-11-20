"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { locationFormValues } from "@/data/api/mappers/clinic";
import { saveClinic } from "@/data/clinic.actions";
import { clinicSchemas } from "@/data/clinic.schema";
import {
  LOCATION_ADDRESS_MAX,
  LOCATION_DIRECTIONS_MAX,
  SERVICE_NAME_MAX,
  type ClinicLocation,
} from "@/domain/clinic";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { specialistsCopy, type SpecialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";
import { LANGUAGES } from "./profile-fields";

const TEXT_FIELDS = {
  name: SERVICE_NAME_MAX,
  address: LOCATION_ADDRESS_MAX,
  directions: LOCATION_DIRECTIONS_MAX,
};
const COORDINATES = { latitude: "41.311081", longitude: "69.240562" };
const FIELDS = [
  ...Object.keys(TEXT_FIELDS).flatMap((field) =>
    LANGUAGES.map((language) => `${field}.${language}`),
  ),
  "phone",
  "latitude",
  "longitude",
  "isActive",
];

export function locationFieldLabel(name: string, copy: SpecialistsCopy): string | undefined {
  const t = copy.location;
  const [field, language] = name.split(".");
  if (field && field in TEXT_FIELDS && language && language in copy.profile.language) {
    return copy.profile.inLanguage(
      t[field as keyof typeof TEXT_FIELDS],
      copy.profile.language[language as keyof typeof copy.profile.language],
    );
  }
  const labels: Record<string, string> = {
    phone: t.phone,
    latitude: t.latitude,
    longitude: t.longitude,
    isActive: t.active,
  };
  return labels[name];
}

const asCoordinate = (value: string) =>
  value.trim() === "" ? null : Number(value.trim().replace(",", "."));

export function ClinicDialog({
  location,
  onClose,
  onSaved,
}: {
  location: ClinicLocation | null;
  onClose: () => void;
  onSaved: (clinic: ClinicLocation) => void;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.location;
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [baseline] = useState(() => locationFormValues(location));
  const [values, setValues] = useState(baseline);
  const [coordinates, setCoordinates] = useState({
    latitude: baseline.latitude?.toString() ?? "",
    longitude: baseline.longitude?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const summary = errorItems(errors, (name) => locationFieldLabel(name, copy), FIELDS);

  const data = {
    ...values,
    latitude: asCoordinate(coordinates.latitude),
    longitude: asCoordinate(coordinates.longitude),
  };
  const dirty =
    JSON.stringify(data) !== JSON.stringify(baseline) ||
    Number.isNaN(data.latitude) ||
    Number.isNaN(data.longitude);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.location.safeParse(data);
    if (!local.success) {
      setErrors(issuesToErrors(local.error));
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        saveClinic(
          location?.id ?? null,
          local.data,
          location ? baseline : null,
          idempotency.key,
          csrf,
        ),
      ),
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
    toast({ tone: "success", title: location ? t.saved : t.created });
    onSaved(result.data);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={location ? t.edit : t.add}
      description={t.details}
      className="max-w-[740px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(TEXT_FIELDS) as Array<keyof typeof TEXT_FIELDS>).flatMap((field) =>
            LANGUAGES.map((language) => {
              const name = `${field}.${language}`;
              return (
                <Field
                  key={name}
                  name={name}
                  label={locationFieldLabel(name, copy)}
                  error={errors[name]}
                >
                  {(control) => (
                    <TextInput
                      {...control}
                      name={name}
                      autoComplete="off"
                      maxLength={TEXT_FIELDS[field]}
                      required={language === "uz" && field !== "directions"}
                      value={values[field][language]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setValues((current) => ({
                          ...current,
                          [field]: { ...current[field], [language]: value },
                        }));
                      }}
                    />
                  )}
                </Field>
              );
            }),
          )}
          <Field label={t.phone} name="phone" error={errors.phone}>
            {(control) => (
              <PhoneInput
                {...control}
                name="phone"
                value={values.phone}
                onValueChange={(phone) => setValues((current) => ({ ...current, phone }))}
              />
            )}
          </Field>
          {(Object.keys(COORDINATES) as Array<keyof typeof COORDINATES>).map((name) => (
            <Field
              key={name}
              label={t[name]}
              name={name}
              error={errors[name]}
              hint={t.example(COORDINATES[name])}
            >
              {(control) => (
                <TextInput
                  {...control}
                  name={name}
                  inputMode="decimal"
                  autoComplete="off"
                  value={coordinates[name]}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCoordinates((current) => ({ ...current, [name]: value }));
                  }}
                />
              )}
            </Field>
          ))}
        </div>
        <Field label={t.active} name="isActive" error={errors.isActive}>
          {(control) => (
            <Switch
              {...control}
              aria-label={t.active}
              checked={values.isActive}
              onCheckedChange={(isActive) => setValues((current) => ({ ...current, isActive }))}
            />
          )}
        </Field>
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button
            type="submit"
            busy={busy}
            disabledReason={!busy && !dirty && location !== null && t.noChanges}
          >
            <Icon name="check" size={18} />
            {busy ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
