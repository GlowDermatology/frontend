"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { specialistFormValues as toValues } from "@/data/api/mappers/clinic";
import { clinicSchemas } from "@/data/clinic.schema";
import { imageFileProblem, IMAGE_TYPES } from "@/data/products.schema";
import {
  specialistRecommendedToAsk,
  type ClinicLocation,
  type ClinicSpecialist,
} from "@/domain/clinic";
import type { ContentLanguage } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import type { PhotoAction, ProfileActions } from "./card-actions";
import { specialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";
import {
  experienceValue,
  firstTextErrorLanguage,
  PROFILE_FIELDS,
  type ClinicAccess,
  PROFILE_ORDER,
  profileFieldLabel,
  SpecialistProfileFields,
  specialistRecommendedFields,
} from "./profile-fields";

/**
 * Profile and photo of a specialist (contract §2.17 `PATCH specialists/{id}/`,
 * `PUT|DELETE …/photo/`). «Profilni e’lon qilish» stays off while the publish
 * checklist is not complete (the server also refuses with 409 and what is
 * missing). Unpublishing with appointments ahead is refused with the
 * server's count (409); «Baribir e’londan olish» repeats the save with
 * `force`, after which the appointments stay as they are.
 * Invalid fields are listed and the first one revealed (also in another
 * language's tab); an active profile without qualifications, bio or photo
 * asks "save anyway?". The writes come from `actions` (staff's `specialists/{id}/…` or the
 * specialist's own `specialist/profile/…`); `clinicAccess` decides whether the clinics are edited
 * here (staff) or only listed (the specialist).
 */
export function ProfileCard({
  specialist,
  clinics,
  onUpdated,
  actions,
  clinicAccess,
}: {
  specialist: ClinicSpecialist;
  clinics: ReadonlyArray<ClinicLocation>;
  onUpdated: (specialist: ClinicSpecialist) => void;
  actions: ProfileActions;
  clinicAccess: ClinicAccess;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.profile;
  const fmt = useFormat();
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [values, setValues] = useState(() => toValues(specialist));
  const [experience, setExperience] = useState(
    specialist.experienceYears === null ? "" : String(specialist.experienceYears),
  );
  const [language, setLanguage] = useState<ContentLanguage>("uz");
  const baseline = toValues(specialist);
  const current = { ...values, experienceYears: experienceValue(experience) };
  const dirty = JSON.stringify(current) !== JSON.stringify(baseline);
  if (specialist !== source) {
    setSource(specialist);
    if (!dirty) {
      setValues(toValues(specialist));
      setExperience(specialist.experienceYears === null ? "" : String(specialist.experienceYears));
    }
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const inFlight = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const reveal = useErrorReveal(cardRef);
  const recommended = useRecommendedConfirm();
  const idempotency = useIdempotencyKey();
  const summary = errorItems(errors, (name) => profileFieldLabel(name, copy), PROFILE_ORDER);

  const showErrors = (next: Record<string, string>, message: string | null) => {
    const failing = firstTextErrorLanguage(next);
    if (failing && !next[`qualifications.${language}`] && !next[`bio.${language}`]) {
      setLanguage(failing);
    }
    setErrors(next);
    setFormError(message);
    reveal();
  };

  const save = async (force: boolean) => {
    if (inFlight.current) return;
    const local = schemas.specialist.safeParse(current);
    if (!local.success) {
      showErrors(issuesToErrors(local.error), null);
      return;
    }
    inFlight.current = true;
    if (!force) {
      // Asked only when it is news: the save that makes the profile bookable (photo included),
      // a text just emptied; an inactive profile never asks.
      const missing = specialistRecommendedFields(
        specialistRecommendedToAsk(local.data, baseline, Boolean(specialist.photoUrl)),
        copy,
      );
      const remember = { kind: "specialist", id: specialist.id };
      if ((await recommended.confirm(missing, { remember })) === "fix") {
        inFlight.current = false;
        setLanguage("uz");
        await afterDialogsClose();
        reveal({ name: missing[0]!.name, shake: false });
        return;
      }
    }
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => actions.save(local.data, baseline, force, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      // Only an unpublish has a «do it anyway»; a refused publish lists what is missing.
      if (result.code === "conflict" && !force && baseline.isActive && !local.data.isActive) {
        setConflict(result.error);
        return;
      }
      setConflict(null);
      const split = partitionFieldErrors(result, PROFILE_FIELDS);
      showErrors(split.fieldErrors, split.formError);
      toast({
        tone: "danger",
        title: copy.saveFailed,
        description: split.formError ?? result.error,
      });
      return;
    }
    setConflict(null);
    onUpdated(result.data);
    setValues(toValues(result.data));
    setExperience(result.data.experienceYears === null ? "" : String(result.data.experienceYears));
    toast({ tone: "success", title: t.saved, description: result.data.name });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  return (
    <Card aria-labelledby="profile-title" className="flex flex-col gap-4">
      <div ref={cardRef} className="flex flex-col gap-4">
        <CardTitle id="profile-title" className="text-heading">
          {t.title}
        </CardTitle>
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => {
            const failing = firstTextErrorLanguage({ [name]: "x" });
            if (failing) setLanguage(failing);
            reveal({ name });
          }}
        />
        <PhotoField specialist={specialist} onUpdated={onUpdated} action={actions.photo} />
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <SpecialistProfileFields
            values={values}
            onChange={setValues}
            experience={experience}
            onExperienceChange={setExperience}
            errors={errors}
            clinics={clinics}
            clinicAccess={clinicAccess}
            publishBlocked={specialist.publishBlockers.length > 0 ? t.publishBlocked : null}
            activeHint={
              specialist.upcomingAppointments > 0
                ? t.inactiveHint(
                    specialist.upcomingAppointments,
                    fmt.number(specialist.upcomingAppointments),
                  )
                : t.activeHint
            }
            savedSlug={specialist.slug}
            language={language}
            onLanguageChange={setLanguage}
          />
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
            <Button type="submit" busy={busy} disabledReason={!busy && !dirty && copy.noChanges}>
              <Icon name="check" size={18} />
              {busy ? copy.saving : copy.save}
            </Button>
          </div>
        </form>
      </div>
      {recommended.dialog}

      <AlertDialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setConflict(null);
        }}
        title={t.conflictTitle}
        description={
          <span className="flex flex-col gap-2 text-[14px] leading-5 text-ink">
            <span>{conflict}</span>
            <span className="font-semibold">{t.conflictText}</span>
          </span>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={busy && copy.busyReason}>
              {copy.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={() => save(true)} busy={busy}>
            {busy ? copy.saving : t.force}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}

/**
 * The photo: picked and uploaded at once (JPEG/PNG/WebP ≤ 5 MB), or removed after a confirmation.
 * `action` is the route: staff's `specialists/{id}/photo/` or the specialist's own
 * `specialist/profile/photo/`.
 */
export function PhotoField({
  specialist,
  onUpdated,
  action: send,
}: {
  specialist: ClinicSpecialist;
  onUpdated: (specialist: ClinicSpecialist) => void;
  action: PhotoAction;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.photo;
  const locale = useAdminLocale();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const idempotency = useIdempotencyKey();
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const shown = preview ?? specialist.photoUrl ?? null;
  const fail = (message: string) => {
    setError(message);
    toast({ tone: "danger", title: t.failed, description: message });
  };

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    const problem = imageFileProblem(file, locale);
    if (problem) return fail(problem);
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.set("photo", file, file.name);
    const result = idempotency.settle(await runAction((csrf) => send(form, idempotency.key, csrf)));
    setBusy(false);
    if (!result.ok) return fail(result.fieldErrors?.photo ?? result.error);
    if (result.data) {
      // The demo stores no bytes (`photoUrl` ""): keep the local preview.
      if (!result.data.photoUrl) setPreview(URL.createObjectURL(file));
      else setPreview(null);
      onUpdated(result.data.photoUrl ? result.data : { ...result.data, photoUrl: null });
    }
    toast({ tone: "success", title: t.saved });
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    const result = idempotency.settle(await runAction((csrf) => send(null, idempotency.key, csrf)));
    setBusy(false);
    setConfirmRemove(false);
    if (!result.ok) return fail(result.error);
    setPreview(null);
    // The answer is a 204: the checklist gains «Rasm» as the server's next read would show.
    onUpdated({
      ...specialist,
      photoUrl: null,
      publishBlockers: specialist.publishBlockers.includes("photo")
        ? specialist.publishBlockers
        : [...specialist.publishBlockers, "photo"],
    });
    toast({ tone: "success", title: t.removed });
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-md"
      data-field="photo"
      data-invalid={error ? "true" : undefined}
      tabIndex={-1}
      aria-describedby={error ? "specialist-photo-error" : undefined}
    >
      <span className="text-label text-ink">{t.label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-ink-muted",
            error && "border-danger",
          )}
        >
          {shown ? (
            shown.startsWith("blob:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt={t.alt(specialist.name)} className="size-full object-cover" />
            ) : (
              <Image
                src={shown}
                alt={t.alt(specialist.name)}
                fill
                sizes="80px"
                className="object-cover"
              />
            )
          ) : (
            <Icon name="user" size={28} />
          )}
        </span>
        <span className="flex flex-col gap-2">
          <span className="flex flex-wrap gap-2">
            <Button
              variant="dashed"
              size="sm"
              busy={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" size={16} className="text-gold-ink" />
              {busy ? t.uploading : shown ? t.replace : t.upload}
            </Button>
            {shown && (
              <Button
                variant="ghost"
                size="sm"
                disabledReason={busy && t.busyReason}
                onClick={() => setConfirmRemove(true)}
              >
                <Icon name="trash" size={16} />
                {t.remove}
              </Button>
            )}
          </span>
          <span className="text-caption font-normal text-ink-muted">{t.hint}</span>
        </span>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p
          id="specialist-photo-error"
          role="alert"
          className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
        >
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          {error}
        </p>
      )}
      <AlertDialog
        open={confirmRemove}
        onOpenChange={(open) => {
          if (!busy) setConfirmRemove(open);
        }}
        title={t.removeTitle}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{t.removeText}</p>}
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={busy && t.busyReason}>
              {copy.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={remove} busy={busy}>
            {busy ? t.removing : t.remove}
          </Button>
        </div>
      </AlertDialog>
    </div>
  );
}
