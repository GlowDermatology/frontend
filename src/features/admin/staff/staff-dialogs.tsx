"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { changeSpecialistRole, inviteSpecialist } from "@/data/specialist.actions";
import { inviteStaff, resetStaffPassword, updateStaff } from "@/data/staff.actions";
import { EMAIL_MAX, staffSchemas } from "@/data/staff.schema";
import {
  STAFF_FULL_NAME_MAX,
  specialistRoleBlock,
  staffAccountRole,
  type SpecialistRoleChange,
  type StaffAccountRole,
  type StaffAccountRow,
  type StaffCredentials,
  type StaffPasswordDelivery,
} from "@/domain/staff";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { staffCopy } from "./copy";
import { DeliveryChoice } from "./delivery-choice";
import { AccountRoleField } from "./role-fields";

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

/**
 * «Yangi xodim»: email, full name, the role (Staff, Manager or Specialist) and the «Kirish usuli».
 * A Specialist goes through `specialists/invite/`, which creates the account and its draft
 * profile together.
 */
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
  const [role, setRole] = useState<StaffAccountRole>("staff");
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
    const values = { email, fullName, isManager: role === "manager", delivery };
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
        role === "specialist"
          ? inviteSpecialist(values, idempotency.key, csrf)
          : inviteStaff(values, idempotency.key, csrf),
      ),
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
        <AccountRoleField
          role={role}
          disabledReason={busy && t.common.busy}
          hint={role === "specialist" ? t.roleField.specialistInvite : undefined}
          onChange={setRole}
        />
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

/**
 * «Xodimni tahrirlash»: the full name, the login email (same account and profile) and Staff /
 * Manager. Switching between Staff and Specialist is a separate confirmed action
 * (`onChangeRole` opens `RoleChangeDialog`), offered only for an eligible account: not one's own,
 * a superuser, an account with operations-console access or an inactive one.
 */
