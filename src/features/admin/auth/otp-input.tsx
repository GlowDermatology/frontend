"use client";

import type { ClipboardEvent, ComponentProps } from "react";

import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * The input of an authenticator code or a recovery code (DESIGN §E "MFA"), for the sign-in's
 * second step and the Settings dialogs. Keeps every prop `Field` hands it (`id`,
 * `aria-describedby`, `aria-invalid`), so labels, errors and the error reveal work as usual.
 *
 * - `totp`: six digits, `inputMode="numeric"`, `autoComplete="one-time-code"` (the phone offers a
 *   code it received), large spaced figures; typing or pasting `123 456` / `123-456` keeps the
 *   digits only, at most six. `onComplete` fires when the sixth digit arrives.
 * - `recovery`: `xxxxx-xxxxx`, no autocomplete or spell check, lower-cased as typed.
 * - `either` (turning MFA off): a code or a recovery code, kept as typed.
 */
export type OtpKind = "totp" | "recovery" | "either";

export function cleanOtp(kind: OtpKind, value: string): string {
  if (kind === "totp") return value.replace(/\D/g, "").slice(0, 6);
  if (kind === "recovery")
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 32);
  return value.slice(0, 32);
}

interface OtpInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type" | "inputMode"
> {
  kind: OtpKind;
  value: string;
  onValueChange: (value: string) => void;
  /** `totp` only: the sixth digit arrived (typed or pasted). */
  onComplete?: (value: string) => void;
}

export function OtpInput({
  kind,
  value,
  onValueChange,
  onComplete,
  className,
  ...rest
}: OtpInputProps) {
  const set = (raw: string) => {
    const next = cleanOtp(kind, raw);
    onValueChange(next);
    if (kind === "totp" && next.length === 6 && next !== value) onComplete?.(next);
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    event.preventDefault();
    set(kind === "either" ? pasted.trim() : pasted);
  };
  return (
    <input
      {...rest}
      type="text"
      value={value}
      onChange={(event) => set(event.target.value)}
      onPaste={onPaste}
      inputMode={kind === "totp" ? "numeric" : "text"}
      pattern={kind === "totp" ? "[0-9]*" : undefined}
      autoComplete={kind === "totp" ? "one-time-code" : "off"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={kind === "totp" ? 6 : 32}
      className={cn(
        controlClass,
        "font-mono tabular-nums",
        kind === "totp"
          ? "h-14 text-center indent-[0.5em] text-[26px] font-semibold tracking-[0.5em]"
          : "tracking-[0.08em]",
        className,
      )}
    />
  );
}
