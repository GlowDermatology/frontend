"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Field, TextInput } from "@/components/ui/field";

import { isoDateParam } from "./url-state";

export interface DateRangePatch {
  dateFrom?: string;
  dateTo?: string;
}

interface DateRangeFieldsProps {
  /** The committed days (from the URL, or the dialog's state). */
  from?: string;
  to?: string;
  /** Called with the one side that changed; the caller navigates or stores it. */
  onCommit: (patch: DateRangePatch) => void;
  /**
   * `toolbar` (default): compact inline "Sanadan … gacha" for the list
   * toolbars. `form`: two labelled fields with their own error lines, for a
   * dialog form; Enter then submits the form as usual (the form reads the
   * inputs' current values, so a draft that has not settled yet is included).
   */
  variant?: "toolbar" | "form";
  /** The latest selectable day for both sides (e.g. today). */
  max?: string;
  /** Field names of the two inputs (default `date_from` / `date_to`). */
  names?: { from: string; to: string };
  /** Validation messages per side (`form` variant). */
  errors?: { from?: string; to?: string };
}

/** How long a complete, plausible day waits for more typing before it is applied. */
const SETTLE_MS = 500;

const dateInput = "h-11 w-[150px] text-[14px] tabular-nums";

/**
 * One day of the range as a local draft over the URL value. A date input
 * fires `change` for every digit of the year once the other segments are
 * filled (`0002-10-20`, `0020-10-20`, …), so a value is applied only when it
 * is a plausible day (`isoDateParam`) and the typing settled, or at once on
 * Enter or blur; clearing applies on Enter or blur. An implausible draft is
 * dropped on blur. A new URL value replaces the draft.
 */
function DayField({
  name,
  label,
  ariaLabel,
  value,
  min,
  max,
  onCommit,
  variant,
  error,
}: {
  name: string;
  label: string;
  ariaLabel: string;
  value?: string;
  min?: string;
  max?: string;
  onCommit: (value: string | undefined) => void;
  variant: "toolbar" | "form";
  error?: string;
}) {
  const committed = value ?? "";
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const timer = useRef<number | undefined>(undefined);
  /** The value last handed to `onCommit`, until the URL catches up (no double navigation). */
  const applied = useRef<string | null>(null);

  if (seen !== committed) {
    setSeen(committed);
    setDraft(committed);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    applied.current = null;
  }, [committed]);

  const apply = (next: string) => {
    window.clearTimeout(timer.current);
    if (next === committed || next === applied.current) return;
    if (next !== "" && !isoDateParam(next)) return;
    applied.current = next;
    onCommit(next || undefined);
  };

  const input = (control: { id?: string; "aria-describedby"?: string; "aria-invalid"?: true }) => (
    <TextInput
      {...control}
      type="date"
      name={name}
      aria-label={variant === "toolbar" ? ariaLabel : undefined}
      className={variant === "toolbar" ? dateInput : "tabular-nums"}
      value={draft}
      min={min}
      max={max}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        window.clearTimeout(timer.current);
        if (next !== "" && next !== committed && isoDateParam(next)) {
          timer.current = window.setTimeout(() => apply(next), SETTLE_MS);
        }
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") return;
        // In a toolbar Enter only applies the day; in a form it also submits.
        if (variant === "toolbar") event.preventDefault();
        apply(event.currentTarget.value);
      }}
      onBlur={(event) => {
        const next = event.currentTarget.value;
        if (next === "" || isoDateParam(next)) apply(next);
        else {
          window.clearTimeout(timer.current);
          // A form keeps the draft so its own validation can name the problem.
          if (variant === "toolbar") setDraft(committed);
        }
      }}
    />
  );

  if (variant === "form") {
    return (
      <Field label={label} error={error}>
        {(control) => input(control)}
      </Field>
    );
  }
  return (
    <label className="flex items-center gap-2">
      <span className="text-body-sm whitespace-nowrap text-ink-muted">{label}</span>
      {input({})}
    </label>
  );
}

/** The earlier of two `YYYY-MM-DD` days (either may be missing). */
function earlier(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

/**
 * The "Sanadan … gacha" day range of the list toolbars (and, as `form`, of
 * the dashboard's custom-range dialog), kept together as one group so the
 * range wraps as a unit. Both variants share the draft rules above, so typing
 * a year digit by digit never applies `0002-10-20`.
 */
export function DateRangeFields({
  from,
  to,
  onCommit,
  variant = "toolbar",
  max,
  names = { from: "date_from", to: "date_to" },
  errors,
}: DateRangeFieldsProps) {
  const fromField = (
    <DayField
      name={names.from}
      label="Sanadan"
      ariaLabel="Sanadan"
      value={from}
      max={earlier(isoDateParam(to), max)}
      onCommit={(dateFrom) => onCommit({ dateFrom })}
      variant={variant}
      error={errors?.from}
    />
  );
  const toField = (
    <DayField
      name={names.to}
      label={variant === "form" ? "Sanagacha" : "gacha"}
      ariaLabel="Sanagacha"
      value={to}
      min={isoDateParam(from)}
      max={max}
      onCommit={(dateTo) => onCommit({ dateTo })}
      variant={variant}
      error={errors?.to}
    />
  );
  if (variant === "form") {
    return (
      <div
        role="group"
        aria-label="Sana oralig‘i"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3"
      >
        {fromField}
        {toField}
      </div>
    );
  }
  return (
    <div role="group" aria-label="Sana oralig‘i" className="flex items-center gap-2">
      {fromField}
      {toField}
    </div>
  );
}
