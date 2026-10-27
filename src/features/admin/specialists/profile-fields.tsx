"use client";

import { useId, useState } from "react";

import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { SpecialistFormValues } from "@/data/clinic.schema";
import {
  EXPERIENCE_MAX,
  NAME_MAX,
  SLOT_STEPS,
  SPECIALIST_ROLE_LABEL,
  SPECIALIST_ROLES,
  TEXT_MAX,
} from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";

import { LanguageTabs } from "../products/language-tabs";

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

export interface StaffOption {
  id: string;
  name: string;
}

/** The profile's field names that have a place on the form (for `partitionFieldErrors`). */
export const PROFILE_FIELDS = [
  "name",
  "role",
  "experienceYears",
  "slotStepMin",
  "staffUserId",
  "isActive",
  ...LANGUAGES.flatMap((l) => [`qualifications.${l}`, `bio.${l}`]),
];

interface ProfileFieldsProps {
  values: SpecialistFormValues;
  onChange: (values: SpecialistFormValues) => void;
  /** The experience input as typed (a number field may hold `""`). */
  experience: string;
  onExperienceChange: (value: string) => void;
  errors: Record<string, string>;
  staffOptions: ReadonlyArray<StaffOption>;
  /** The account linked now, shown even when it is no longer in the options (deactivated). */
  linkedStaff: StaffOption | null;
  /** Hint under the active switch. */
  activeHint: string;
}

/**
 * The specialist's profile fields (contract §2.17 `ClinicSpecialist`): name,
 * category, experience, the customer slot grid, the linked staff account,
 * the active flag, and the qualifications and bio per language. Shared by
 * the create dialog and the detail page; the parent owns submit.
 */
export function SpecialistProfileFields({
  values,
  onChange,
  experience,
  onExperienceChange,
  errors,
  staffOptions,
  linkedStaff,
  activeHint,
}: ProfileFieldsProps) {
  const idBase = useId();
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const set = <K extends keyof SpecialistFormValues>(key: K, value: SpecialistFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const options =
    linkedStaff && !staffOptions.some((o) => o.id === linkedStaff.id)
      ? [linkedStaff, ...staffOptions]
      : staffOptions;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ism familiya" error={errors.name}>
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
        <Field label="Mutaxassislik" error={errors.role}>
          {(c) => (
            <Select
              {...c}
              name="role"
              value={values.role}
              onChange={(event) => set("role", event.target.value as SpecialistFormValues["role"])}
            >
              {SPECIALIST_ROLES.map((role) => (
                <option key={role} value={role}>
                  {SPECIALIST_ROLE_LABEL[role]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tajriba (yil)" error={errors.experienceYears} hint="Bo‘sh qoldirish mumkin.">
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
          label="Yozilish qadami"
          error={errors.slotStepMin}
          hint="Ilovada bo‘sh vaqtlar shu oraliqda ko‘rsatiladi."
        >
          {(c) => (
            <Select
              {...c}
              name="slotStepMin"
              value={String(values.slotStepMin)}
              onChange={(event) =>
                set(
                  "slotStepMin",
                  Number(event.target.value) as SpecialistFormValues["slotStepMin"],
                )
              }
            >
              {SLOT_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step} daqiqa
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Bog‘langan xodim hisobi"
          error={errors.staffUserId}
          hint="Ixtiyoriy: mutaxassis o‘zi admin panelga kirsa."
          className="sm:col-span-2"
        >
          {(c) => (
            <Select
              {...c}
              name="staffUserId"
              value={values.staffUserId}
              onChange={(event) => set("staffUserId", event.target.value)}
            >
              <option value="">Bog‘lanmagan</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">Malaka va tavsif</span>
        <LanguageTabs
          languages={LANGUAGES}
          value={language}
          onChange={setLanguage}
          complete={{
            uz: Boolean(values.qualifications.uz.trim()),
            ru: Boolean(values.qualifications.ru.trim()),
            en: Boolean(values.qualifications.en.trim()),
          }}
          idBase={idBase}
        />
        <div
          role="tabpanel"
          id={`${idBase}-panel`}
          aria-labelledby={`${idBase}-tab-${language}`}
          className="flex flex-col gap-3"
        >
          <Field
            label="Malakasi"
            error={errors[`qualifications.${language}`]}
            hint="Ilovada mutaxassis kartasida: ta’lim, sertifikatlar, yo‘nalishlar."
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
          <Field label="Qisqacha ma’lumot" error={errors[`bio.${language}`]}>
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

      <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-label text-ink">Faol</span>
          <span className="text-caption font-normal text-ink-muted">{activeHint}</span>
        </span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => set("isActive", checked)}
          aria-label="Mutaxassis faol"
        />
      </div>
    </div>
  );
}

/** The experience input → the form value (`""` → `null`). */
export function experienceValue(input: string): number | null {
  return input.trim() === "" ? null : Number(input);
}
