"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";
import { maskPhone } from "@/lib/phone";

import { commonCopy } from "../copy/common";
import { remainingSeconds } from "./use-shop-action";

/**
 * Form controls of the private pages: a password field with a show/hide
 * toggle, the one-time-code field with its resend countdown, a masked uz
 * phone field and an alert line. Built on the design system's `Field`.
 */

export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "m-0 flex items-start gap-2 rounded-md bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink",
        className,
      )}
    >
      <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger-strong" />
      <span>{children}</span>
    </p>
  );
}

export function FormNote({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className={cn(
        "m-0 flex items-start gap-2 rounded-md bg-success-soft px-3.5 py-3 text-body-sm font-semibold text-ink",
        className,
      )}
    >
      <Icon name="check" size={18} className="mt-px shrink-0 text-success" />
      <span>{children}</span>
    </p>
  );
}

interface PasswordFieldProps extends Omit<ComponentProps<"input">, "type"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  showLabel: string;
  hideLabel: string;
}

export function PasswordField({
  label,
  hint,
  error,
  showLabel,
  hideLabel,
  className,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(control) => (
        <span className="relative flex">
          <TextInput
            {...control}
            {...rest}
            type={visible ? "text" : "password"}
            className="pr-12"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-gold-soft hover:text-ink"
          >
            <Icon name={visible ? "eye-off" : "eye"} size={18} />
          </button>
        </span>
      )}
    </Field>
  );
}

/** "+998 XX XXX XX XX" while typing. */
export function PhoneField({
  label,
  value,
  onValueChange,
  error,
  hint,
  autoFocus,
  name = "phone",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
  name?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(control) => (
        <TextInput
          {...control}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onValueChange(maskPhone(event.target.value) || "")}
        />
      )}
    </Field>
  );
}

/** A countdown to `seconds` after the code was sent; 0 when a resend is allowed. */
export function useCountdown(sentAt: number | null, seconds: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sentAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sentAt]);
  return sentAt === null ? 0 : remainingSeconds(sentAt, seconds, Math.max(now, sentAt));
}

interface CodeFieldProps {
  locale: Locale;
  value: string;
  onValueChange: (value: string) => void;
  /** Where the code went ("+998 90 *** ** 67" / "m***@gmail.com") and how. */
  mask: string;
  channel: "sms" | "email";
  length?: number;
  error?: string;
  /** When the current code was sent (ms) and the resend window (s). */
  sentAt: number | null;
  resendIn: number;
  onResend?: () => void;
  resendPending?: boolean;
  autoFocus?: boolean;
}

/** The one-time code: one numeric field (paste-friendly, `one-time-code` autofill). */
export function CodeField({
  locale,
  value,
  onValueChange,
  mask,
  channel,
  length = 6,
  error,
  sentAt,
  resendIn,
  onResend,
  resendPending,
  autoFocus = true,
}: CodeFieldProps) {
  const copy = commonCopy[locale].code;
  const left = useCountdown(sentAt, resendIn);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-body text-ink-muted">
        {channel === "email" ? copy.sentEmail(mask) : copy.sentSms(mask)}
      </p>
      <Field label={copy.label} error={error}>
        {(control) => (
          <TextInput
            {...control}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={length}
            autoFocus={autoFocus}
            value={value}
            onChange={(event) =>
              onValueChange(event.target.value.replace(/\D/g, "").slice(0, length))
            }
            className="h-14 text-center font-serif text-[28px] tracking-[0.5em] tabular-nums"
          />
        )}
      </Field>
      {onResend ? (
        left > 0 ? (
          <p className="m-0 text-body-sm text-ink-muted" aria-live="off">
            {copy.resendIn(left)}
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendPending}
            className="self-start text-label text-gold-ink underline decoration-gold underline-offset-4 hover:text-ink disabled:opacity-60"
          >
            {copy.resend}
          </button>
        )
      ) : null}
    </div>
  );
}
