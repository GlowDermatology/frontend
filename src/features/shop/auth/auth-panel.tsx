"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  completeSocialSignIn,
  registerAccount,
  resetPassword,
  sendSignInCode,
  signIn,
  socialNonce,
  socialSignIn,
  verifySignInCode,
  type CodeSent,
  type SignInOutcome,
} from "@/data/shop/auth.actions";
import type { ActionResult } from "@/data/types";
import type { SocialProvider } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { CodeField, FormAlert, PasswordField } from "../account/controls";
import { failureText, useShopAction } from "../account/use-shop-action";
import { authCopy } from "../copy/auth";
import { shopHref } from "../routing/routes";
import { runShopAction } from "../shared/action-client";
import { formatIdentifierInput, looksLike, parseIdentifier } from "./identifier";
import { SocialButtons, type SocialToken } from "./social-buttons";
import type { SocialConfig } from "./social-config";

/**
 * The sign-in page's island: one "phone or e-mail" field (hybrid identity,
 * B-W2) for signing in, signing up and resetting the password, the code
 * step (resend countdown), the new-device step of a password sign-in, and
 * the social sign-in buttons with the "link a phone now or later" step.
 * Tokens never reach the browser: each successful step ends in a full
 * navigation to `next`, so the static header re-reads the signed-in hint.
 */

export type AuthMode = "signin" | "signup" | "reset";

type CodePurpose = "register" | "reset_password" | "login_new_device" | "link_social";

type Step =
  | { name: "form" }
  | { name: "code"; purpose: CodePurpose; sent: CodeSent & { at: number } }
  | { name: "details"; token: string }
  | { name: "newPassword"; token: string }
  | {
      name: "social";
      ticket: string;
      provider: SocialProvider;
      suggestedName: string;
    }
  | {
      name: "socialLink";
      ticket: string;
      sent: (CodeSent & { at: number }) | null;
    }
  | { name: "socialFinish"; ticket: string; token: string | null; customerExists: boolean }
  | { name: "done" };

interface AuthPanelProps {
  locale: Locale;
  mode: AuthMode;
  next: string;
  termsVersion: string | null;
  termsHref: string;
  privacyHref: string;
  social: SocialConfig;
}

function Heading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 id="page-title" className="m-0 font-serif text-headline-sm font-semibold text-ink">
        {title}
      </h1>
      {lead ? <p className="m-0 text-body text-pretty text-ink-muted">{lead}</p> : null}
    </div>
  );
}

function TermsConsent({
  locale,
  checked,
  onChange,
  termsHref,
  privacyHref,
  error,
}: {
  locale: Locale;
  checked: boolean;
  onChange: (value: boolean) => void;
  termsHref: string;
  privacyHref: string;
  error?: string;
}) {
  const copy = authCopy[locale].terms;
  const link = "font-semibold text-gold-ink underline decoration-gold underline-offset-4";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-start gap-3 text-body-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--gd-gold-ink)]"
        />
        <span>
          {copy.before}
          <a href={termsHref} target="_blank" rel="noopener" className={link}>
            {copy.terms}
          </a>
          {copy.middle}
          <a href={privacyHref} target="_blank" rel="noopener" className={link}>
            {copy.privacy}
          </a>
          {copy.after}
        </span>
      </label>
      {error ? <p className="m-0 text-body-sm font-semibold text-danger-strong">{error}</p> : null}
    </div>
  );
}

