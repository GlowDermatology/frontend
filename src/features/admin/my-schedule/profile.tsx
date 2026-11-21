"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { setMyProfilePhoto, updateMyProfile } from "@/data/specialist.actions";
import { NAME_MAX, NAME_MIN, TEXT_MAX, type ClinicSpecialist, type I18n } from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useCopy } from "@/lib/i18n/admin-context";

import { LanguageTabs } from "../products/language-tabs";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { PhotoField } from "../specialists/profile-card";
import { LANGUAGES } from "../specialists/profile-fields";
import { PublishChecklist } from "../specialists/publish-cards";
import { myScheduleCopy } from "./copy";

/** What the specialist may change: the public name and the bio (only changed languages are sent). */
export function ownProfileChanges(
  saved: { name: string; bio: I18n },
  values: { name: string; bio: I18n },
): { name?: string; bio?: Partial<I18n> } {
  const changes: { name?: string; bio?: Partial<I18n> } = {};
  if (values.name.trim() !== saved.name.trim()) changes.name = values.name.trim();
  const bio: Partial<I18n> = {};
  for (const language of LANGUAGES) {
    if (values.bio[language].trim() !== saved.bio[language].trim()) {
      bio[language] = values.bio[language].trim();
    }
  }
  if (Object.keys(bio).length > 0) changes.bio = bio;
  return changes;
}

/**
 * My Schedule → My profile: the specialist completes their public name, photo and bio; the draft /
 * published status and the publish checklist are shown read-only (staff publish). Discipline,
 * clinics and services stay with staff.
 */
export function MyProfile({ profile }: { profile: ClinicSpecialist }) {
  const t = useCopy(myScheduleCopy);
  const p = t.profile;
  const toast = useToast();
  const idBase = useId();
  const [saved, setSaved] = useState(profile);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState<I18n>({ ...profile.bio });
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const changes = ownProfileChanges(saved, { name, bio });
  const dirty = Object.keys(changes).length > 0;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || !dirty) return;
    if (changes.name !== undefined && changes.name.length < NAME_MIN) {
      setNameError(p.nameMin);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setNameError(null);
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => updateMyProfile(changes, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      setNameError(result.fieldErrors?.name ?? null);
      setFormError(result.fieldErrors?.name ? null : result.error);
      toast({ tone: "danger", title: p.saveFailed, description: result.error });
      return;
    }
    setSaved(result.data);
    setName(result.data.name);
    setBio({ ...result.data.bio });
    toast({ tone: "success", title: p.saved });
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-serif text-display">{t.myProfile}</h1>
          {saved.isActive ? (
            <Badge tone="success">{p.published}</Badge>
          ) : (
            <Badge tone="muted">{p.draft}</Badge>
          )}
        </div>
        <p className="m-0 max-w-[720px] text-body-sm text-ink-muted">{p.lead}</p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Card
          aria-labelledby="my-profile-title"
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4"
        >
          <CardTitle id="my-profile-title" className="text-heading">
            {saved.name || t.myProfile}
          </CardTitle>
          <PhotoField
            specialist={saved}
            onUpdated={setSaved}
            action={(form, key, csrf) => setMyProfilePhoto(form, key, csrf)}
          />
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label={p.name} name="name" error={nameError ?? undefined} hint={p.nameHint}>
              {(c) => (
                <TextInput
                  {...c}
                  name="name"
                  autoComplete="off"
                  maxLength={NAME_MAX}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-label text-ink">{p.bio}</span>
              <LanguageTabs
                languages={LANGUAGES}
                value={language}
                onChange={setLanguage}
                complete={{
                  uz: Boolean(bio.uz.trim()),
                  ru: Boolean(bio.ru.trim()),
                  en: Boolean(bio.en.trim()),
                }}
                invalid={{ uz: false, ru: false, en: false }}
                idBase={idBase}
              />
              <div
                role="tabpanel"
                id={`${idBase}-panel`}
                aria-labelledby={`${idBase}-tab-${language}`}
                data-lang={language}
              >
                <Field label={p.bio} name={`bio.${language}`} hint={p.bioHint}>
                  {(c) => (
                    <TextArea
                      {...c}
                      name={`bio.${language}`}
                      rows={5}
                      maxLength={TEXT_MAX}
                      value={bio[language]}
                      onChange={(event) => setBio({ ...bio, [language]: event.target.value })}
                    />
                  )}
                </Field>
              </div>
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
              <Button type="submit" busy={busy} disabledReason={!busy && !dirty && p.noChanges}>
                <Icon name="check" size={18} />
                {busy ? p.saving : p.save}
              </Button>
            </div>
          </form>
        </Card>
        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <PublishChecklist specialist={saved} titleId="my-publish-title" readyText={p.ready} />
          <p className="m-0 flex items-start gap-2 text-body-sm text-ink-muted">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
            {p.managedByStaff}
          </p>
        </div>
      </div>
    </>
  );
}
