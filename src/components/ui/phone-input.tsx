"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";

import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { caretAfterDigits, formatNationalPhone, nationalDigits, phoneValue } from "@/lib/phone";

import { isReasonKey, useDisabledReason, type DisabledReason } from "./disabled-reason";
import { pickerCopy } from "./picker-copy";
import { mergeRefs, pickerShellClass } from "./picker-field";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

/** The national number's shape, shown as the placeholder. */
const NATIONAL_PLACEHOLDER = "90 123 45 67";

export interface PhoneInputProps {
  /** E.164 `+998XXXXXXXXX`, a partial `+998…` while typing, or "" (controlled). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Name of the hidden input carrying the value in a `<form>`. */
  name?: string;
  form?: string;
  id?: string;
  required?: boolean;
  /** A real `disabled` (not focusable); prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the number cannot be changed now and what to do. The field stays focusable but
   * read-only (`aria-disabled`), is described by the reason and shows it in a tooltip on hover,
   * focus and tap. Wins over `disabled`; the value is still submitted.
   */
  disabledReason?: DisabledReason;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  /** The text field (React Hook Form's `field.ref` for `setFocus`). */
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * An Uzbek mobile number: a fixed "+998" in front and the national part
 * shown as `XX XXX XX XX`. Typing, deleting and pasting any common shape
 * ("+998 90 123 45 67", "998901234567", "90-123-45-67") keep the caret after
 * the same digit; Backspace or Delete next to a space removes the digit
 * beyond it. The value is "+998" + the digits so far (E.164 when complete) or
 * "", carried by a hidden input named `name`.
 */
export function PhoneInput({
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  id,
  required,
  disabled: disabledProp,
  disabledReason,
  readOnly: readOnlyProp,
  placeholder,
  autoFocus,
  onBlur,
  ref,
  className,
  ...aria
}: PhoneInputProps) {
  const t = useCopy(pickerCopy);
  const prefixId = useId();
  const why = useDisabledReason(disabledReason, cn(prefixId, aria["aria-describedby"]));
  const locked = why.reason !== null;
  const disabled = locked ? false : disabledProp;
  const readOnly = Boolean(readOnlyProp) || locked;
  const input = useRef<HTMLInputElement>(null);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => phoneValue(defaultValue ?? ""));
  const current = controlled ? value : inner;
  const text = formatNationalPhone(current);
  /** Where the caret goes after the next render (digits before it); a new object re-renders. */
  const [caret, setCaret] = useState<{ digits: number } | null>(null);

  useLayoutEffect(() => {
    const node = input.current;
    if (!caret || !node || document.activeElement !== node) return;
    const position = caretAfterDigits(node.value, caret.digits);
    node.setSelectionRange(position, position);
  }, [caret]);

  const commit = (digits: string, caretDigits: number) => {
    const next = phoneValue(digits);
    if (!controlled) setInner(next);
    if (next !== current) onValueChange?.(next);
    setCaret({ digits: Math.min(caretDigits, nationalDigits(digits).length) });
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const selection = event.target.selectionStart ?? raw.length;
    const digits = nationalDigits(raw);
    // A pasted "+998 …" loses its country code: count the caret's digits in the national part.
    const before = nationalDigits(raw.slice(0, selection)).length;
    const caretDigits = raw.trim().startsWith("+") || /^\s*998/.test(raw) ? digits.length : before;
    commit(digits, selection >= raw.length ? digits.length : caretDigits);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (locked) {
      if (event.key !== "Enter" && isReasonKey(event)) why.reveal();
      return;
    }
    if (readOnly) return;
    const node = event.currentTarget;
    const start = node.selectionStart;
    if (start === null || start !== node.selectionEnd) return;
    const digits = nationalDigits(node.value);
    const before = nationalDigits(node.value.slice(0, start)).length;
    if (event.key === "Backspace" && node.value[start - 1] === " " && before > 0) {
      event.preventDefault();
      commit(digits.slice(0, before - 1) + digits.slice(before), before - 1);
    } else if (event.key === "Delete" && node.value[start] === " " && before < digits.length) {
      event.preventDefault();
      commit(digits.slice(0, before) + digits.slice(before + 1), before);
    }
  };

  const invalid = aria["aria-invalid"] === true || aria["aria-invalid"] === "true";
  /* A tap or click on a disabled-reason field shows the reason (Radix would close the tooltip). */
  const revealReason = (event: MouseEvent<HTMLInputElement>) => {
    event.preventDefault();
    why.reveal();
  };

  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <TooltipTrigger asChild>
        <div className={cn(pickerShellClass, className)} data-picker="phone" data-reveal-box="">
          <span
            aria-hidden="true"
            onPointerDown={(event) => {
              event.preventDefault();
              input.current?.focus();
            }}
            className="ml-3.5 flex h-6 shrink-0 cursor-text items-center border-r border-line pr-2.5 text-body font-semibold text-ink-muted tabular-nums select-none"
          >
            +998
          </span>
          <span id={prefixId} className="sr-only">
            {t.phone.countryCode}
          </span>
          <input
            {...aria}
            ref={mergeRefs(ref, input)}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus={autoFocus}
            placeholder={placeholder ?? NATIONAL_PLACEHOLDER}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={invalid || undefined}
            {...why.props}
            value={text}
            onChange={onChange}
            onClick={locked ? revealReason : undefined}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className="h-full min-w-0 flex-1 rounded-md bg-transparent px-2.5 text-body text-ink tabular-nums outline-none placeholder:text-ink-muted disabled:cursor-not-allowed data-disabled:cursor-not-allowed"
          />
          {name && <input type="hidden" name={name} form={form} value={current} />}
          {why.text}
        </div>
      </TooltipTrigger>
      {why.bubble}
    </TooltipRoot>
  );
}
