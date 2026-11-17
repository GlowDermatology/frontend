"use client";

import { DateRangePicker, type DateRangePatch } from "@/components/ui/date-range-picker";

import { MAX_FILTER_YEAR, MIN_FILTER_YEAR } from "./url-state";

export type { DateRangePatch };

interface DateRangeFieldsProps {
  /** The committed days (from the URL, or the dialog's state). */
  from?: string;
  to?: string;
  /** Called with the one side that changed; the caller navigates or stores it. */
  onCommit: (patch: DateRangePatch) => void;
  /**
   * `toolbar` (default): compact inline "Sanadan … gacha" for the list
   * toolbars. `form`: two labelled fields with their own error lines, for a
   * dialog form; Enter then submits the form as usual (the hidden inputs
   * named `names` carry the days).
   */
  variant?: "toolbar" | "form";
  /** The latest selectable day for both sides (e.g. today). */
  max?: string;
  /** Field names of the two inputs (default `date_from` / `date_to`). */
  names?: { from: string; to: string };
  /** Validation messages per side (`form` variant). */
  errors?: { from?: string; to?: string };
}

/** The days the list filters accept (`isoDateParam`). */
const FILTER_MIN = `${MIN_FILTER_YEAR}-01-01`;
const FILTER_MAX = `${MAX_FILTER_YEAR}-12-31`;

/**
 * The "Sanadan … gacha" day range of the list toolbars (and, as `form`, of
 * the dashboard's custom-range dialog): a thin wrapper over the kit's
 * `DateRangePicker`, kept so its call sites stay unchanged. The toolbar only
 * applies a whole day the URL filter accepts (years 2000–2099), after the
 * typing settled or on Enter or blur, so typing a year never navigates.
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
  const toolbar = variant === "toolbar";
  return (
    <DateRangePicker
      from={from}
      to={to}
      onCommit={onCommit}
      variant={variant}
      names={names}
      errors={errors}
      min={toolbar ? FILTER_MIN : undefined}
      max={max ?? (toolbar ? FILTER_MAX : undefined)}
    />
  );
}
