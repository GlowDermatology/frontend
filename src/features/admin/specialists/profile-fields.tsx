"use client";

import { useId } from "react";

import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SpecialistFormValues } from "@/data/clinic.schema";
import {
  clinicText,
  EXPERIENCE_MAX,
  NAME_MAX,
  SLOT_STEPS,
  SPECIALIST_ROLES,
  TEXT_MAX,
  type ClinicLocation,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { slugifyName, SPECIALIST_SLUG_MAX } from "@/domain/seo";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { clinicOptions } from "../clinics/options";
import { LanguageTabs } from "../products/language-tabs";
import { SlugField } from "../shared/seo-fields";
import { specialistsCopy, type SpecialistsCopy } from "./copy";

export const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

export interface StaffOption {
  id: string;
  name: string;
  role?: "admin" | "specialist" | null;
}

/** The profile's field names that have a place on the form (for `partitionFieldErrors`). */
export const PROFILE_FIELDS = [
  "name",
  "role",
  "experienceYears",
  "slotStepMin",
  "staffUserId",
  "locationIds",
  "locationId",
  "isActive",
  "slug",
  ...LANGUAGES.flatMap((l) => [`qualifications.${l}`, `bio.${l}`]),
];

/** The form order of the profile's fields (the error summary follows it). */
export const PROFILE_ORDER = [
  "name",
  "role",
  "experienceYears",
  "slotStepMin",
  "staffUserId",
  "locationIds",
  "locationId",
  "slug",
  ...LANGUAGES.flatMap((l) => [`qualifications.${l}`, `bio.${l}`]),
  "isActive",
];

/** The summary label of a profile field ("Malakasi (ruscha)" for `qualifications.ru`). */
export function profileFieldLabel(name: string, t: SpecialistsCopy): string | undefined {
  const p = t.profile;
  const [field, language] = name.split(".") as [string, ContentLanguage | undefined];
  if ((field === "qualifications" || field === "bio") && language && language in p.language) {
    return p.inLanguage(field === "bio" ? p.bio : p.qualifications, p.language[language]);
  }
  const labels: Record<string, string> = {
    name: p.name,
    role: p.role,
    experienceYears: p.experience,
    slotStepMin: p.slotStep,
    staffUserId: p.staff,
    locationIds: t.location.assigned,
    locationId: t.location.primary,
    slug: p.slug,
    isActive: p.active,
    photo: p.photo,
  };
  return labels[field];
}

/** The "save anyway?" rows of the specialist's empty recommended fields. */
export function specialistRecommendedFields(
  missing: ReadonlyArray<"qualifications.uz" | "bio.uz" | "photo">,
  t: SpecialistsCopy,
): Array<{ name: string; label: string }> {
  const label = {
    "qualifications.uz": t.recommended.qualifications,
    "bio.uz": t.recommended.bio,
    photo: t.recommended.photo,
  } as const;
  return missing.map((name) => ({ name, label: label[name] }));
}

/** The first content language whose qualifications or bio hold an error (to show its tab). */
export function firstTextErrorLanguage(
  errors: Readonly<Record<string, string>>,
): ContentLanguage | null {
  return (
    LANGUAGES.find(
      (language) => errors[`qualifications.${language}`] || errors[`bio.${language}`],
    ) ?? null
  );
}

interface ProfileFieldsProps {
  values: SpecialistFormValues;
  onChange: (values: SpecialistFormValues) => void;
  /** The experience input as typed (a number field may hold `""`). */
  experience: string;
  onExperienceChange: (value: string) => void;
  errors: Record<string, string>;
  staffOptions: ReadonlyArray<StaffOption>;
  clinics: ReadonlyArray<ClinicLocation>;
  /** The account linked now, shown even when it is no longer in the options (deactivated). */
  linkedStaff: StaffOption | null;
  /** Hint under the active switch. */
  activeHint: string;
  /** The stored website slug; `null` while creating (derived from the name on save). */
  savedSlug: string | null;
  /** The content language whose qualifications and bio are shown (the parent switches it to an error). */
  language: ContentLanguage;
  onLanguageChange: (language: ContentLanguage) => void;
}

/**
 * The specialist's profile fields (contract §2.17 `ClinicSpecialist`): name,
 * category, experience, the customer slot grid, the linked staff account,
 * the active flag, and the qualifications and bio per language. Shared by
 * the create dialog and the detail page; the parent owns submit and the
 * shown language (so an error in another language's text can be revealed).
 */
export function SpecialistProfileFields({
  values,
  onChange,
  experience,
  onExperienceChange,
  errors,
  staffOptions,
  clinics,
  linkedStaff,
  activeHint,
  savedSlug,
  language,
  onLanguageChange,
}: ProfileFieldsProps) {
  const { profile: t, location } = useCopy(specialistsCopy);
  const locale = useAdminLocale();
  const m = useCopy(clinicDataCopy);
  const idBase = useId();
  const set = <K extends keyof SpecialistFormValues>(key: K, value: SpecialistFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const linkedMissing = linkedStaff && !staffOptions.some((o) => o.id === linkedStaff.id);
  const assigned = clinics.filter((clinic) => values.locationIds.includes(clinic.id));
  const assignable = clinics.filter(
    (clinic) => clinic.isActive || values.locationIds.includes(clinic.id),
  );
  const toggleClinic = (id: string, checked: boolean) => {
    const locationIds = checked
      ? [...values.locationIds, id]
      : values.locationIds.filter((value) => value !== id);
    const locationId = locationIds.includes(values.locationId)
      ? values.locationId
      : (clinics.find((clinic) => clinic.isActive && locationIds.includes(clinic.id))?.id ??
        locationIds[0] ??
        "");
    onChange({ ...values, locationId, locationIds });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.name} name="name" error={errors.name}>
          {(c) => (
            <TextInput
              {...c}
              name="name"
              autoComplete="off"
              maxLength={NAME_MAX}
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
            />
          )}
        </Field>
        <Field label={t.role} name="role" error={errors.role}>
          {(c) => (
            <Select<SpecialistFormValues["role"]>
              {...c}
              name="role"
              value={values.role}
              onValueChange={(role) => set("role", role)}
              options={SPECIALIST_ROLES.map((role) => ({ value: role, label: m.role[role] }))}
            />
          )}
        </Field>
        <Field
          label={t.experience}
          name="experienceYears"
          error={errors.experienceYears}
          hint={t.experienceHint}
        >
          {(c) => (
            <TextInput
              {...c}
              name="experienceYears"
              inputMode="numeric"
              autoComplete="off"
              value={experience}
              onChange={(event) =>
                onExperienceChange(event.target.value.replace(/\D/g, "").slice(0, 2))
              }
              placeholder={`0–${EXPERIENCE_MAX}`}
            />
          )}
        </Field>
        <Field
          label={t.slotStep}
          name="slotStepMin"
          error={errors.slotStepMin}
          hint={t.slotStepHint}
        >
          {(c) => (
            <Select<string>
              {...c}
              name="slotStepMin"
              value={String(values.slotStepMin)}
              onValueChange={(step) =>
                set("slotStepMin", Number(step) as SpecialistFormValues["slotStepMin"])
              }
              options={SLOT_STEPS.map((step) => ({
                value: String(step),
                label: t.slotStepOption(step),
              }))}
            />
          )}
        </Field>
        {linkedStaff?.role === "specialist" ? (
          <p className="sm:col-span-2">
            <strong>{t.staff}</strong> · {linkedStaff.name}
          </p>
        ) : (
          <Field
            label={t.staff}
            name="staffUserId"
            error={errors.staffUserId}
            hint={t.staffHint}
            className="sm:col-span-2"
          >
            {(c) => (
              <Select<string>
                {...c}
                name="staffUserId"
                value={values.staffUserId}
                onValueChange={(id) => set("staffUserId", id)}
                options={[
                  { value: "", label: t.staffNone },
                  ...(linkedMissing && linkedStaff
                    ? [
                        {
                          value: linkedStaff.id,
                          label: linkedStaff.name,
                          description: t.staffInactive,
                        },
                      ]
                    : []),
                  ...staffOptions.map((option) => ({ value: option.id, label: option.name })),
                ]}
              />
            )}
          </Field>
        )}
      </div>

      <div data-field="slug" data-invalid={errors.slug ? "true" : undefined}>
        <SlugField
          kind="specialist"
          name="slug"
          value={values.slug}
          onChange={(slug) => set("slug", slug)}
          error={errors.slug}
          max={SPECIALIST_SLUG_MAX}
          suggestion={slugifyName(values.name, SPECIALIST_SLUG_MAX)}
          saved={savedSlug || null}
        />
      </div>

      <fieldset
        data-field="locationIds"
        data-invalid={errors.locationIds ? "true" : undefined}
        aria-describedby={errors.locationIds ? `${idBase}-clinics-error` : undefined}
        className="m-0 flex flex-col gap-2 rounded-md border border-line p-3"
      >
        <legend className="px-1 text-label text-ink">{location.assigned}</legend>
        {assignable.map((clinic) => (
          <label
            key={clinic.id}
            className="flex items-start gap-2 rounded-md bg-surface p-2 text-body-sm"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-gold-ink"
              checked={values.locationIds.includes(clinic.id)}
              onChange={(event) => toggleClinic(clinic.id, event.target.checked)}
              aria-invalid={errors.locationIds ? true : undefined}
            />
            <span className="flex flex-col">
              <span className="font-semibold text-ink">
                {clinicText(clinic.name, locale)}
                {!clinic.isActive && ` · ${m.status.inactive}`}
              </span>
              <span className="text-ink-muted">{clinicText(clinic.address, locale)}</span>
            </span>
          </label>
        ))}
        {errors.locationIds && (
          <p id={`${idBase}-clinics-error`} className="m-0 text-body-sm text-danger">
            {errors.locationIds}
          </p>
        )}
      </fieldset>
      <Field label={location.primary} name="locationId" error={errors.locationId}>
        {(control) => (
          <Select
            {...control}
            value={values.locationId}
            onValueChange={(id) => set("locationId", id)}
            options={clinicOptions(assigned, locale)}
            placeholder={location.placeholder}
            disabledReason={assigned.length === 0 && location.placeholder}
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">{t.texts}</span>
        <LanguageTabs
          languages={LANGUAGES}
          value={language}
          onChange={onLanguageChange}
          complete={{
            uz: Boolean(values.qualifications.uz.trim()),
            ru: Boolean(values.qualifications.ru.trim()),
            en: Boolean(values.qualifications.en.trim()),
          }}
          invalid={{
            uz: Boolean(errors["qualifications.uz"] || errors["bio.uz"]),
            ru: Boolean(errors["qualifications.ru"] || errors["bio.ru"]),
            en: Boolean(errors["qualifications.en"] || errors["bio.en"]),
          }}
          idBase={idBase}
        />
        <div
          role="tabpanel"
          id={`${idBase}-panel`}
          aria-labelledby={`${idBase}-tab-${language}`}
          data-lang={language}
          className="flex flex-col gap-3"
        >
          <Field
            label={t.qualifications}
            name={`qualifications.${language}`}
            error={errors[`qualifications.${language}`]}
            hint={t.qualificationsHint}
          >
            {(c) => (
              <TextArea
                {...c}
                name={`qualifications.${language}`}
                rows={3}
                maxLength={TEXT_MAX}
                value={values.qualifications[language]}
                onChange={(event) =>
                  set("qualifications", {
                    ...values.qualifications,
                    [language]: event.target.value,
                  })
                }
              />
            )}
          </Field>
          <Field label={t.bio} name={`bio.${language}`} error={errors[`bio.${language}`]}>
            {(c) => (
              <TextArea
                {...c}
                name={`bio.${language}`}
                rows={3}
                maxLength={TEXT_MAX}
                value={values.bio[language]}
                onChange={(event) => set("bio", { ...values.bio, [language]: event.target.value })}
              />
            )}
          </Field>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3"
        data-field="isActive"
        data-invalid={errors.isActive ? "true" : undefined}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-label text-ink">{t.active}</span>
          <span className="text-caption font-normal text-ink-muted">{activeHint}</span>
          {errors.isActive && (
            <span role="alert" className="text-body-sm font-semibold text-danger">
              {errors.isActive}
            </span>
          )}
        </span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => set("isActive", checked)}
          aria-label={t.activeSwitch}
        />
      </div>
    </div>
  );
}

/** The experience input → the form value (`""` → `null`). */
export function experienceValue(input: string): number | null {
  return input.trim() === "" ? null : Number(input);
}
