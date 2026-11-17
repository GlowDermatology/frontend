"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  clampIso,
  endOfMonth,
  isIsoDate,
  startOfMonth,
  tashkentToday,
} from "@/lib/datetime";
import { useCopy } from "@/lib/i18n/admin-context";

import { DatePicker } from "./date-picker";
import type { DisabledReason } from "./disabled-reason";
import { Field } from "./field";
import { pickerCopy } from "./picker-copy";

/** The one side that changed (`undefined` = cleared); a preset sets both. */
export interface DateRangePatch {
  dateFrom?: string;
  dateTo?: string;
}

export type RangePresetKey = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth";

/**
 * The days of a preset relative to `today` (`YYYY-MM-DD`), kept within
 * `[min, max]`; `null` when nothing of it is selectable.
 */
export function rangePreset(
  key: RangePresetKey,
  today: string,
  min?: string,
  max?: string,
): { from: string; to: string } | null {
  const ranges: Record<RangePresetKey, () => [string, string]> = {
    today: () => [today, today],
    yesterday: () => [addDays(today, -1), addDays(today, -1)],
    last7: () => [addDays(today, -6), today],
    last30: () => [addDays(today, -29), today],
    thisMonth: () => [startOfMonth(today), today],
    lastMonth: () => {
      const previous = addMonths(startOfMonth(today), -1);
      return [previous, endOfMonth(previous)];
    },
  };
  const [rawFrom, rawTo] = ranges[key]();
  if ((max && rawFrom > max) || (min && rawTo < min)) return null;
  return { from: clampIso(rawFrom, min, max), to: clampIso(rawTo, min, max) };
}

export interface DateRangePickerProps {
  /** The committed days (`YYYY-MM-DD`; from the URL, or the form's state). */
  from?: string;
  to?: string;
  /** Called with the side that changed, or both sides for a preset. */
  onCommit: (patch: DateRangePatch) => void;
  /** Earliest and latest selectable days for both sides. */
  min?: string;
  max?: string;
  /** Quick picks shown beside the calendars (e.g. `["today", "last7", "thisMonth"]`). */
  presets?: ReadonlyArray<RangePresetKey>;
  /** Names of the two hidden inputs (default `date_from` / `date_to`). */
  names?: { from: string; to: string };
  /**
   * `toolbar` (default): compact inline "Sanadan … gacha" for list toolbars;
   * a typed day applies once the typing settled, or on Enter or blur, and an
   * unreadable or out-of-range day is reverted. `form`: two labelled fields
   * with their own error lines; values are handed on as typed and Enter
   * submits the form.
   */
  variant?: "toolbar" | "form";
  /** Validation messages per side (`form` variant). */
  errors?: { from?: string; to?: string };
  /** "Today" for presets and the calendar (default: Tashkent today). */
  today?: string;
  /** Both days read-only and unfocusable; prefer `disabledReason`. */
  disabled?: boolean;
  /** Why the range cannot be changed now and what to do (on both day fields, see `DatePicker`). */
  disabledReason?: DisabledReason;
  className?: string;
}

/**
 * A day range as two day pickers kept in order (the start's latest day is
 * the end, the end's earliest is the start); each calendar draws the whole
 * range and previews it while a day is hovered or focused. Optional presets
 * fill both sides at once.
 */
export function DateRangePicker({
  from,
  to,
  onCommit,
  min,
  max,
  presets,
  names = { from: "date_from", to: "date_to" },
  variant = "toolbar",
  errors,
  today,
  disabled,
  disabledReason,
  className,
}: DateRangePickerProps) {
  const t = useCopy(pickerCopy);
  const id = useId();
  const fromDay = isIsoDate(from) ? from : "";
  const toDay = isIsoDate(to) ? to : "";
  const range = { from: fromDay || undefined, to: toDay || undefined };
  const toolbar = variant === "toolbar";

  const earlier = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);
  const later = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);

  const aside =
    presets && presets.length > 0
      ? (close: () => void) => {
          const now = today ?? tashkentToday();
          const items = presets.flatMap((key) => {
            const days = rangePreset(key, now, min, max);
            return days ? [{ key, ...days }] : [];
          });
          if (items.length === 0) return null;
          return (
            <div className="flex flex-col gap-2 border-b border-line pb-3 sm:w-40 sm:border-r sm:border-b-0 sm:pr-3 sm:pb-0">
              <span id={`${id}-presets`} className="px-1 text-overline text-ink-muted uppercase">
                {t.range.presets}
              </span>
              <div
                role="group"
                aria-labelledby={`${id}-presets`}
                className="flex flex-wrap gap-1 sm:flex-col"
              >
                {items.map((item) => {
                  const active = item.from === fromDay && item.to === toDay;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onCommit({ dateFrom: item.from, dateTo: item.to });
                        close();
                      }}
                      className={cn(
                        "inline-flex h-9 items-center rounded-sm px-3 text-left text-label whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft",
                        active && "bg-gold-soft font-bold text-gold-ink",
                      )}
                    >
                      {t.range[item.key]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
      : undefined;

  const common = {
    commit: toolbar ? ("settle" as const) : ("change" as const),
    strict: toolbar,
    range,
    today,
    aside,
    disabled,
    disabledReason,
    className: toolbar ? "w-[176px]" : undefined,
  };

  const fromPicker = (control: {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => (
    <DatePicker
      {...common}
      {...control}
      aria-label={toolbar ? t.range.from : undefined}
      name={names.from}
      value={fromDay}
      min={min}
      max={earlier(toDay || undefined, max)}
      rangeEdit="from"
      defaultMonth={toDay || undefined}
      onValueChange={(day) => onCommit({ dateFrom: day || undefined })}
    />
  );
  const toPicker = (control: {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => (
    <DatePicker
      {...common}
      {...control}
      aria-label={toolbar ? t.range.to : undefined}
      name={names.to}
      value={toDay}
      min={later(fromDay || undefined, min)}
      max={max}
      rangeEdit="to"
      defaultMonth={fromDay || undefined}
      onValueChange={(day) => onCommit({ dateTo: day || undefined })}
    />
  );

  if (!toolbar) {
    return (
      <div
        role="group"
        aria-label={t.range.group}
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3",
          className,
        )}
      >
        <Field label={t.range.from} error={errors?.from}>
          {(control) => fromPicker(control)}
        </Field>
        <Field label={t.range.to} error={errors?.to}>
          {(control) => toPicker(control)}
        </Field>
      </div>
    );
  }
  return (
    <div
      role="group"
      aria-label={t.range.group}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="flex items-center gap-2">
        <label htmlFor={`${id}-from`} className="text-body-sm whitespace-nowrap text-ink-muted">
          {t.range.from}
        </label>
        {fromPicker({ id: `${id}-from` })}
      </span>
      <span className="flex items-center gap-2">
        <label htmlFor={`${id}-to`} className="text-body-sm whitespace-nowrap text-ink-muted">
          {t.range.toShort}
        </label>
        {toPicker({ id: `${id}-to` })}
      </span>
    </div>
  );
}
