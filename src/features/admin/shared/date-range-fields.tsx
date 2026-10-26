"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { TextInput } from "@/components/ui/field";

import { isoDateParam } from "./url-state";

export interface DateRangePatch {
  dateFrom?: string;
  dateTo?: string;
}

interface DateRangeFieldsProps {
  /** The committed days (from the URL). */
  from?: string;
  to?: string;
  /** Called with the one side that changed; the caller navigates. */
  onCommit: (patch: DateRangePatch) => void;
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
}: {
  name: string;
  label: string;
  ariaLabel: string;
  value?: string;
  min?: string;
  max?: string;
  onCommit: (value: string | undefined) => void;
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

  return (
    <label className="flex items-center gap-2">
      <span className="text-body-sm whitespace-nowrap text-ink-muted">{label}</span>
      <TextInput
        type="date"
        name={name}
        aria-label={ariaLabel}
        className={dateInput}
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
          if (event.key === "Enter") {
            event.preventDefault();
            apply(event.currentTarget.value);
          }
        }}
        onBlur={(event) => {
          const next = event.currentTarget.value;
          if (next === "" || isoDateParam(next)) apply(next);
          else {
            window.clearTimeout(timer.current);
            setDraft(committed);
          }
        }}
      />
    </label>
  );
}

/**
 * The "Sanadan … gacha" day range of the list toolbars, kept together as one
 * group so the range wraps as a unit.
 */
export function DateRangeFields({ from, to, onCommit }: DateRangeFieldsProps) {
  return (
    <div role="group" aria-label="Sana oralig‘i" className="flex items-center gap-2">
      <DayField
        name="date_from"
        label="Sanadan"
        ariaLabel="Sanadan"
        value={from}
        max={to}
        onCommit={(dateFrom) => onCommit({ dateFrom })}
      />
      <DayField
        name="date_to"
        label="gacha"
        ariaLabel="Sanagacha"
        value={to}
        min={from}
        onCommit={(dateTo) => onCommit({ dateTo })}
      />
    </div>
  );
}
