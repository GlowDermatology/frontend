"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { setSpecialistPhoto, updateSpecialist } from "@/data/clinic.actions";
import { specialistFormSchema, type SpecialistFormValues } from "@/data/clinic.schema";
import {
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_TYPE_MESSAGE,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/data/products.schema";
import type { ClinicSpecialist } from "@/domain/clinic";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import {
  experienceValue,
  PROFILE_FIELDS,
  SpecialistProfileFields,
  type StaffOption,
} from "./profile-fields";

function toValues(specialist: ClinicSpecialist): SpecialistFormValues {
  const step = [10, 15, 20, 30, 60].includes(specialist.slotStepMin) ? specialist.slotStepMin : 30;
  return {
    name: specialist.name,
    role: specialist.role,
    qualifications: { ...specialist.qualifications },
    bio: { ...specialist.bio },
    experienceYears: specialist.experienceYears,
    slotStepMin: step as SpecialistFormValues["slotStepMin"],
    staffUserId: specialist.staffUser?.id ?? "",
    isActive: specialist.isActive,
  };
}

/**
 * Profile and photo of a specialist (contract §2.17 `PATCH specialists/{id}/`,
 * `PUT|DELETE …/photo/`). Switching «Faol» off with appointments ahead is
 * refused with the server's count (409); «Baribir nofaol qilish» repeats
 * the save with `force`, after which the appointments stay as they are.
 */
export function ProfileCard({
  specialist,
  staffOptions,
  onUpdated,
}: {
  specialist: ClinicSpecialist;
  staffOptions: ReadonlyArray<StaffOption>;
  onUpdated: (specialist: ClinicSpecialist) => void;
}) {
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [values, setValues] = useState(() => toValues(specialist));
  const [experience, setExperience] = useState(
    specialist.experienceYears === null ? "" : String(specialist.experienceYears),
  );
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
  const formRef = useRef<HTMLFormElement>(null);
  const idempotency = useIdempotencyKey();

  const save = async (force: boolean) => {
    if (inFlight.current) return;
    const local = specialistFormSchema.safeParse(current);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        updateSpecialist(specialist.id, local.data, baseline, force, idempotency.key, csrf),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      if (result.code === "conflict" && !force) {
        setConflict(result.error);
        return;
      }
      setConflict(null);
      const split = partitionFieldErrors(result, PROFILE_FIELDS);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      return;
    }
    setConflict(null);
    onUpdated(result.data);
    setValues(toValues(result.data));
    setExperience(result.data.experienceYears === null ? "" : String(result.data.experienceYears));
    toast({ title: "Profil saqlandi", description: result.data.name });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  return (
    <Card aria-labelledby="profile-title" className="flex flex-col gap-4">
      <CardTitle id="profile-title" className="text-heading">
        Profil
      </CardTitle>
      <PhotoField specialist={specialist} onUpdated={onUpdated} />
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <SpecialistProfileFields
          values={values}
          onChange={setValues}
          experience={experience}
          onExperienceChange={setExperience}
          errors={errors}
          staffOptions={staffOptions}
          linkedStaff={specialist.staffUser}
          activeHint={
            specialist.upcomingAppointments > 0
              ? `Nofaol mutaxassis ilovadan yo‘qoladi. ${specialist.upcomingAppointments} ta kelgusi qabul o‘zgarmaydi.`
              : "Faol mutaxassis ilovada ko‘rinadi va unga yozilish mumkin."
          }
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
          <Button type="submit" disabled={busy || !dirty} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setConflict(null);
        }}
        title="Mutaxassisni baribir nofaol qilasizmi?"
        description={
          <span className="flex flex-col gap-2 text-[14px] leading-5 text-ink">
            <span>{conflict}</span>
            <span className="font-semibold">
              Mutaxassis ilovadan va yozilish oynalaridan darhol yo‘qoladi; uning qabullari qabullar
              jadvalida qoladi.
            </span>
          </span>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button variant="destructive" onClick={() => save(true)} disabled={busy} aria-busy={busy}>
            {busy ? "Saqlanmoqda…" : "Baribir nofaol qilish"}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}

/** The photo: picked and uploaded at once (JPEG/PNG/WebP ≤ 5 MB), or removed after a confirmation. */
function PhotoField({
  specialist,
  onUpdated,
}: {
  specialist: ClinicSpecialist;
  onUpdated: (specialist: ClinicSpecialist) => void;
}) {
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

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    if (!(IMAGE_TYPES as ReadonlyArray<string>).includes(file.type))
      return setError(IMAGE_TYPE_MESSAGE);
    if (file.size > MAX_IMAGE_BYTES) return setError(IMAGE_TOO_LARGE_MESSAGE);
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.set("photo", file, file.name);
    const result = idempotency.settle(
      await runAction((csrf) => setSpecialistPhoto(specialist.id, form, idempotency.key, csrf)),
    );
    setBusy(false);
    if (!result.ok) return setError(result.fieldErrors?.photo ?? result.error);
    if (result.data) {
      // The demo stores no bytes (`photoUrl` ""): keep the local preview.
      if (!result.data.photoUrl) setPreview(URL.createObjectURL(file));
      else setPreview(null);
      onUpdated(result.data.photoUrl ? result.data : { ...result.data, photoUrl: null });
    }
    toast({ title: "Rasm saqlandi" });
  };

  const remove = async () => {
    setBusy(true);
    const result = idempotency.settle(
      await runAction((csrf) => setSpecialistPhoto(specialist.id, null, idempotency.key, csrf)),
    );
    setBusy(false);
    setConfirmRemove(false);
    if (!result.ok) return setError(result.error);
    setPreview(null);
    onUpdated({ ...specialist, photoUrl: null });
    toast({ title: "Rasm olib tashlandi" });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-ink">Rasm</span>
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
              <img
                src={shown}
                alt={`${specialist.name} rasmi`}
                className="size-full object-cover"
              />
            ) : (
              <Image
                src={shown}
                alt={`${specialist.name} rasmi`}
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
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className={buttonStyles({ variant: "dashed", size: "sm" })}
            >
              <Icon name="upload" size={16} className="text-gold-ink" />
              {busy ? "Yuklanmoqda…" : shown ? "Rasmni almashtirish" : "Rasm yuklash"}
            </button>
            {shown && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <Icon name="trash" size={16} />
                Olib tashlash
              </button>
            )}
          </span>
          <span className="text-caption font-normal text-ink-muted">
            JPEG, PNG yoki WebP, 5 MB gacha · darhol saqlanadi
          </span>
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
        title="Rasmni olib tashlaysizmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Rasm ilovadan ham yo‘qoladi. Bu amalni qaytarib bo‘lmaydi: kerak bo‘lsa, rasmni qayta
            yuklang.
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button variant="destructive" onClick={remove} disabled={busy} aria-busy={busy}>
            Olib tashlash
          </Button>
        </div>
      </AlertDialog>
    </div>
  );
}
