import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./icon";

/** Shared look of single-line controls: 44px, 12px radius, visible 3:1 outline. */
export const controlClass =
  "h-11 w-full min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface-raised px-3.5 text-body text-ink transition-colors duration-150 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60";

export const textareaClass =
  "w-full min-w-0 resize-y rounded-md border-[1.5px] border-line-strong bg-surface-raised px-3.5 py-2.5 text-body text-ink transition-colors duration-150 aria-invalid:border-danger";

export const labelClass = "text-label text-ink";

interface FieldProps {
  label: ReactNode;
  children: (control: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Right-aligned helper next to the label, e.g. a character counter. */
  aside?: ReactNode;
  className?: string;
}

/**
 * Label + control + hint/error, wired with `htmlFor`, `aria-describedby` and
 * `aria-invalid` so errors are announced with the field.
 */
export function Field({ label, children, hint, error, aside, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {aside}
      </div>
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-body-sm font-semibold text-ink">
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(textareaClass, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <span className="relative flex">
      <select className={cn(controlClass, "appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={18}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
}

interface AffixInputProps extends ComponentProps<"input"> {
  /** Unit shown inside the field, e.g. "so‘m" or "%". */
  suffix: string;
}

/** Number field with a unit, e.g. prices ("185 000 so‘m"). */
export function AffixInput({ suffix, className, ...rest }: AffixInputProps) {
  return (
    <span
      className={cn(
        "flex h-11 items-center rounded-md border-[1.5px] border-line-strong bg-surface-raised transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-ink has-[[aria-invalid=true]]:border-danger",
        className,
      )}
    >
      <input
        className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3.5 text-[15px] leading-[22px] font-bold text-ink tabular-nums focus-visible:outline-none"
        {...rest}
      />
      <span aria-hidden="true" className="pr-3.5 text-label text-ink-muted">
        {suffix}
      </span>
    </span>
  );
}

interface SearchInputProps extends ComponentProps<"input"> {
  /** Accessible name; the design shows only a placeholder. */
  label: string;
  wrapperClassName?: string;
}

export function SearchInput({ label, wrapperClassName, className, ...rest }: SearchInputProps) {
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-md border border-line-strong bg-surface-raised px-3.5 text-ink-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-ink",
        wrapperClassName,
      )}
    >
      <Icon name="search" size={18} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        className={cn(
          "h-10 min-w-0 flex-1 bg-transparent text-[14px] leading-5 text-ink focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...rest}
      />
    </label>
  );
}
