"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { changePassword, unlinkSocialAccount } from "@/data/settings.actions";
import {
  PASSWORD_MIN,
  changePasswordSchemas,
  type ChangePasswordValues,
} from "@/data/settings.schema";
import { authDataCopy } from "@/domain/copy/auth";
import type { StaffAccount } from "@/domain/settings";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { PasswordInput, PasswordRules } from "../password/password-field";
import { passwordChecks } from "../password/rules";
import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { readCsrfCookie } from "../shared/csrf";
import { claimNotice, withoutParam } from "../shared/notice-once";
import { settingsCopy } from "./copy";
import { othersLogoutNotice } from "./others-logout";
import { socialBlock, type SocialProviderOption } from "./social-rows";

/** A link flow's outcome, verified server-side from the signed `?oauth=` token. */
export interface SocialNotice {
  kind: "error" | "linked" | "demo";
  /** Provider label ("Google"). */
  provider: string;
  message: string;
  /** When the callback issued it (epoch ms): identifies the notice so it is toasted once. */
  issuedAt: number;
}

type PasswordField = keyof ChangePasswordValues;
const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_FIELDS: ReadonlyArray<PasswordField> = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
];

/**
 * Where focus goes when the «Uzish» confirmation closes: the row's action —
 * «Uzish» after a dismissal or a refusal, «Bog‘lash» after a success in a
 * password session — else the row itself (a session that cannot link shows
 * no action on an unlinked row), else the block's heading (a provider that
 * is no longer enabled leaves no row once unlinked).
 */
function unlinkFocusTarget(id: string | null): HTMLElement | null {
  return (
    (id &&
      (document.getElementById(`social-action-${id}`) ??
        document.getElementById(`social-row-${id}`))) ||
    document.getElementById("social-title")
  );
}

interface AccountCardProps {
  account: StaffAccount | null;
  /** Social sign-in providers enabled on this server (`GLOWDERMA_OAUTH_PROVIDERS`). */
  providers?: SocialProviderOption[];
  notice?: SocialNotice | null;
}

/**
 * The signed-in staff member (contract §2.1): password change through a
 * Server Action (`auth/change-password/`; the other sessions are revoked,
 * this one stays), the social sign-in providers — "Bog‘lash" starts the
 * OAuth link flow (`/admin/auth/oauth/{provider}/start?intent=link`, back
 * here with a signed notice), "Uzish" asks for confirmation and calls
 * `DELETE auth/oauth/{provider}/` through a Server Action — and "sign out
 * other devices" through the logout route with `scope=others`.
 */
