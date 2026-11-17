"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import {
  confirmMfaSetup,
  disableMfa,
  regenerateRecoveryCodes,
  startMfaSetup,
  type MfaSetupInfo,
} from "@/data/mfa.actions";
import { mfaSchemas } from "@/data/mfa.schema";
import type { ActionFailure } from "@/data/types";
import { qrDrawing } from "@/features/shop/loyalty/qr-matrix";
import { cn } from "@/lib/cn";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { OtpInput } from "../auth/otp-input";
import { PasswordInput } from "../password/password-field";
import { runAction } from "../shared/action-client";
import { mfaSettingsCopy, type MfaSettingsCopy } from "./mfa-copy";
import { compactKey, otpauthAccount } from "./mfa-model";
import { RecoveryCodes } from "./recovery-codes";

type FieldName = "currentPassword" | "code";
type Errors = Partial<Record<FieldName, string>>;

/** What a dialog reports back to the card. */
export interface MfaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The state changed (or turned out to have changed elsewhere): re-read the card. */
  onChanged: () => void;
  /** The signed-in account's e-mail (the password managers' `username`, the codes file). */
  account: string | null;
}

/** First message per field from a zod result. */
function issuesOf(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Errors {
  const found: Errors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === "currentPassword" || key === "code") found[key] ??= issue.message;
  }
  return found;
}

/**
 * A refused action, split for the form: field messages (password, code), and the rest as the
 * form's alert. `conflict` (MFA turned on/off elsewhere) is reported apart so the card re-reads.
 */
function splitFailure(result: ActionFailure): { errors: Errors; formError: string | null } {
  const errors: Errors = {};
  const fields = result.fieldErrors ?? {};
  if (fields.currentPassword) errors.currentPassword = fields.currentPassword;
  if (fields.code) errors.code = fields.code;
  const placed = Object.keys(errors).length > 0;
  return { errors, formError: placed ? null : result.error };
}