export function EditDialog({
  row,
  selfId,
  idempotency,
  onClose,
  onSaved,
  onChangeRole,
}: {
  row: StaffAccountRow;
  selfId: string;
  idempotency: Idempotency;
  onClose: () => void;
  onSaved: (row: StaffAccountRow) => void;
  onChangeRole: (row: StaffAccountRow, role: "staff" | "specialist") => void;
}) {
  const t = useCopy(staffCopy);
  const toast = useToast();
  const schema = useLocalized(staffSchemas).update;
  const self = row.id === selfId;
  const currentRole = staffAccountRole(row);
  const baseline = { fullName: row.fullName, isManager: row.isManager, email: row.email };
  const [fullName, setFullName] = useState(row.fullName);
  const [email, setEmail] = useState(row.email);
  const [role, setRole] = useState<StaffAccountRole>(currentRole);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const pendingRoleChange = useRef<"staff" | "specialist" | null>(null);

  const block = specialistRoleBlock(row, selfId);
  const target = currentRole === "specialist" ? "staff" : "specialist";
  const roleChangeReason = block ? t.specialistRole.blocked[block] : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const values = { fullName, isManager: role === "manager", email };
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
      const split = partitionFieldErrors(result, ["fullName", "email"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      if (!split.fieldErrors.fullName && !split.fieldErrors.email) {
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
      onCloseAutoFocus={() => {
        onClose();
        // The confirmation opens once the focus is back on the row's menu (it returns there).
        const next = pendingRoleChange.current;
        if (next) onChangeRole(row, next);
      }}
      title={t.edit.title}
      description={row.displayName}
      className="max-w-[560px]"
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
        <Field label={t.edit.email} error={errors.email} hint={t.edit.emailHint}>
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
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        {currentRole === "specialist" ? (
          <AccountRoleField
            role="specialist"
            roles={["specialist"]}
            disabledReason={t.roleField.specialistFixed}
            onChange={() => undefined}
          />
        ) : (
          <AccountRoleField
            role={role}
            roles={["staff", "manager"]}
            disabledReason={
              busy
                ? t.common.busy
                : row.isSuperuser
                  ? t.roleField.superuserBlock
                  : self && row.isManager
                    ? t.manager.selfHint
                    : null
            }
            onChange={setRole}
          />
        )}

        <section
          aria-labelledby="specialist-role-title"
          className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3.5"
          data-specialist-role=""
        >
          <h3 id="specialist-role-title" className="m-0 text-label text-ink">
            {t.specialistRole.title}
          </h3>
          <p className="m-0 text-body-sm text-ink-muted">
            {target === "specialist"
              ? t.specialistRole.toSpecialistText
              : t.specialistRole.toStaffText}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabledReason={busy ? t.common.busy : roleChangeReason}
            onClick={() => {
              pendingRoleChange.current = target;
              setOpen(false);
            }}
          >
            <Icon name="users" size={16} />
            {target === "specialist" ? t.specialistRole.toSpecialist : t.specialistRole.toStaff}
          </Button>
        </section>

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
 * The one confirmed Staff ↔ Specialist change (`POST staff/{id}/specialist-role/`): the
 * consequences first (sessions end; → Staff pauses new bookings, the profile and its history stay,
 * outstanding visits are for staff to handle; → Specialist reuses the existing profile, to be
 * reviewed before republishing). A 409 (own account, inactive, superuser, operations console,
 * last active manager) shows the server's message. After → Staff with visits ahead, the dialog
 * stays open with their count and a link to the appointments of that specialist.
 */
export function RoleChangeDialog({
  row,
  role,
  onClose,
  onChanged,
}: {
  row: StaffAccountRow;
  role: "staff" | "specialist";
  onClose: () => void;
  onChanged: (change: SpecialistRoleChange) => void;
}) {
  const t = useCopy(staffCopy);
  const r = t.specialistRole;
  const fmt = useFormat();
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SpecialistRoleChange | null>(null);
  const inFlight = useRef(false);

  const confirm = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const result = idempotency.settle(
      await runAction((csrf) => changeSpecialistRole(row.id, role, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onChanged(result.data);
    toast({ tone: "success", title: r.done[role], description: result.data.staff.displayName });
    // Something is left to do: the visits of the paused profile, or the profile to review.
    if (
      result.data.upcomingAppointments > 0 ||
      (role === "specialist" && result.data.specialistId)
    ) {
      setDone(result.data);
      return;
    }
    setOpen(false);
  };

  const appointmentsHref = (specialistId: string) =>
    `/admin/appointments?view=month&specialist=${encodeURIComponent(specialistId)}` as Route;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
      onCloseAutoFocus={() => onClose()}
      title={done ? r.done[role] : r.confirmTitle[role]}
      description={
        <span className="flex flex-col gap-2 text-[14px] leading-5 text-ink">
          <span className="font-semibold">
            {row.displayName} · {row.email}
          </span>
          {!done && (
            <>
              <span className="flex items-start gap-2">
                <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
                {r.sessions}
              </span>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                {r.consequences[role].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </span>
      }
    >
      {done && done.upcomingAppointments > 0 && (
        <p
          className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink"
          data-upcoming={done.upcomingAppointments}
        >
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-warning" />
          {r.upcoming(done.upcomingAppointments, fmt.number(done.upcomingAppointments))}
        </p>
      )}
      {done && role === "specialist" && (
        <p className="m-0 text-body-sm text-ink">{r.reviewProfile}</p>
      )}
      {error && (
        <p
          role="alert"
          className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
        >
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          <span>
            <span className="sr-only">{`${t.common.failed}: `}</span>
            {error}
          </span>
        </p>
      )}
      <div className="mt-1.5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {done ? (
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {r.close}
            </Button>
            {done.specialistId &&
              (done.upcomingAppointments > 0 ? (
                <Link
                  href={appointmentsHref(done.specialistId)}
                  className={buttonStyles({ variant: "primary" })}
                >
                  <Icon name="calendar" size={18} />
                  {r.openAppointments}
                </Link>
              ) : (
                <Link
                  href={`/admin/specialists/${done.specialistId}` as Route}
                  className={buttonStyles({ variant: "primary" })}
                >
                  <Icon name="user" size={18} />
                  {r.openProfile}
                </Link>
              ))}
          </>
        ) : (
          <>
            <Button
              variant="outline"
              disabledReason={busy && t.common.busy}
              onClick={() => setOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant={role === "staff" ? "destructive" : "primary"}
              onClick={confirm}
              busy={busy}
            >
              {busy ? t.common.working : role === "specialist" ? r.toSpecialist : r.toStaff}
            </Button>
          </>
        )}
      </div>
    </AlertDialog>
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