export function AccountCard({ account, providers = [], notice = null }: AccountCardProps) {
  const t = useCopy(settingsCopy);
  const authTexts = useCopy(authDataCopy);
  const fmt = useFormat();
  const schema = useLocalized(changePasswordSchemas);
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const [othersOpen, setOthersOpen] = useState(false);
  const [csrf, setCsrf] = useState("");
  // Linked providers as last loaded, or as the last unlink left them (mock
  // mode keeps the local change; api mode re-renders with `auth/me/`).
  const [source, setSource] = useState(account);
  // `null`: the account could not be loaded, so the link state is unknown.
  const [linked, setLinked] = useState<string[] | null>(account?.linkedProviders ?? null);
  if (source !== account) {
    setSource(account);
    setLinked(account?.linkedProviders ?? null);
  }
  const [unlinkTarget, setUnlinkTarget] = useState<SocialProviderOption | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const unlinkInFlight = useRef(false);
  /** The row that takes focus back once the confirmation closes (see `unlinkFocusTarget`). */
  const focusRow = useRef<string | null>(null);
  // A session that did not sign in with the password cannot link (M3 `auth_method`).
  const social = socialBlock(providers, linked, account?.authMethod, authTexts);
  const checks = useMemo(
    () => passwordChecks(values.newPassword, values.confirmPassword, PASSWORD_MIN),
    [values.newPassword, values.confirmPassword],
  );

  // A link flow's outcome (the callback lands here with `?oauth=`): drop the
  // token through the router (so a later `refresh()` does not render it
  // again) and toast it once per notice (`claimNotice`; StrictMode's second
  // effect run and re-renders with the old props are no-ops).
  const search = searchParams.toString();
  useEffect(() => {
    if (!notice) return;
    if (new URLSearchParams(search).has("oauth")) {
      router.replace(withoutParam(pathname, search, "oauth") as Route, { scroll: false });
    }
    if (!claimNotice(`oauth:${notice.issuedAt}:${notice.kind}:${notice.provider}`)) return;
    toast(
      notice.kind === "linked"
        ? { tone: "success", title: notice.message }
        : notice.kind === "demo"
          ? {
              tone: "info",
              title: t.social.demoTitle(notice.provider),
              description: notice.message,
            }
          : {
              tone: "danger",
              title: t.social.errorTitle(notice.provider),
              description: notice.message,
            },
    );
  }, [notice, toast, router, pathname, search, t]);

  const confirmUnlink = async () => {
    if (!unlinkTarget || unlinkInFlight.current) return;
    unlinkInFlight.current = true;
    setUnlinking(true);
    const target = unlinkTarget;
    const result = await runAction((token) => unlinkSocialAccount(target.id, token));
    unlinkInFlight.current = false;
    setUnlinking(false);
    focusRow.current = target.id;
    setUnlinkTarget(null);
    if (!result.ok) {
      toast({ tone: "danger", title: t.social.unlinkFailed, description: result.error });
      // 404: the identity is already gone (another tab, another admin) — re-read the card.
      if (result.code === "not_found") router.refresh();
      return;
    }
    setLinked((current) => current?.filter((id) => id !== target.id) ?? null);
    toast({ tone: "success", title: t.social.unlinked(target.label) });
  };
  // The logout route's `scope=others` outcome (a full page load back here):
  // confirm only a real success; a failure says the sessions are still open.
  useEffect(() => {
    const outcome = othersLogoutNotice(window.location.href, t.others);
    if (!outcome) return;
    window.history.replaceState(window.history.state, "", outcome.cleanUrl);
    toast(outcome.toast);
  }, [toast, t]);

  const labels: Record<PasswordField, string> = {
    currentPassword: t.password.current,
    newPassword: t.password.next,
    confirmPassword: t.password.confirm,
  };
  const summary = PASSWORD_FIELDS.flatMap((name) =>
    errors[name] ? [{ name, label: labels[name], message: errors[name]! }] : [],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schema.safeParse(values);
    if (!local.success) {
      const found: Partial<Record<PasswordField, string>> = {};
      for (const issue of local.error.issues)
        found[issue.path[0] as PasswordField] ??= issue.message;
      setErrors(found);
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((token) => changePassword(values, token));
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const { fieldErrors, formError: message } = partitionFieldErrors(result, PASSWORD_FIELDS);
      setErrors(fieldErrors);
      setFormError(message);
      toast({ tone: "danger", title: t.password.failed, description: message ?? result.error });
      reveal();
      return;
    }
    setValues(EMPTY);
    toast({ tone: "success", title: t.password.changed, description: t.password.changedLead });
  };

  const field = (key: PasswordField, autoComplete: string, hint?: string) => (
    <Field label={labels[key]} name={key} hint={hint} error={errors[key]}>
      {(c) => (
        <PasswordInput
          {...c}
          name={key}
          autoComplete={autoComplete}
          maxLength={128}
          aria-required="true"
          value={values[key]}
          onChange={(event) => {
            const value = event.target.value;
            setValues((current) => ({ ...current, [key]: value }));
            if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
          }}
        />
      )}
    </Field>
  );

  return (
    <Card aria-labelledby="account-title" className="flex flex-col gap-5 p-6">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="user" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id="account-title">{t.account.title}</CardTitle>
          <span className="text-body-sm break-words text-ink-muted">
            {account ? `${account.displayName} · ${account.email}` : t.account.noSession}
            {account?.sessionExpiresAt &&
              ` · ${t.account.sessionUntil(fmt.dateTimeShort(account.sessionExpiresAt))}`}
          </span>
        </div>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        aria-labelledby="password-title"
        aria-busy={busy || undefined}
      >
        <h3 id="password-title" className="m-0 text-label text-ink">
          {t.password.title}
        </h3>
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => void revealFirstError(formRef.current, { name })}
        />
        {account ? (
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={account.email}
            readOnly
            hidden
          />
        ) : null}
        {field("currentPassword", "current-password")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("newPassword", "new-password")}
          {field("confirmPassword", "new-password")}
        </div>
        <PasswordRules checks={checks} min={PASSWORD_MIN} />
        <div role="alert" aria-live="assertive" className="empty:hidden">
          {formError ? (
            <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
              <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
              <span>
                <span className="sr-only">{`${t.password.failed}: `}</span>
                {formError}
              </span>
            </p>
          ) : null}
        </div>
        <Button type="submit" variant="secondary" busy={busy} className="self-start">
          <Icon name="lock" size={18} />
          {busy ? t.password.submitting : t.password.submit}
        </Button>
      </form>

      <span aria-hidden="true" className="h-px bg-line" />

      <div className="flex flex-col gap-2">
        <h3 id="social-title" tabIndex={-1} className="m-0 text-label text-ink">
          {t.social.title}
        </h3>
        {social.kind === "off" ? (
          <p className="m-0 text-body-sm text-ink-muted">{t.social.off}</p>
        ) : social.kind === "unknown" ? (
          <p className="m-0 text-body-sm text-ink-muted">{t.social.unknown}</p>
        ) : (
          <ul aria-labelledby="social-title" className="m-0 flex list-none flex-col gap-2 p-0">
            {social.rows.map((row) => (
              <li
                key={row.id}
                id={`social-row-${row.id}`}
                tabIndex={-1}
                className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
                  {row.label}
                  <Badge tone={row.linked ? "success" : "neutral"}>
                    {row.linked ? t.social.linked : t.social.notLinked}
                  </Badge>
                </span>
                {row.linked ? (
                  <Button
                    id={`social-action-${row.id}`}
                    variant="outline"
                    size="sm"
                    aria-label={t.social.unlinkLabel(row.label)}
                    onClick={() => setUnlinkTarget(row)}
                  >
                    {t.social.unlink}
                  </Button>
                ) : row.linkHref ? (
                  <a
                    id={`social-action-${row.id}`}
                    href={row.linkHref}
                    aria-label={t.social.linkLabel(row.label)}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    {t.social.link}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {social.kind === "rows" && social.linkHint && (
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
            {social.linkHint}
          </p>
        )}
      </div>

      <span aria-hidden="true" className="h-px bg-line" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-label text-ink">{t.others.title}</span>
          <span className="text-caption font-normal text-ink-muted">{t.others.lead}</span>
        </span>
        <Button
          variant="danger"
          onClick={() => {
            setCsrf(readCsrfCookie());
            setOthersOpen(true);
          }}
        >
          <Icon name="logout" size={18} />
          {t.others.button}
        </Button>
      </div>

      <AlertDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open && !unlinkInFlight.current) {
            focusRow.current = unlinkTarget?.id ?? null;
            setUnlinkTarget(null);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Never Radix's default: after a success the «Uzish» that opened the
          // dialog is gone, and focus would fall to <body>.
          event.preventDefault();
          const id = focusRow.current;
          focusRow.current = null;
          unlinkFocusTarget(id)?.focus();
        }}
        title={t.social.confirmTitle(unlinkTarget?.label ?? "")}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{t.social.confirmBody}</p>}
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={unlinking && t.social.busy}>
              {t.social.back}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmUnlink} busy={unlinking}>
            {unlinking ? t.social.unlinking : t.social.unlink}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={othersOpen}
        onOpenChange={setOthersOpen}
        title={t.others.confirmTitle}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{t.others.confirmBody}</p>}
      >
        <form
          method="post"
          action="/admin/auth/logout"
          className="mt-1.5 flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="scope" value="others" />
          <AlertDialogCancel type="button" className={buttonStyles({ variant: "outline" })}>
            {t.others.back}
          </AlertDialogCancel>
          <Button type="submit" variant="destructive">
            {t.others.submit}
          </Button>
        </form>
      </AlertDialog>
    </Card>
  );
}