function FormAlert({ message, label }: { message: string | null; label: string }) {
  return (
    <div role="alert" aria-live="assertive" className="empty:hidden">
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

/** «Parol · Ilova · Zaxira kodlar»: where the wizard is (`aria-current="step"`). */
function Steps({ current, t }: { current: 0 | 1 | 2; t: MfaSettingsCopy }) {
  const names = [t.steps.password, t.steps.app, t.steps.codes];
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0" data-mfa-steps="">
      {names.map((name, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={name}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold transition-colors duration-200",
                done && "border-success bg-success text-white",
                active && "border-gold bg-gold text-on-gold",
                !done && !active && "border-line-strong bg-surface text-ink-muted",
              )}
            >
              {done ? <Icon name="check" size={12} /> : index + 1}
            </span>
            <span
              className={cn(
                "truncate text-caption",
                active ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              <span className="sr-only">{t.stepOf(index + 1, names.length, "")}</span>
              {name}
            </span>
            {index < names.length - 1 ? (
              <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-line" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** The QR code of the otpauth URI, drawn here (`uqr`): the secret goes to no other service. */
function TotpQr({ uri, label }: { uri: string; label: string }) {
  const drawing = qrDrawing(uri);
  return (
    <div className="flex justify-center">
      <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${drawing.size} ${drawing.size}`}
          shapeRendering="crispEdges"
          className="block size-[184px] sm:size-[200px]"
          data-totp-qr=""
        >
          <rect width={drawing.size} height={drawing.size} fill="#ffffff" />
          <path d={drawing.path} fill="#1f1a14" />
        </svg>
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  error,
  label,
  hint,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} hint={hint} name="currentPassword" error={error}>
      {(control) => (
        <PasswordInput
          {...control}
          name="currentPassword"
          autoComplete="current-password"
          maxLength={128}
          aria-required="true"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/** Shared state of the password + code forms. */
function useMfaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);
  const clear = (name: FieldName) =>
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  return {
    formRef,
    reveal,
    errors,
    setErrors,
    formError,
    setFormError,
    busy,
    setBusy,
    inFlightRef,
    clear,
  };
}

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
  );
}

/* --- Enable ------------------------------------------------------------------------------- */

/**
 * «Yoqish» (DESIGN §E "MFA"): 1. the password again (`auth/mfa/setup/`), 2. the QR code drawn from
 * `otpauth_uri` and the manual key with copy, then the first 6-digit code (`auth/mfa/confirm/`),
 * 3. the ten recovery codes shown once, which must be confirmed as saved before the dialog closes.
 * The secret exists only in this dialog's state while it is open (mount it per opening).
 */
export function EnableMfaDialog({ open, onOpenChange, onChanged, account }: MfaDialogProps) {
  const t = useCopy(mfaSettingsCopy);
  const schemas = useLocalized(mfaSchemas);
  const toast = useToast();
  const {
    formRef,
    reveal,
    errors,
    setErrors,
    formError,
    setFormError,
    busy,
    setBusy,
    inFlightRef,
    clear,
  } = useMfaForm();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<MfaSetupInfo | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const step: 0 | 1 | 2 = codes ? 2 : setup ? 1 : 0;

  const fail = (result: ActionFailure) => {
    if (result.code === "conflict") {
      toast({ tone: "warning", title: result.error, description: t.changedElsewhere });
      onChanged();
      onOpenChange(false);
      return;
    }
    const split = splitFailure(result);
    setErrors(split.errors);
    setFormError(split.formError);
    toast({ tone: "danger", title: t.failed, description: result.error });
    reveal();
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    const local = schemas.setup.safeParse({ currentPassword: password });
    if (!local.success) {
      setErrors(issuesOf(local.error.issues));
      setFormError(null);
      reveal();
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((csrf) => startMfaSetup({ currentPassword: password }, csrf));
    inFlightRef.current = false;
    setBusy(false);
    if (!result.ok) return fail(result);
    // The password has done its job: it is not kept.
    setPassword("");
    setSetup(result.data);
  };

  const submitCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (inFlightRef.current || !setup) return;
    const local = schemas.confirm.safeParse({ deviceId: setup.deviceId, code });
    if (!local.success) {
      setErrors(issuesOf(local.error.issues));
      setFormError(null);
      reveal();
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((csrf) =>
      confirmMfaSetup({ deviceId: setup.deviceId, code }, csrf),
    );
    inFlightRef.current = false;
    setBusy(false);
    if (!result.ok) {
      setCode("");
      return fail(result);
    }
    // The secret is no longer needed once the device is confirmed.
    setSetup(null);
    setCodes(result.data.recoveryCodes);
    toast({ tone: "success", title: t.setup.enabled });
  };

  const copyKey = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(compactKey(setup.manualKey));
      setKeyCopied(true);
      toast({ tone: "success", title: t.setup.keyCopied });
    } catch {
      toast({ tone: "warning", title: t.codes.copyFailed, description: t.codes.copyFailedLead });
    }
  };

  const finish = () => {
    if (!saved) {
      setNeedsConfirm(true);
      void revealFirstError(formRef.current, { name: "saved" });
      return;
    }
    onOpenChange(false);
    onChanged();
  };

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (inFlightRef.current) return;
    // The codes are shown once: closing waits for «I saved them».
    if (codes) return finish();
    onOpenChange(false);
  };

  const account_ = setup ? (otpauthAccount(setup.otpauthUri) ?? account) : account;

  return (
    <Dialog
      open={open}
      onOpenChange={requestClose}
      title={step === 2 ? t.codes.title : t.setup.title}
      className="max-w-[560px]"
    >
      <Steps current={step} t={t} />

      {step === 0 ? (
        <form ref={formRef} noValidate onSubmit={submitPassword} className="flex flex-col gap-4">
          <p className="m-0 text-body-sm text-ink-muted">{t.setup.passwordLead}</p>
          {account ? (
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={account}
              readOnly
              hidden
            />
          ) : null}
          <PasswordField
            label={t.password.label}
            hint={t.password.hint}
            value={password}
            onChange={(value) => {
              setPassword(value);
              clear("currentPassword");
            }}
            error={errors.currentPassword}
            autoFocus
          />
          <FormAlert message={formError} label={t.failed} />
          <DialogFooter>
            <Button
              variant="outline"
              disabledReason={busy && t.busy}
              onClick={() => requestClose(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" busy={busy}>
              {busy ? t.setup.checking : t.setup.continue}
              <Icon name="arrow-right" size={18} />
            </Button>
          </DialogFooter>
        </form>
      ) : null}

      {step === 1 && setup ? (
        <form ref={formRef} noValidate onSubmit={submitCode} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-label text-ink">{t.setup.scanTitle}</h3>
            <p className="m-0 text-body-sm text-pretty text-ink-muted">{t.setup.scanLead}</p>
          </div>
          <TotpQr uri={setup.otpauthUri} label={t.setup.qrLabel} />
          <details className="group rounded-md border border-line bg-surface px-3.5 py-2.5">
            <summary className="cursor-pointer text-body-sm font-semibold text-ink marker:text-gold-ink">
              {t.setup.manualTitle}
            </summary>
            <dl className="m-0 mt-3 flex flex-col gap-3">
              {account_ ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-caption text-ink-muted">{t.setup.account}</dt>
                  <dd className="m-0 text-body-sm break-all text-ink">{`Glow Derma Admin · ${account_}`}</dd>
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <dt className="text-caption text-ink-muted">{t.setup.manualKey}</dt>
                <dd className="m-0 flex flex-wrap items-center gap-2">
                  <code
                    data-manual-key=""
                    className="min-w-0 flex-1 rounded-md border border-gold-ink/30 bg-gold-soft px-3 py-2 font-mono text-[15px] font-semibold tracking-[0.12em] break-all text-ink select-all"
                  >
                    {setup.manualKey}
                  </code>
                  <Button variant="secondary" size="sm" onClick={copyKey}>
                    <Icon name={keyCopied ? "check" : "receipt"} size={16} />
                    {t.setup.copyKey}
                  </Button>
                </dd>
              </div>
              <p className="m-0 flex items-start gap-1.5 text-caption text-ink-muted">
                <Icon name="lock" size={14} className="mt-px shrink-0 text-gold-ink" />
                {t.setup.keyPrivate}
              </p>
            </dl>
          </details>
          <Field label={t.setup.code} hint={t.setup.codeHint} name="code" error={errors.code}>
            {(control) => (
              <OtpInput
                {...control}
                kind="totp"
                name="code"
                value={code}
                aria-required="true"
                autoFocus
                onValueChange={(value) => {
                  setCode(value);
                  clear("code");
                }}
              />
            )}
          </Field>
          <FormAlert message={formError} label={t.failed} />
          <DialogFooter>
            <Button
              variant="outline"
              disabledReason={busy && t.busy}
              onClick={() => {
                setSetup(null);
                setCode("");
                setErrors({});
                setFormError(null);
              }}
            >
              {t.setup.back}
            </Button>
            <Button type="submit" busy={busy}>
              <Icon name="shield-check" size={18} />
              {busy ? t.setup.confirming : t.setup.confirm}
            </Button>
          </DialogFooter>
        </form>
      ) : null}

      {step === 2 && codes ? (
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            finish();
          }}
          className="flex flex-col gap-5"
        >
          <RecoveryCodes
            codes={codes}
            account={account}
            saved={saved}
            onSavedChange={(value) => {
              setSaved(value);
              if (value) setNeedsConfirm(false);
            }}
            needsConfirm={needsConfirm}
          />
          <DialogFooter>
            <Button type="submit" disabledReason={!saved && t.codes.mustConfirm}>
              <Icon name="check" size={18} />
              {t.codes.done}
            </Button>
          </DialogFooter>
        </form>
      ) : null}
    </Dialog>
  );
}

/* --- Disable ------------------------------------------------------------------------------ */

/** «O‘chirish»: the password plus an authenticator code or a recovery code (`auth/mfa/disable/`). */
export function DisableMfaDialog({ open, onOpenChange, onChanged, account }: MfaDialogProps) {
  const t = useCopy(mfaSettingsCopy);
  const schemas = useLocalized(mfaSchemas);
  const toast = useToast();
  const {
    formRef,
    reveal,
    errors,
    setErrors,
    formError,
    setFormError,
    busy,
    setBusy,
    inFlightRef,
    clear,
  } = useMfaForm();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const labels: Record<FieldName, string> = {
    currentPassword: t.password.label,
    code: t.disableDialog.code,
  };
  const summary = (["currentPassword", "code"] as const).flatMap((name) =>
    errors[name] ? [{ name, label: labels[name], message: errors[name]! }] : [],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    const values = { currentPassword: password, code };
    const local = schemas.disable.safeParse(values);
    if (!local.success) {
      setErrors(issuesOf(local.error.issues));
      setFormError(null);
      reveal();
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((csrf) => disableMfa(values, csrf));
    inFlightRef.current = false;
    setBusy(false);
    if (!result.ok) {
      if (result.code === "conflict") {
        toast({ tone: "warning", title: result.error, description: t.changedElsewhere });
        onChanged();
        onOpenChange(false);
        return;
      }
      setCode("");
      const split = splitFailure(result);
      setErrors(split.errors);
      setFormError(split.formError);
      toast({ tone: "danger", title: t.failed, description: result.error });
      reveal();
      return;
    }
    toast({ tone: "success", title: t.disableDialog.done, description: t.disableDialog.doneLead });
    onOpenChange(false);
    onChanged();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && inFlightRef.current) return;
        onOpenChange(next);
      }}
      title={t.disableDialog.title}
      description={t.disableDialog.lead}
      className="max-w-[520px]"
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => void revealFirstError(formRef.current, { name })}
        />
        {account ? (
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={account}
            readOnly
            hidden
          />
        ) : null}
        <PasswordField
          label={t.password.label}
          value={password}
          onChange={(value) => {
            setPassword(value);
            clear("currentPassword");
          }}
          error={errors.currentPassword}
          autoFocus
        />
        <Field
          label={t.disableDialog.code}
          hint={t.disableDialog.codeHint}
          name="code"
          error={errors.code}
        >
          {(control) => (
            <OtpInput
              {...control}
              kind="either"
              name="code"
              value={code}
              aria-required="true"
              onValueChange={(value) => {
                setCode(value);
                clear("code");
              }}
            />
          )}
        </Field>
        <FormAlert message={formError} label={t.failed} />
        <DialogFooter>
          <Button
            variant="outline"
            disabledReason={busy && t.busy}
            onClick={() => onOpenChange(false)}
          >
            {t.cancel}
          </Button>
          <Button type="submit" variant="destructive" busy={busy}>
            {busy ? t.disableDialog.submitting : t.disableDialog.submit}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/* --- New recovery codes ------------------------------------------------------------------- */

/**
 * «Yangi zaxira kodlar»: the password plus a TOTP code (`auth/mfa/recovery-codes/`) → ten new codes,
 * shown once with the same «I saved them» gate; the old codes stop working at once.
 */
export function RegenerateCodesDialog({ open, onOpenChange, onChanged, account }: MfaDialogProps) {
  const t = useCopy(mfaSettingsCopy);
  const schemas = useLocalized(mfaSchemas);
  const toast = useToast();
  const {
    formRef,
    reveal,
    errors,
    setErrors,
    formError,
    setFormError,
    busy,
    setBusy,
    inFlightRef,
    clear,
  } = useMfaForm();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const labels: Record<FieldName, string> = {
    currentPassword: t.password.label,
    code: t.regenerateDialog.code,
  };
  const summary = (["currentPassword", "code"] as const).flatMap((name) =>
    errors[name] ? [{ name, label: labels[name], message: errors[name]! }] : [],
  );

  const finish = () => {
    if (!saved) {
      setNeedsConfirm(true);
      void revealFirstError(formRef.current, { name: "saved" });
      return;
    }
    onOpenChange(false);
    onChanged();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (codes) return finish();
    if (inFlightRef.current) return;
    const values = { currentPassword: password, code };
    const local = schemas.regenerate.safeParse(values);
    if (!local.success) {
      setErrors(issuesOf(local.error.issues));
      setFormError(null);
      reveal();
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((csrf) => regenerateRecoveryCodes(values, csrf));
    inFlightRef.current = false;
    setBusy(false);
    if (!result.ok) {
      if (result.code === "conflict") {
        toast({ tone: "warning", title: result.error, description: t.changedElsewhere });
        onChanged();
        onOpenChange(false);
        return;
      }
      setCode("");
      const split = splitFailure(result);
      setErrors(split.errors);
      setFormError(split.formError);
      toast({ tone: "danger", title: t.failed, description: result.error });
      reveal();
      return;
    }
    setPassword("");
    setCode("");
    setCodes(result.data.recoveryCodes);
    toast({ tone: "success", title: t.regenerateDialog.done });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return onOpenChange(true);
        if (inFlightRef.current) return;
        if (codes) return finish();
        onOpenChange(false);
      }}
      title={codes ? t.codes.title : t.regenerateDialog.title}
      description={codes ? undefined : t.regenerateDialog.lead}
      className="max-w-[560px]"
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {codes ? (
          <RecoveryCodes
            codes={codes}
            account={account}
            saved={saved}
            onSavedChange={(value) => {
              setSaved(value);
              if (value) setNeedsConfirm(false);
            }}
            needsConfirm={needsConfirm}
          />
        ) : (
          <>
            <FormErrorSummary
              errors={summary}
              onSelect={(name) => void revealFirstError(formRef.current, { name })}
            />
            {account ? (
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={account}
                readOnly
                hidden
              />
            ) : null}
            <PasswordField
              label={t.password.label}
              value={password}
              onChange={(value) => {
                setPassword(value);
                clear("currentPassword");
              }}
              error={errors.currentPassword}
              autoFocus
            />
            <Field label={t.regenerateDialog.code} name="code" error={errors.code}>
              {(control) => (
                <OtpInput
                  {...control}
                  kind="totp"
                  name="code"
                  value={code}
                  aria-required="true"
                  onValueChange={(value) => {
                    setCode(value);
                    clear("code");
                  }}
                />
              )}
            </Field>
            <FormAlert message={formError} label={t.failed} />
          </>
        )}
        <DialogFooter>
          {codes ? (
            <Button type="submit" disabledReason={!saved && t.codes.mustConfirm}>
              <Icon name="check" size={18} />
              {t.codes.done}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabledReason={busy && t.busy}
                onClick={() => onOpenChange(false)}
              >
                {t.cancel}
              </Button>
              <Button type="submit" busy={busy}>
                <Icon name="refresh" size={18} />
                {busy ? t.regenerateDialog.submitting : t.regenerateDialog.submit}
              </Button>
            </>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