export function AuthPanel({
  locale,
  mode: initialMode,
  next,
  termsVersion,
  termsHref,
  privacyHref,
  social,
}: AuthPanelProps) {
  const copy = authCopy[locale];
  const { run, pending, error, setError } = useShopAction(locale);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<Step>({ name: "form" });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();
  const [linkPassword, setLinkPassword] = useState<string | null>(null);
  const [socialError, setSocialError] = useState(false);

  const parsed = parseIdentifier(identifier);
  const identifierValid = parsed.kind === "phone" || parsed.kind === "email";

  const switchMode = (value: AuthMode) => {
    setMode(value);
    setStep({ name: "form" });
    setError(null);
    setCode("");
    setPassword("");
    const url = shopHref(
      locale,
      { kind: "signIn" },
      {
        mode: value === "signin" ? undefined : value,
        next: next === "/" ? undefined : next,
      },
    );
    window.history.replaceState(null, "", url);
  };

  /** A finished sign-in: a full navigation, so the static header sees the new hint. */
  const finish = (result: ActionResult<SignInOutcome>): boolean => {
    if (!result.ok) return false;
    const outcome = result.data;
    if (outcome.kind === "done") {
      setStep({ name: "done" });
      window.location.assign(outcome.next);
      return true;
    }
    if (outcome.kind === "verify_device") {
      setCode("");
      setStep({ name: "code", purpose: "login_new_device", sent: { ...outcome, at: Date.now() } });
      return true;
    }
    setStep({
      name: "social",
      ticket: outcome.ticket,
      provider: outcome.provider,
      suggestedName: "",
    });
    return true;
  };

  const sendCode = async (purpose: CodePurpose, ticket?: string) => {
    const result = await run((csrf) =>
      sendSignInCode({
        locale,
        identifier,
        purpose,
        socialTicket: ticket ?? null,
        csrf,
      }),
    );
    if (!result.ok) return null;
    setCode("");
    return { ...result.data, at: Date.now() };
  };

  /* --- the first form: sign in, sign up, reset -------------------------- */

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "signin") {
      finish(await run((csrf) => signIn({ locale, identifier, password, next, csrf })));
      return;
    }
    const purpose = mode === "signup" ? "register" : "reset_password";
    const sent = await sendCode(purpose);
    if (sent) setStep({ name: "code", purpose, sent });
  };

  /* --- the code step ----------------------------------------------------- */

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "code") return;
    const purpose = step.purpose;
    const verified = await run((csrf) =>
      verifySignInCode({ locale, identifier, purpose, code, csrf }),
    );
    if (!verified.ok) return;
    const token = verified.data.token;
    if (purpose === "register") setStep({ name: "details", token });
    else if (purpose === "reset_password") setStep({ name: "newPassword", token });
    else if (purpose === "login_new_device") {
      finish(
        await run((csrf) =>
          signIn({ locale, identifier, password, verificationToken: token, next, csrf }),
        ),
      );
    }
  };

  const resend = async () => {
    if (step.name !== "code") return;
    if (step.purpose === "login_new_device") {
      // Contract §2.1.4: a new-device code is re-sent by signing in again.
      const result = await run((csrf) => signIn({ locale, identifier, password, next, csrf }));
      if (result.ok && result.data.kind === "verify_device") {
        setStep({ ...step, sent: { ...result.data, at: Date.now() } });
      } else finish(result);
      return;
    }
    const sent = await sendCode(step.purpose);
    if (sent) setStep({ ...step, sent });
  };

  /* --- registration details and the new password ------------------------ */

  const submitDetails = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "details") return;
    if (!terms) {
      setTermsError(copy.terms.required);
      return;
    }
    setTermsError(undefined);
    finish(
      await run((csrf) =>
        registerAccount({
          locale,
          verificationToken: step.token,
          name,
          password,
          termsVersion: termsVersion ?? "",
          next,
          csrf,
        }),
      ),
    );
  };

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "newPassword") return;
    finish(
      await run((csrf) =>
        resetPassword({ locale, verificationToken: step.token, password, next, csrf }),
      ),
    );
  };

  /* --- social sign-in ---------------------------------------------------- */

  const getNonce = async () => {
    const result = await runShopAction(locale, (csrf) => socialNonce({ locale, csrf }));
    return result.ok ? result.data.nonce : null;
  };

  const onSocialToken = async (token: SocialToken) => {
    setSocialError(false);
    const result = await run((csrf) =>
      socialSignIn({
        locale,
        provider: token.provider,
        token: token.token,
        tokenType: token.tokenType,
        nonce: token.nonce,
        authorizationCode: token.authorizationCode,
        next,
        csrf,
      }),
    );
    if (result.ok && result.data.kind === "verify_phone") {
      setName(token.name ?? "");
      setStep({
        name: "social",
        ticket: result.data.ticket,
        provider: result.data.provider,
        suggestedName: token.name ?? "",
      });
      return;
    }
    finish(result);
  };

  const submitSocialSkip = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "social" && step.name !== "socialFinish") return;
    if (!terms) {
      setTermsError(copy.terms.required);
      return;
    }
    setTermsError(undefined);
    const token = step.name === "socialFinish" ? step.token : null;
    finish(
      await run((csrf) =>
        completeSocialSignIn({
          locale,
          ticket: step.ticket,
          verificationToken: token,
          name,
          termsVersion: termsVersion ?? "",
          next,
          csrf,
        }),
      ),
    );
  };

  const submitSocialLink = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "socialLink") return;
    if (!step.sent) {
      const sent = await sendCode("link_social", step.ticket);
      if (sent) setStep({ ...step, sent });
      return;
    }
    const verified = await run((csrf) =>
      verifySignInCode({ locale, identifier, purpose: "link_social", code, csrf }),
    );
    if (!verified.ok) return;
    const token = verified.data.token;
    if (!verified.data.customerExists) {
      setStep({ name: "socialFinish", ticket: step.ticket, token, customerExists: false });
      return;
    }
    // An existing account: link at once (its password is asked if it has one).
    const result = await run((csrf) =>
      completeSocialSignIn({
        locale,
        ticket: step.ticket,
        verificationToken: token,
        next,
        csrf,
      }),
    );
    if (!result.ok && result.fieldErrors?.password) {
      setStep({ name: "socialFinish", ticket: step.ticket, token, customerExists: true });
      setLinkPassword("");
      return;
    }
    finish(result);
  };

  const submitExistingPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (step.name !== "socialFinish" || !step.customerExists) return;
    finish(
      await run((csrf) =>
        completeSocialSignIn({
          locale,
          ticket: step.ticket,
          verificationToken: step.token,
          password: linkPassword,
          next,
          csrf,
        }),
      ),
    );
  };

  /* --- rendering --------------------------------------------------------- */

  const message = error ? failureText(error, locale) : "";
  const fieldMessage = (key: string) => error?.fieldErrors?.[key];
  const alert = message && !error?.fieldErrors ? <FormAlert>{message}</FormAlert> : null;
  const identifierError =
    fieldMessage("identifier") ?? fieldMessage("phone") ?? fieldMessage("email");
  const passwordProps = {
    showLabel: copy.fields.showPassword,
    hideLabel: copy.fields.hidePassword,
  };
  const back = (
    <Button
      variant="ghost"
      onClick={() => {
        setStep({ name: "form" });
        setError(null);
      }}
      className="self-start px-2"
    >
      <Icon name="chevron-left" size={18} />
      {copy.code.back}
    </Button>
  );

  if (step.name === "done") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Icon name="check" size={28} strokeWidth={2} />
        </span>
        <p className="m-0 font-serif text-headline-sm font-semibold text-ink">
          {copy.done.welcome}
        </p>
        <p className="m-0 text-body text-ink-muted">{copy.done.redirecting}</p>
      </div>
    );
  }

  if (step.name === "code") {
    const isNewDevice = step.purpose === "login_new_device";
    return (
      <form className="flex flex-col gap-5" onSubmit={submitCode} noValidate>
        {back}
        <Heading
          title={isNewDevice ? copy.code.newDeviceTitle : copy.code.title}
          lead={isNewDevice ? copy.code.newDeviceLead : undefined}
        />
        <CodeField
          locale={locale}
          value={code}
          onValueChange={setCode}
          mask={step.sent.mask}
          channel={step.sent.channel}
          length={step.sent.length}
          sentAt={step.sent.at}
          resendIn={step.sent.resendIn}
          onResend={() => void resend()}
          resendPending={pending}
          error={fieldMessage("code")}
        />
        {message && !fieldMessage("code") ? <FormAlert>{message}</FormAlert> : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending || code.length < step.sent.length}
          aria-busy={pending || undefined}
        >
          {copy.code.verify}
        </Button>
      </form>
    );
  }

  if (step.name === "details") {
    return (
      <form className="flex flex-col gap-5" onSubmit={submitDetails} noValidate>
        <Heading title={copy.signUp.detailsTitle} />
        <Field label={copy.fields.name} error={fieldMessage("name")}>
          {(control) => (
            <TextInput
              {...control}
              name="name"
              autoComplete="name"
              placeholder={copy.fields.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          )}
        </Field>
        <PasswordField
          {...passwordProps}
          label={copy.fields.password}
          hint={copy.fields.passwordRules}
          autoComplete="new-password"
          name="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldMessage("password")}
        />
        <TermsConsent
          locale={locale}
          checked={terms}
          onChange={setTerms}
          termsHref={termsHref}
          privacyHref={privacyHref}
          error={termsError ?? fieldMessage("terms_version")}
        />
        {message && !error?.fieldErrors ? <FormAlert>{message}</FormAlert> : null}
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
          {copy.signUp.create}
        </Button>
      </form>
    );
  }

  if (step.name === "newPassword") {
    return (
      <form className="flex flex-col gap-5" onSubmit={submitNewPassword} noValidate>
        <Heading title={copy.reset.newPasswordTitle} />
        <PasswordField
          {...passwordProps}
          label={copy.fields.newPassword}
          hint={copy.fields.passwordRules}
          autoComplete="new-password"
          name="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldMessage("password")}
          autoFocus
        />
        {alert}
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
          {copy.reset.save}
        </Button>
      </form>
    );
  }

  if (step.name === "social" || (step.name === "socialFinish" && !step.customerExists)) {
    const linked = step.name === "socialFinish";
    return (
      <form className="flex flex-col gap-5" onSubmit={submitSocialSkip} noValidate>
        <Heading
          title={copy.social.completeTitle}
          lead={linked ? undefined : copy.social.completeLead}
        />
        <Field label={copy.fields.name} error={fieldMessage("name")}>
          {(control) => (
            <TextInput
              {...control}
              name="name"
              autoComplete="name"
              placeholder={copy.fields.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <TermsConsent
          locale={locale}
          checked={terms}
          onChange={setTerms}
          termsHref={termsHref}
          privacyHref={privacyHref}
          error={termsError ?? fieldMessage("terms_version")}
        />
        {message && !error?.fieldErrors ? <FormAlert>{message}</FormAlert> : null}
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
          {linked ? copy.signUp.create : copy.social.skip}
        </Button>
        {!linked ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setError(null);
              setStep({ name: "socialLink", ticket: step.ticket, sent: null });
            }}
          >
            {copy.social.withPhone}
          </Button>
        ) : null}
      </form>
    );
  }

  if (step.name === "socialFinish") {
    return (
      <form className="flex flex-col gap-5" onSubmit={submitExistingPassword} noValidate>
        <Heading title={copy.social.completeTitle} lead={copy.social.existingPasswordHint} />
        <PasswordField
          {...passwordProps}
          label={copy.social.existingPassword}
          autoComplete="current-password"
          value={linkPassword ?? ""}
          onChange={(event) => setLinkPassword(event.target.value)}
          error={fieldMessage("password")}
          autoFocus
        />
        {alert}
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
          {copy.code.verify}
        </Button>
      </form>
    );
  }

  if (step.name === "socialLink") {
    return (
      <form className="flex flex-col gap-5" onSubmit={submitSocialLink} noValidate>
        <Heading title={copy.social.completeTitle} />
        {!step.sent ? (
          <IdentifierField
            locale={locale}
            value={identifier}
            onChange={setIdentifier}
            error={identifierError}
          />
        ) : (
          <CodeField
            locale={locale}
            value={code}
            onValueChange={setCode}
            mask={step.sent.mask}
            channel={step.sent.channel}
            length={step.sent.length}
            sentAt={step.sent.at}
            resendIn={step.sent.resendIn}
            onResend={() =>
              void sendCode("link_social", step.ticket).then(
                (sent) => sent && setStep({ ...step, sent }),
              )
            }
            resendPending={pending}
            error={fieldMessage("code")}
          />
        )}
        {message && !error?.fieldErrors ? <FormAlert>{message}</FormAlert> : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending || (!step.sent && !identifierValid)}
          aria-busy={pending || undefined}
        >
          {step.sent ? copy.code.verify : copy.signUp.submit}
        </Button>
      </form>
    );
  }

  /* --- step "form" -------------------------------------------------------- */

  const title =
    mode === "signin"
      ? copy.signIn.title
      : mode === "signup"
        ? copy.signUp.title
        : copy.reset.title;
  const lead =
    mode === "signin" ? copy.signIn.lead : mode === "signup" ? copy.signUp.lead : copy.reset.lead;
  const registrationClosed = mode === "signup" && !termsVersion;

  return (
    <div className="flex flex-col gap-6">
      <Heading title={title} lead={lead} />
      {mode !== "reset" ? (
        <div
          role="tablist"
          aria-label={copy.eyebrow}
          className="grid grid-cols-2 gap-1 rounded-md bg-gold-soft p-1"
        >
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={cn(
                "h-10 rounded-[9px] text-label transition-[background-color,box-shadow] duration-150",
                mode === value
                  ? "bg-surface-raised text-ink shadow-sm"
                  : "text-ink hover:bg-surface-raised/50",
              )}
            >
              {value === "signin" ? copy.signIn.submit : copy.signUp.title}
            </button>
          ))}
        </div>
      ) : null}
      <form className="flex flex-col gap-5" onSubmit={submitForm} noValidate>
        <IdentifierField
          locale={locale}
          value={identifier}
          onChange={setIdentifier}
          error={identifierError}
          autoFocus
        />
        {mode === "signin" ? (
          <PasswordField
            {...passwordProps}
            label={copy.fields.password}
            autoComplete="current-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldMessage("password")}
          />
        ) : null}
        {registrationClosed ? <FormAlert>{copy.terms.unavailable}</FormAlert> : null}
        {message && !identifierError && !fieldMessage("password") ? (
          <FormAlert>{message}</FormAlert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={
            pending ||
            registrationClosed ||
            !identifierValid ||
            (mode === "signin" && password.length === 0)
          }
          aria-busy={pending || undefined}
        >
          {mode === "signin"
            ? copy.signIn.submit
            : mode === "signup"
              ? copy.signUp.submit
              : copy.reset.submit}
        </Button>
        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="self-center text-label text-gold-ink underline decoration-gold underline-offset-4 hover:text-ink"
          >
            {copy.signIn.forgot}
          </button>
        ) : mode === "reset" ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="self-center text-label text-gold-ink underline decoration-gold underline-offset-4 hover:text-ink"
          >
            {copy.reset.back}
          </button>
        ) : null}
      </form>
      {mode !== "reset" && (social.google || social.facebook || social.apple) ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-caption text-ink-muted uppercase">
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            {copy.social.or}
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <SocialButtons
            locale={locale}
            config={social}
            getNonce={getNonce}
            onToken={(token) => void onSocialToken(token)}
            onError={() => setSocialError(true)}
            pending={pending}
          />
          {socialError ? <FormAlert>{copy.social.failed}</FormAlert> : null}
        </div>
      ) : null}
    </div>
  );
}

function IdentifierField({
  locale,
  value,
  onChange,
  error,
  autoFocus,
}: {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const copy = authCopy[locale].fields;
  const kind = looksLike(value);
  return (
    <Field
      label={copy.identifier}
      error={error}
      hint={
        kind === "phone"
          ? copy.identifierHintPhone
          : kind === "email"
            ? copy.identifierHintEmail
            : undefined
      }
    >
      {(control) => (
        <span className="relative flex">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          >
            <Icon name={kind === "email" ? "mail" : "phone"} size={18} />
          </span>
          <TextInput
            {...control}
            name="username"
            type="text"
            inputMode={kind === "phone" ? "tel" : kind === "email" ? "email" : "text"}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={copy.identifierPlaceholder}
            value={value}
            onChange={(event) => onChange(formatIdentifierInput(event.target.value))}
            autoFocus={autoFocus}
            className="pl-10"
          />
        </span>
      )}
    </Field>
  );
}
