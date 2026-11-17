"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  leaveMfaStep,
  verifyMfaStep,
  type MfaFactor,
  type MfaStepState,
} from "@/data/mfa-step.actions";
import { isRecoveryCode, isTotpCode } from "@/data/mfa.schema";
import { mfaDataCopy } from "@/domain/copy/mfa";
import { cn } from "@/lib/cn";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";

import { formatClock, useCountdown } from "./countdown";
import { mfaStepCopy } from "./mfa-copy";
import { OtpInput } from "./otp-input";

interface MfaStepFormProps {
  /** The current `gd_csrf` cookie value (double-submit token). */
  csrf: string;
  /** Seconds the challenge has left (server time), for the countdown. */
  secondsLeft: number;
  /** The validated `next` (a fallback for the actions when the cookie expired meanwhile). */
  next: string;
  /** Mock mode: the demo code is shown. */
  demo?: boolean;
}

const INITIAL: MfaStepState = {
  factor: "totp",
  codeError: null,
  formError: null,
  retryAfter: null,
  attempt: 0,
};

/**
 * The sign-in's second step (DESIGN §E "MFA") in the staff auth card: the authenticator code (or,
 * after the toggle, a recovery code), a countdown to the challenge's expiry, and «back to
 * sign-in». The challenge itself never reaches this component: the Server Action reads it from the
 * step page's HttpOnly cookie. A wrong code keeps the step (the field says why and is revealed);
 * throttling shows the wait and holds the button until it passes; at 0:00 the form gives way to
 * the expired state.
 */
