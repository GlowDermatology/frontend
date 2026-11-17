"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { setPasswordWithLink } from "@/data/password.actions";
import { PASSWORD_MIN, passwordSchemas } from "@/data/password.schema";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { partitionFieldErrors } from "../shared/field-errors";
import { passwordCopy } from "./copy";
import { PasswordInput, PasswordRules } from "./password-field";
import { passwordChecks } from "./rules";

type FieldName = "newPassword" | "confirmPassword";
const FIELDS: ReadonlyArray<FieldName> = ["newPassword", "confirmPassword"];

/** Where a set password continues: the sign-in page with its localized notice. */
export const PASSWORD_SET_LOGIN: Route = "/admin/login?notice=password_set";

/**
 * The e-mailed link's form (DESIGN §E): the new password twice with the live checklist. The token
 * is not here — the Server Action reads it from the HttpOnly cookie the proxy stored. On success
 * the browser goes to the sign-in page, which says the password was set. A link that went stale
 * meanwhile answers `token_invalid`: the page reloads into its "invalid link" state.
 */
export function SetPasswordForm({ csrf, email }: { csrf: string; email: string }) {
  const t = useCopy(passwordCopy);
  const s = t.set;
  const router = useRouter();
  const schema = useLocalized(passwordSchemas).set;
  const [values, setValues] = useState<Record<FieldName, string>>({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const checks = useMemo(
    () => passwordChecks(values.newPassword, values.confirmPassword, PASSWORD_MIN),
    [values.newPassword, values.confirmPassword],
  );
  const labels: Record<FieldName, string> = {
    newPassword: s.newPassword,
    confirmPassword: s.confirmPassword,
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
    if (inFlight.current || done) return;
    const local = schema.safeParse(values);
    if (!local.success) {
      const found: Partial<Record<FieldName, string>> = {};
      for (const issue of local.error.issues) found[issue.path[0] as FieldName] ??= issue.message;
      setErrors(found);
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    let result;
    try {
      result = await setPasswordWithLink(local.data, csrf);
    } catch {
      result = { ok: false as const, error: t.set.unreachableLead };
    }
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      if (result.code === "token_invalid") {
        // The link was used or revoked meanwhile: show the page's "invalid link" state.
        router.refresh();
        return;
      }
      const split = partitionFieldErrors(result, FIELDS);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      reveal();
      return;
    }
    setDone(true);
    router.push(PASSWORD_SET_LOGIN);
  };

  return (
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
      {/* Lets password managers file the new password under the (masked) account. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <Field label={s.newPassword} hint={s.newHint} error={errors.newPassword}>
        {(control) => (
          <PasswordInput
            {...control}
            name="newPassword"
            autoComplete="new-password"
            maxLength={128}
            aria-required="true"
            autoFocus
            value={values.newPassword}
            onChange={(event) => set("newPassword")(event.target.value)}
          />
        )}
      </Field>
      <Field label={s.confirmPassword} error={errors.confirmPassword}>
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
              <span className="sr-only">{`${s.failed}: `}</span>
              {formError}
            </span>
          </p>
        ) : null}
      </div>

      <p className="m-0 flex items-start gap-2 text-body-sm text-ink-muted">
        <Icon name="shield-check" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
        {s.afterSet}
      </p>

      <Button type="submit" size="lg" busy={busy || done} className="w-full">
        {busy || done ? s.submitting : s.submit}
      </Button>
    </form>
  );
}
