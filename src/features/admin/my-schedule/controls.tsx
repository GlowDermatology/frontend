"use client";

import { useState, useTransition, type ReactNode } from "react";

import { updateMySchedule } from "@/data/specialist.actions";
import type { SpecialistAvailability } from "@/data/specialist";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { myScheduleCopy } from "./copy";

export const inputClass =
  "min-h-10 w-full min-w-0 rounded-md border border-line bg-surface-raised px-2.5 text-body-sm text-ink";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-caption font-semibold text-ink-muted">
      {label}
      {children}
    </label>
  );
}

export function ClinicSelect({
  clinics,
  defaultValue,
  onChange,
  extra,
}: {
  clinics: SpecialistAvailability["clinics"];
  defaultValue?: string;
  onChange?: (clinic: string) => void;
  extra?: { id: number; name: string };
}) {
  const t = useCopy(myScheduleCopy);
  return (
    <Field label={t.clinic}>
      <select
        name="clinic"
        required
        className={inputClass}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {extra && !clinics.some((clinic) => clinic.id === extra.id) && (
          <option value={extra.id}>{extra.name}</option>
        )}
        {clinics.map((clinic) => (
          <option key={clinic.id} value={clinic.id}>
            {clinic.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function useScheduleMutation() {
  const t = useCopy(myScheduleCopy);
  const idempotency = useIdempotencyKey();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const submit = (operation: Parameters<typeof updateMySchedule>[0], after?: () => void) => {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = idempotency.settle(
        await runAction((csrf) => updateMySchedule(operation, idempotency.key, csrf)),
      );
      if (result.ok) {
        setMessage({ text: t.saved });
        after?.();
      } else {
        setMessage({
          text: Object.values(result.fieldErrors ?? {}).join(" · ") || result.error,
          error: true,
        });
      }
    });
  };
  return { pending, message, submit };
}

export function MutationMessage({
  message,
}: {
  message: ReturnType<typeof useScheduleMutation>["message"];
}) {
  if (!message) return null;
  return (
    <p role={message.error ? "alert" : "status"} className="m-0 text-body-sm text-ink">
      {message.text}
    </p>
  );
}

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const tashkentDateTime = (value: string) => value + ":00+05:00";
