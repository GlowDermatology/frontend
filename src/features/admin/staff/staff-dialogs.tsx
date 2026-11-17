"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { inviteStaff, resetStaffPassword, updateStaff } from "@/data/staff.actions";
import { EMAIL_MAX, staffSchemas } from "@/data/staff.schema";
import {
  STAFF_FULL_NAME_MAX,
  type StaffAccountRow,
  type StaffCredentials,
  type StaffPasswordDelivery,
} from "@/domain/staff";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import type { useIdempotencyKey } from "../shared/idempotency";
import { staffCopy } from "./copy";
import { DeliveryChoice } from "./delivery-choice";

type Idempotency = ReturnType<typeof useIdempotencyKey>;
type Errors = Record<string, string>;

/** First message per top-level field of a failed zod parse. */
function issuesToErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): Errors {
  const out: Errors = {};
  for (const issue of issues) out[String(issue.path[0] ?? "")] ??= issue.message;
  return out;
}

/** The default delivery: a temporary password always works; e-mail only with the capability. */
export function defaultDelivery(emailInvite: boolean): StaffPasswordDelivery {
  return emailInvite ? "both" : "temporary_password";
}

/** A form-level failure: what the server said that belongs to no field. */
function FormAlert({ message, label }: { message: string | null; label: string }) {
  return (
    <div role="alert" className="empty:hidden">
      {message ? (
        <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
          <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
          <span>
            <span className="sr-only">{`${label}: `}</span>
            {message}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** «Bekor qilish» + the primary action; cancel waits while the request runs. */
function DialogActions({
  busy,
  onCancel,
  children,
}: {
  busy: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  const t = useCopy(staffCopy).common;
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      <Button variant="outline" disabledReason={busy && t.busy} onClick={onCancel}>
        {t.cancel}
      </Button>
      {children}
    </div>
  );
}

/** «Menejer» switch with its explanation; `reason` keeps it focusable but unchangeable. */
function ManagerSwitch({
  checked,
  onChange,
  reason,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  reason?: string | null;
}) {
  const t = useCopy(staffCopy).manager;
  const id = useId();
  return (
    <div
      data-disabled={reason ? "" : undefined}
      className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3.5"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-label text-ink" aria-hidden="true">
          {t.label}
        </span>
        <span id={`${id}-hint`} className="text-caption font-normal text-ink-muted">
          {reason ?? t.hint}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={t.label}
        aria-describedby={reason ? undefined : `${id}-hint`}
        disabledReason={reason}
      />
    </div>
  );
}

export function InviteDialog({
  open,
  onOpenChange,
  idempotency,
  emailInvite,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idempotency: Idempotency;
  emailInvite: boolean;
  onInvited: (data: StaffCredentials) => void;
}) {
  const t = useCopy(staffCopy);
  const schema = useLocalized(staffSchemas).invite;
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [delivery, setDelivery] = useState<StaffPasswordDelivery>(defaultDelivery(emailInvite));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const labels: Record<string, string> = {
    email: t.invite.email,
    fullName: t.invite.fullName,
    delivery: t.delivery.legend,
  };
  const summary = ["email", "fullName", "delivery"].flatMap((name) =>
    errors[name] ? [{ name, label: labels[name]!, message: errors[name]! }] : [],
  );
  const clear = (name: string) => {
    if (!errors[name]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const values = { email, fullName, isManager, delivery };
    const local = schema.safeParse(values);
    if (!local.success) {
      setErrors(issuesToErrors(local.error.issues));
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => inviteStaff(values, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, ["email", "fullName", "delivery"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      reveal();
      return;
    }
    onOpenChange(false);
    onInvited(result.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title={t.invite.title}
      description={t.invite.description}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => void revealFirstError(formRef.current, { name })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.invite.email} error={errors.email} hint={t.invite.emailHint}>
            {(c) => (
              <TextInput
                {...c}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                maxLength={EMAIL_MAX}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clear("email");
                }}
              />
            )}
          </Field>
          <Field label={t.invite.fullName} error={errors.fullName}>
            {(c) => (
              <TextInput
                {...c}
                name="fullName"
                autoComplete="off"
                maxLength={STAFF_FULL_NAME_MAX}
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  clear("fullName");
                }}
              />
            )}
          </Field>
        </div>
        <ManagerSwitch checked={isManager} onChange={setIsManager} />
        <DeliveryChoice
          value={delivery}
          onChange={(value) => {
            setDelivery(value);
            clear("delivery");
          }}
          emailInvite={emailInvite}
          error={errors.delivery}
        />
        <FormAlert message={formError ?? errors.isManager ?? null} label={t.common.failed} />
        <DialogActions busy={busy} onCancel={() => onOpenChange(false)}>
          <Button type="submit" busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? t.invite.submitting : t.invite.submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function EditDialog({
  row,
  self,
  idempotency,
  onClose,
  onSaved,
}: {
  row: StaffAccountRow;
  self: boolean;
  idempotency: Idempotency;
  onClose: () => void;
  onSaved: (row: StaffAccountRow) => void;
}) {
  const t = useCopy(staffCopy);
  const toast = useToast();
  const schema = useLocalized(staffSchemas).update;
  const baseline = { fullName: row.fullName, isManager: row.isManager };
  const [fullName, setFullName] = useState(row.fullName);
  const [isManager, setIsManager] = useState(row.isManager);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const values = { fullName, isManager };
    const local = schema.safeParse(values);
    if (!local.success) {
      setErrors(issuesToErrors(local.error.issues));
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
        updateStaff(row.id, local.data, baseline, idempotency.key, csrf, row),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, ["fullName"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      if (!split.fieldErrors.fullName) {
        toast({
          tone: "danger",
          title: t.common.failed,
          description: split.formError ?? undefined,
        });
      }
      reveal();
      return;
    }
    onSaved(result.data);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
      onCloseAutoFocus={() => onClose()}
      title={t.edit.title}
      description={row.email}
      className="max-w-[520px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t.edit.fullName} error={errors.fullName}>
          {(c) => (
            <TextInput
              {...c}
              name="fullName"
              autoComplete="off"
              maxLength={STAFF_FULL_NAME_MAX}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </Field>
        <ManagerSwitch
          checked={isManager}
          onChange={setIsManager}
          reason={self ? t.manager.selfHint : null}
        />
        <p className="m-0 flex items-start gap-1.5 text-caption font-normal text-ink-muted">
          <Icon name="lock" size={14} className="mt-px shrink-0" />
          {t.edit.emailLocked}
        </p>
        <FormAlert message={formError} label={t.common.failed} />
        <DialogActions busy={busy} onCancel={() => setOpen(false)}>
          <Button type="submit" busy={busy}>
            <Icon name="check" size={18} />
            {busy ? t.edit.submitting : t.edit.submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * «Parolni tiklash» with the «Kirish usuli» choice: the account's password is replaced (a new
 * temporary one and/or an e-mailed link), every session ends, and the person must set their own
 * password at the next sign-in.
 */
export function ResetDialog({
  row,
  idempotency,
  emailInvite,
  onClose,
  onDone,
}: {
  row: StaffAccountRow;
  idempotency: Idempotency;
  emailInvite: boolean;
  onClose: () => void;
  onDone: (data: StaffCredentials) => void;
}) {
  const t = useCopy(staffCopy);
  const [delivery, setDelivery] = useState<StaffPasswordDelivery>(defaultDelivery(emailInvite));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState<StaffCredentials | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const answer = idempotency.settle(
      await runAction((csrf) =>
        resetStaffPassword(row.id, { delivery }, idempotency.key, csrf, row),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!answer.ok) {
      const split = partitionFieldErrors(answer, ["delivery"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      reveal();
      return;
    }
    setResult(answer.data);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
      onCloseAutoFocus={() => {
        onClose();
        if (result) onDone(result);
      }}
      title={t.reset.title}
      description={`${row.displayName} · ${row.email}`}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <p className="m-0 flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-3.5 py-3 text-body-sm text-ink">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-danger" />
          {t.reset.body}
        </p>
        <DeliveryChoice
          value={delivery}
          onChange={setDelivery}
          emailInvite={emailInvite}
          error={errors.delivery}
        />
        <FormAlert message={formError} label={t.common.failed} />
        <DialogActions busy={busy} onCancel={() => setOpen(false)}>
          <Button type="submit" variant="destructive" busy={busy}>
            {busy ? t.common.working : t.reset.submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
