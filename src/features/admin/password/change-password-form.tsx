"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import {
  changeOwnPassword,
  requestOwnPasswordLink,
  type OwnPasswordLinkSent,
} from "@/data/password.actions";
import { PASSWORD_MIN, passwordSchemas } from "@/data/password.schema";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { passwordCopy } from "./copy";
import { PasswordInput, PasswordRules } from "./password-field";
import { passwordChecks } from "./rules";

type FieldName = "currentPassword" | "newPassword" | "confirmPassword";
const FIELDS: ReadonlyArray<FieldName> = ["currentPassword", "newPassword", "confirmPassword"];

interface ChangePasswordFormProps {
  /** Where the panel continues after the change (validated server-side again). */
  next: string;
  /** The signed-in account, shown above the form. */
  account: { name: string; email: string };
  /** The session was opened with Google / Facebook: the link option is the likely way. */
  socialSignIn: boolean;
  /** `capabilities.staff_email_invite`: the «send me a link» option works. */
  emailLink: boolean;
}

/**
 * The forced password change (DESIGN §E) in the staff auth card: the current (temporary)
 * password, the new one twice with a live checklist, then the panel continues at `next`. Someone
 * who cannot type a current password (a social sign-in, an e-mail-link account) asks for a link
 * instead. Errors: fields get their messages, a summary lists them, and the first one is revealed;
 * the server's answer shows in the alert above the button.
 */
export function ChangePasswordForm({
  next,
  account,
  socialSignIn,
  emailLink,
}: ChangePasswordFormProps) {
  const t = useCopy(passwordCopy);
  const c = t.change;
  const schema = useLocalized(passwordSchemas).change;
  const [values, setValues] = useState<Record<FieldName, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const checks = useMemo(
    () => passwordChecks(values.newPassword, values.confirmPassword, PASSWORD_MIN),
    [values.newPassword, values.confirmPassword],
  );

  const labels: Record<FieldName, string> = {
    currentPassword: c.currentPassword,
    newPassword: c.newPassword,
    confirmPassword: c.confirmPassword,
  };
  const summary = FIELDS.flatMap((name) =>
    errors[name] ? [{ name, label: labels[name], message: errors[name]! }] : [],
  );

  const set = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || saved) return;
    const local = schema.safeParse(values);
    if (!local.success) {
      const found: Partial<Record<FieldName, string>> = {};
      for (const issue of local.error.issues) {
        const key = issue.path[0] as FieldName;
        found[key] ??= issue.message;
      }
      setErrors(found);
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((csrf) => changeOwnPassword(local.data, next, csrf));
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, FIELDS);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      reveal();
      return;
    }
    setSaved(true);
    // A full load: the panel's shell and data render afresh for an account that may now use them.
    window.location.assign(result.data.next);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 flex items-center gap-3 rounded-md bg-surface px-3.5 py-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="user" size={18} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-caption text-ink-muted">{c.signedInAs}</span>
          <span className="truncate text-label text-ink">
            {account.name}
            {account.name !== account.email ? (
              <span className="font-normal text-ink-muted">{` · ${account.email}`}</span>
            ) : null}
          </span>
        </span>
      </p>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        aria-busy={busy || undefined}
      >
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => void revealFirstError(formRef.current, { name })}
        />
        {/* The account's e-mail lets password managers file the new password under it. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={account.email}
          readOnly
          hidden
        />
        <Field label={c.currentPassword} hint={c.currentHint} error={errors.currentPassword}>
          {(control) => (
            <PasswordInput
              {...control}
              name="currentPassword"
              autoComplete="current-password"
              maxLength={128}
              aria-required="true"
              autoFocus={!socialSignIn}
              value={values.currentPassword}
              onChange={(event) => set("currentPassword")(event.target.value)}
            />
          )}
        </Field>
        <Field label={c.newPassword} hint={c.newHint} error={errors.newPassword}>
          {(control) => (
            <PasswordInput
              {...control}
              name="newPassword"
              autoComplete="new-password"
              maxLength={128}
              aria-required="true"
              value={values.newPassword}
              onChange={(event) => set("newPassword")(event.target.value)}
            />
          )}
        </Field>
        <Field label={c.confirmPassword} error={errors.confirmPassword}>
          {(control) => (
            <PasswordInput
              {...control}
              name="confirmPassword"
              autoComplete="new-password"
              maxLength={128}
              aria-required="true"
              value={values.confirmPassword}
              onChange={(event) => set("confirmPassword")(event.target.value)}
            />
          )}
        </Field>
        <PasswordRules checks={checks} min={PASSWORD_MIN} />

        <div role="alert" aria-live="assertive" className="empty:hidden">
          {formError ? (
            <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
              <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
              <span>
                <span className="sr-only">{`${c.failed}: `}</span>
                {formError}
              </span>
            </p>
          ) : null}
        </div>
        <div role="status" className="empty:hidden">
          {saved ? (
            <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-success/35 bg-success-soft px-3.5 py-3 text-body-sm text-ink">
              <Icon name="check" size={18} className="mt-px shrink-0 text-success" />
              <span>
                <span className="font-semibold">{c.saved}</span> {c.savedLead}
              </span>
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" busy={busy || saved} className="w-full">
          {busy || saved ? c.submitting : c.submit}
        </Button>
      </form>

      <p className="m-0 flex items-center gap-3 text-caption text-ink-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        {c.or}
      </p>

      <OwnLinkRequest socialSignIn={socialSignIn} emailLink={emailLink} />
    </div>
  );
}

/** «Menga havola yuborish»: the e-mailed link for an account without a known current password. */
function OwnLinkRequest({
  socialSignIn,
  emailLink,
}: {
  socialSignIn: boolean;
  emailLink: boolean;
}) {
  const c = useCopy(passwordCopy).change;
  const fmt = useFormat();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<OwnPasswordLinkSent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await runAction((csrf) => requestOwnPasswordLink(csrf));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setSent(result.data);
  };

  return (
    <section
      aria-labelledby="own-link-title"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="mail" size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="own-link-title" className="m-0 text-label text-ink">
            {c.linkTitle}
          </h2>
          <p className="m-0 text-body-sm text-pretty text-ink-muted">
            {socialSignIn ? c.linkSocialLead : c.linkLead}
          </p>
        </div>
      </div>
      <div role="status" className="empty:hidden">
        {sent ? (
          <div className="flex animate-fade-in items-start gap-2.5 rounded-md border border-success/35 bg-success-soft px-3.5 py-3 text-body-sm text-ink">
            <Icon name="send" size={18} className="mt-px shrink-0 text-success" />
            <div className="flex flex-col gap-0.5">
              <p className="m-0 font-semibold">{c.linkSent(sent.emailMasked)}</p>
              {sent.expiresAt ? (
                <p className="m-0">{c.linkSentLead(fmt.dateTimeShort(sent.expiresAt))}</p>
              ) : null}
              {sent.demo ? <p className="m-0 text-ink-muted">{c.linkSentDemo}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <div role="alert" className="empty:hidden">
        {error ? (
          <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
            <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
            <span>
              <span className="sr-only">{`${c.linkFailed}: `}</span>
              {error}
            </span>
          </p>
        ) : null}
      </div>
      <Button
        variant={socialSignIn ? "primary" : "secondary"}
        busy={busy}
        disabledReason={!emailLink && c.linkUnavailable}
        onClick={send}
        className="self-start"
      >
        <Icon name="send" size={18} />
        {busy ? c.linkSending : c.linkButton}
      </Button>
    </section>
  );
}