export function MfaStepForm({ csrf, secondsLeft, next, demo = false }: MfaStepFormProps) {
  const t = useCopy(mfaStepCopy);
  const m = useCopy(mfaDataCopy);
  const [state, formAction, pending] = useActionState(verifyMfaStep, INITIAL);
  const [factor, setFactor] = useState<MfaFactor>("totp");
  const [code, setCode] = useState("");
  // A refused code is not worth keeping: each answer clears the field for the next one.
  const [answered, setAnswered] = useState(0);
  if (answered !== state.attempt) {
    setAnswered(state.attempt);
    setCode("");
  }
  const [localError, setLocalError] = useState<string | null>(null);
  // The answer's error stays until the code is edited.
  const [shownAttempt, setShownAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reveal = useErrorReveal(formRef);
  const left = useCountdown(secondsLeft) ?? secondsLeft;
  const wait = useCountdown(state.retryAfter, state.attempt);
  const expired = left <= 0;
  const waiting = wait !== null && wait > 0;

  const answerError = state.attempt === shownAttempt ? null : state.codeError;
  const codeError = localError ?? answerError;

  useEffect(() => {
    if (state.attempt === 0) return;
    if (state.codeError) reveal();
    else if (state.formError) inputRef.current?.focus();
  }, [state, reveal]);

  const switchFactor = () => {
    setFactor((current) => (current === "totp" ? "recovery" : "totp"));
    setCode("");
    setLocalError(null);
    setShownAttempt(state.attempt);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const value = code.trim();
    const valid = factor === "totp" ? isTotpCode(value) : isRecoveryCode(value);
    if (!valid || expired || waiting || pending) {
      event.preventDefault();
      if (!valid) {
        const empty = value.length === 0;
        setLocalError(
          factor === "totp"
            ? empty
              ? m.codeRequired
              : m.codeFormat
            : empty
              ? m.recoveryRequired
              : m.recoveryFormat,
        );
        reveal();
      }
      return;
    }
    setLocalError(null);
  };

  if (expired) {
    return (
      <div className="flex flex-col gap-5" data-mfa-expired="">
        <div
          role="alert"
          className="flex animate-fade-in items-start gap-3 rounded-md border border-warning/40 bg-warning-soft px-4 py-3.5 text-body-sm text-ink"
        >
          <Icon name="clock" size={18} className="mt-px shrink-0 text-warning" />
          <span className="flex flex-col gap-1">
            <span className="font-semibold">{t.expiredTitle}</span>
            <span>{t.expiredLead}</span>
          </span>
        </div>
        <form action={leaveMfaStep}>
          <input type="hidden" name="fallbackNext" value={next} />
          <input type="hidden" name="expired" value="1" />
          <Button type="submit" size="lg" className="w-full">
            <Icon name="arrow-right" size={18} className="rotate-180" />
            {t.back}
          </Button>
        </form>
      </div>
    );
  }

  const clock = formatClock(left);
  return (
    <div className="flex flex-col gap-6">
      <p
        className={cn(
          "m-0 flex items-center gap-2.5 self-start rounded-full border px-3 py-1.5 text-body-sm tabular-nums",
          left <= 60
            ? "border-warning/45 bg-warning-soft text-ink"
            : "border-line bg-surface text-ink-muted",
        )}
      >
        <Icon name="clock" size={16} className={left <= 60 ? "text-warning" : "text-gold-ink"} />
        <span role="timer" aria-live="off">
          {t.remaining(clock)}
        </span>
      </p>
      {/* One announcement when a minute is left, instead of a ticking live region. */}
      <p className="sr-only" aria-live="polite">
        {left <= 60 ? t.remainingSoon : ""}
      </p>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5"
        aria-busy={pending || undefined}
      >
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="factor" value={factor} />
        <input type="hidden" name="fallbackNext" value={next} />
        <p className="m-0 text-body-sm text-pretty text-ink-muted">
          {factor === "totp" ? t.lead : t.leadRecovery}
        </p>
        <Field
          key={factor}
          name="code"
          label={factor === "totp" ? t.code : t.recovery}
          hint={factor === "totp" ? t.codeHint : t.recoveryHint}
          error={codeError ?? undefined}
        >
          {(control) => (
            <OtpInput
              {...control}
              ref={inputRef}
              kind={factor}
              name="code"
              value={code}
              aria-required="true"
              autoFocus
              placeholder={factor === "recovery" ? t.recoveryPlaceholder : undefined}
              onValueChange={(value) => {
                setCode(value);
                setLocalError(null);
                setShownAttempt(state.attempt);
              }}
              onComplete={() => {
                // A whole code typed or pasted: submit it (once; the action holds further posts).
                if (!pending && !waiting) {
                  window.requestAnimationFrame(() => formRef.current?.requestSubmit());
                }
              }}
            />
          )}
        </Field>

        <div role="alert" aria-live="assertive" className="empty:hidden">
          {state.formError && state.attempt !== shownAttempt ? (
            <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
              <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
              <span>
                <span className="sr-only">{`${t.failed}: `}</span>
                {waiting ? t.waitReason(formatClock(wait)) : state.formError}
              </span>
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          size="lg"
          busy={pending}
          disabledReason={waiting ? t.waitReason(formatClock(wait)) : null}
          className="w-full"
        >
          {pending ? t.submitting : t.submit}
        </Button>

        <button
          type="button"
          onClick={switchFactor}
          className="self-center rounded-sm text-body-sm font-semibold text-gold-ink underline decoration-gold/50 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
        >
          {factor === "totp" ? t.useRecovery : t.useApp}
        </button>
      </form>

      <p className="m-0 flex items-start gap-2 rounded-md bg-surface px-3.5 py-3 text-body-sm text-pretty text-ink-muted">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
        {t.help}
      </p>
      {demo ? <p className="m-0 text-caption text-ink-muted">{t.demo}</p> : null}

      <form action={leaveMfaStep} className="flex justify-center">
        <input type="hidden" name="fallbackNext" value={next} />
        <Button type="submit" variant="ghost">
          <Icon name="arrow-right" size={18} className="rotate-180" />
          {t.back}
        </Button>
      </form>
    </div>
  );
}
