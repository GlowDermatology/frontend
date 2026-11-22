"use client";

import { useId } from "react";

import { Badge } from "@/components/ui/badge";
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

/** The profile's field names that have a place on the form (for `partitionFieldErrors`). */
export const PROFILE_FIELDS = [
  "name",
  "role",
  "experienceYears",
  "slotStepMin",
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

/**
 * Who sets the clinics: `edit` — staff assign them (a `Switch` per clinic) and pick the primary;
 * `read` — the specialist sees the assigned clinics only (staff assign them).
 */
export type ClinicAccess = "edit" | "read";

interface ProfileFieldsProps {
  values: SpecialistFormValues;
  onChange: (values: SpecialistFormValues) => void;
  /** The experience input as typed (a number field may hold `""`). */
  experience: string;
  onExperienceChange: (value: string) => void;
  errors: Record<string, string>;
  clinics: ReadonlyArray<ClinicLocation>;
  clinicAccess: ClinicAccess;
  /** Hint under the publish switch. */
  activeHint: string;
  /**
   * Why the profile cannot be published yet (the checklist is not complete); only refuses
   * switching it on — an already published profile can always be unpublished.
   */
  publishBlocked?: string | null;
  /** The stored website slug; `null` while creating (derived from the name on save). */
  savedSlug: string | null;
  /** The content language whose qualifications and bio are shown (the parent switches it to an error). */
  language: ContentLanguage;
  onLanguageChange: (language: ContentLanguage) => void;
}

/**
 * The specialist's profile fields (contract §2.17 `ClinicSpecialist`): the
 * public name, category, experience, the customer slot grid, the clinics
 * (a draft may have none: switching on the first one makes it the primary;
 * `clinicAccess="read"` only lists them), the
 * publish flag, and the qualifications and bio per language. The owner
 * account is not edited here (it is managed on «Xodimlar»). The parent owns
 * submit and the shown language (so an error in another language's text can
 * be revealed).
 */
export function SpecialistProfileFields({
  values,
  onChange,
  experience,
  onExperienceChange,
  errors,
  clinics,
  clinicAccess,
  activeHint,
  publishBlocked,
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
        <Field label={t.name} name="name" error={errors.name} hint={t.nameHint}>
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
              placeholder={t.rolePlaceholder}
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

      {clinicAccess === "edit" ? (
        <>
          <fieldset
            data-field="locationIds"
            data-invalid={errors.locationIds ? "true" : undefined}
            aria-describedby={errors.locationIds ? `${idBase}-clinics-error` : undefined}
            className="m-0 flex flex-col gap-2 rounded-md border border-line p-3"
          >
            <legend className="px-1 text-label text-ink">{location.assigned}</legend>
            {assignable.map((clinic) => {
              const name = clinicText(clinic.name, locale);
              return (
                <div
                  key={clinic.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface p-2 text-body-sm"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold text-ink">
                      {name}
                      {!clinic.isActive && ` · ${m.status.inactive}`}
                    </span>
                    <span className="text-ink-muted">{clinicText(clinic.address, locale)}</span>
                  </span>
                  <Switch
                    checked={values.locationIds.includes(clinic.id)}
                    onCheckedChange={(checked) => toggleClinic(clinic.id, checked)}
                    aria-label={location.assignSwitch(name)}
                    aria-invalid={errors.locationIds ? true : undefined}
                  />
                </div>
              );
            })}
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
        </>
      ) : (
        <section
          aria-labelledby={`${idBase}-clinics-title`}
          className="flex flex-col gap-2 rounded-md border border-line p-3"
        >
          <h3 id={`${idBase}-clinics-title`} className="m-0 px-1 text-label text-ink">
            {location.assigned}
          </h3>
          {assigned.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {[...assigned]
                .sort(
                  (a, b) => Number(b.id === values.locationId) - Number(a.id === values.locationId),
                )
                .map((clinic) => (
                  <li
                    key={clinic.id}
                    className="flex items-start justify-between gap-3 rounded-md bg-surface p-2 text-body-sm"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold text-ink">
                        {clinicText(clinic.name, locale)}
                        {!clinic.isActive && ` · ${m.status.inactive}`}
                      </span>
                      <span className="text-ink-muted">{clinicText(clinic.address, locale)}</span>
                    </span>
                    {clinic.id === values.locationId && (
                      <Badge tone="neutral" dot={false}>
                        {location.primaryBadge}
                      </Badge>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="m-0 rounded-md bg-surface p-2 text-body-sm text-ink-muted">
              {location.noneAssigned}
            </p>
          )}
          <p className="m-0 px-1 text-caption font-normal text-ink-muted">
            {location.readOnlyHint}
          </p>
        </section>
      )}
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
          disabledReason={!values.isActive && publishBlocked ? publishBlocked : null}
        />
      </div>
    </div>
  );
}

/** The experience input → the form value (`""` → `null`). */
export function experienceValue(input: string): number | null {
  return input.trim() === "" ? null : Number(input);
}
