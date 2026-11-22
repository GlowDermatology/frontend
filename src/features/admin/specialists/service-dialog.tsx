"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AffixInput, Field, TextArea, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  clinicSchemas,
  EMPTY_SPECIALIST_SERVICE,
  type SpecialistServiceFormValues,
} from "@/data/clinic.schema";
import {
  SERVICE_CATEGORIES,
  SERVICE_NAME_MAX,
  SERVICE_SHORT_MAX,
  serviceRecommendedToAsk,
  TEXT_MAX,
  type SpecialistService,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose } from "../products/form-reveal";
import { LanguageTabs } from "../products/language-tabs";
import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import type { ServiceActions } from "./card-actions";
import { errorItems, issuesToErrors } from "./form-kit";
import { FormError } from "./schedule-cards";
import { servicesCardCopy, type ServicesCardCopy } from "./services-copy";

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];
const TEXT_KEYS = ["name", "shortName", "description"] as const;

/** The dialog's fields in form order (summary order; server errors elsewhere go to the form line). */
export const SERVICE_FIELDS: ReadonlyArray<string> = [
  ...LANGUAGES.flatMap((l) => TEXT_KEYS.map((k) => `${k}.${l}`)),
  "category",
  "price",
  "durationMin",
  "isActive",
];

/** The form values of `service` (a copy), or a new service's. */
export function serviceFormValues(service: SpecialistService | null): SpecialistServiceFormValues {
  if (!service) return structuredClone(EMPTY_SPECIALIST_SERVICE);
  return {
    name: { ...service.name },
    shortName: { ...service.shortName },
    description: { ...service.description },
    category: service.category,
    price: service.price,
    durationMin: service.durationMin,
    isActive: service.isActive,
  };
}

/** The summary label of a dialog field ("Nomi (ruscha)" for `name.ru`). */
export function serviceFieldLabel(name: string, t: ServicesCardCopy): string | undefined {
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
      price: d.price,
      durationMin: d.duration,
      isActive: d.active,
    } as Record<string, string>
  )[field];
}

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

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

/**
 * Create or edit one of a specialist's own services through `actions.save`: names, short names
 * and descriptions per content language, the category, the price in so‘m (0 = free) and the
 * duration. Saves answer the specialist's whole service list (`onSaved`). Mount it with a new
 * `key` per opening so the form starts from `service`.
 */
export function ServiceDialog({
  open,
  service,
  actions,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** `null` = a new service. */
  service: SpecialistService | null;
  actions: Pick<ServiceActions, "save">;
  onOpenChange: (open: boolean) => void;
  onSaved: (services: SpecialistService[], created: boolean) => void;
}) {
  const copy = useCopy(servicesCardCopy);
  const t = copy.dialog;
  const m = useCopy(clinicDataCopy);
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const idBase = useId();
  const idempotency = useIdempotencyKey();
  const baseline = serviceFormValues(service);
  const [values, setValues] = useState(baseline);
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [duration, setDuration] = useState(String(baseline.durationMin));
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const recommended = useRecommendedConfirm();
  const summary = errorItems(errors, (name) => serviceFieldLabel(name, copy), SERVICE_FIELDS);

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
    const local = schemas.specialistService.safeParse({
      ...values,
      price: price.trim() === "" ? Number.NaN : Number(price),
      durationMin: duration.trim() === "" ? Number.NaN : Number(duration),
    });
    if (!local.success) return show(issuesToErrors(local.error), null);
    inFlight.current = true;
    // Asked only when it is news: a create, the save that activates, a field just emptied.
    const missing = serviceRecommendedToAsk(local.data, service ? baseline : null).map((name) => ({
      name,
      label: serviceFieldLabel(name, copy) ?? name,
    }));
    const remember = service ? { kind: "specialist-service", id: service.id } : null;
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
        actions.save(
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
      const split = partitionFieldErrors(result, SERVICE_FIELDS);
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
              <Select<SpecialistServiceFormValues["category"]>
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
          <Field label={t.price} name="price" error={errors.price} hint={t.priceHint}>
            {(c) => (
              <AffixInput
                {...c}
                suffix={t.currency}
                inputMode="numeric"
                autoComplete="off"
                value={price}
                onChange={(event) => setPrice(digits(event.target.value, 9))}
              />
            )}
          </Field>
          <Field
            label={t.duration}
            name="durationMin"
            error={errors.durationMin}
            hint={t.durationHint}
          >
            {(c) => (
              <AffixInput
                {...c}
                suffix={t.minutes}
                inputMode="numeric"
                autoComplete="off"
                value={duration}
                onChange={(event) => setDuration(digits(event.target.value, 3))}
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
        <FormError message={formError} />
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
