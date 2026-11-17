"use client";

import { Popover } from "radix-ui";
import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
  type Ref,
  type MouseEvent,
} from "react";

import { cn } from "@/lib/cn";
import {
  clampIso,
  formatDisplayDate,
  isIsoDate,
  isWithin,
  maskDateDraft,
  parseDisplayDate,
  tashkentToday,
} from "@/lib/datetime";
import { useCopy } from "@/lib/i18n/admin-context";

import { Calendar, type DateDisabled } from "./calendar";
import { isReasonKey, useDisabledReason, type DisabledReason } from "./disabled-reason";
import { Icon } from "./icon";
import { usePortalContainer } from "./layer";
import { pickerCopy } from "./picker-copy";
import {
  mergeRefs,
  PickerAnnouncer,
  pickerFooterButtonClass,
  pickerIconButtonClass,
  pickerInputClass,
  pickerPopoverClass,
  pickerShellClass,
  usePickerField,
  type PickerCommit,
  pickerButtonName,
} from "./picker-field";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

export interface DatePickerProps {
  /** `YYYY-MM-DD` or "" (controlled). */
  value?: string;
  /** Initial value when uncontrolled (a plain form read through `FormData`). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Earliest and latest selectable days (`YYYY-MM-DD`, inclusive). */
  min?: string;
  max?: string;
  /** Extra rule for days that cannot be picked; a string is the reason read out. */
  isDateDisabled?: DateDisabled;
  /** Show a clear (×) button while a day is set. */
  clearable?: boolean;
  /** `change` (forms, default) or `settle` (URL filters): see `usePickerField`. */
  commit?: PickerCommit;
  /** Refuse typed days outside min/max/disabled instead of handing them on. */
  strict?: boolean;
  /** Name of the hidden `<input>` that carries the ISO value in a `<form>`. */
  name?: string;
  form?: string;
  id?: string;
  required?: boolean;
  /** A real `disabled` (not focusable); prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the field cannot be changed now and what to do, e.g. «Avval mutaxassisni tanlang». The
   * text box stays focusable but read-only (`aria-disabled`), is described by the reason, shows it
   * in a tooltip on hover, focus and tap, and the popover does not open. Wins over `disabled`;
   * the value is still submitted.
   */
  disabledReason?: DisabledReason;
  readOnly?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  /** The text field (e.g. React Hook Form's `field.ref` for `setFocus`). */
  ref?: Ref<HTMLInputElement>;
  /** Classes of the outlined box (width in toolbars). */
  className?: string;
  /** "Today" for the calendar ring and the «Bugun» button (default: Tashkent today). */
  today?: string;
  /** The month shown when nothing is chosen (default: today). */
  defaultMonth?: string;
  /** Range drawing for the range picker (see `Calendar`). */
  range?: { from?: string; to?: string };
  rangeEdit?: "from" | "to";
  /** Extra content left of the calendar (the range picker's presets); gets `close`. */
  aside?: (close: () => void) => ReactNode;
}

/**
 * A day field: a masked `DD.MM.YYYY` text box (it also takes typed or pasted
 * ISO, so `locator.fill("2026-11-17")` keeps working) with a calendar in a
 * popover. The value is always `YYYY-MM-DD` or "", and a hidden input named
 * `name` carries it in a form. Alt+↓ (or ↓) in the field opens the calendar;
 * choosing a day closes it and returns focus to the field. Use it inside
 * `Field` and spread the control props (`id`, `aria-describedby`,
 * `aria-invalid`).
 */
export function DatePicker({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  isDateDisabled,
  clearable = false,
  commit = "change",
  strict = false,
  name,
  form,
  id,
  required,
  disabled: disabledProp,
  disabledReason,
  readOnly: readOnlyProp,
  placeholder,
  onBlur,
  ref,
  className,
  today,
  defaultMonth,
  range,
  rangeEdit,
  aside,
  ...aria
}: DatePickerProps) {
  const t = useCopy(pickerCopy);
  const portal = usePortalContainer();
  const contentId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [todayOnOpen, setTodayOnOpen] = useState(today ?? "");
  const outside = useRef(false);
  const why = useDisabledReason(disabledReason, aria["aria-describedby"]);
  const locked = why.reason !== null;
  const disabled = locked ? false : disabledProp;
  const readOnly = Boolean(readOnlyProp) || locked;

  const isAllowed = (iso: string) =>
    isWithin(iso, min, max) && !(isDateDisabled && isDateDisabled(iso));

  const field = usePickerField({
    value,
    defaultValue,
    onValueChange,
    parse: parseDisplayDate,
    format: formatDisplayDate,
    mask: maskDateDraft,
    commit,
    isAllowed,
    strict,
    messages: { invalid: t.invalidDate, outOfRange: t.outOfRange, selected: t.selected },
    onBlur,
  });

  const onOpenChange = (next: boolean) => {
    if (next) {
      outside.current = false;
      setTodayOnOpen(today ?? tashkentToday());
    }
    setOpen(next);
  };

  const choose = (iso: string) => {
    field.choose(iso);
    setOpen(false);
  };

  const shownToday = todayOnOpen || today || "";
  const canPickToday = shownToday !== "" && isAllowed(shownToday);
  const invalid = field.invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true";
  const focusMonth = isIsoDate(defaultMonth)
    ? defaultMonth
    : shownToday
      ? clampIso(shownToday, min, max)
      : undefined;

  /* A tap or click on a disabled-reason field shows the reason (Radix would close the tooltip). */
  const revealReason = (event: MouseEvent<HTMLInputElement>) => {
    event.preventDefault();
    why.reveal();
  };

  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <Popover.Root open={open && !locked} onOpenChange={onOpenChange}>
        <Popover.Anchor asChild>
          <TooltipTrigger asChild>
            <div className={cn(pickerShellClass, className)} data-picker="date" data-reveal-box="">
              <input
                {...aria}
                {...why.props}
                ref={mergeRefs(ref, input)}
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder={placeholder ?? t.datePlaceholder}
                required={required}
                disabled={disabled}
                readOnly={readOnly}
                aria-invalid={invalid || undefined}
                className={pickerInputClass}
                {...field.inputProps}
                onClick={locked ? revealReason : undefined}
                onKeyDown={(event) => {
                  if (locked && event.key !== "Enter" && isReasonKey(event)) why.reveal();
                  if (event.key === "ArrowDown" && !readOnly && !disabled) {
                    event.preventDefault();
                    onOpenChange(true);
                    return;
                  }
                  field.inputProps.onKeyDown(event);
                }}
              />
              {clearable && field.current && !disabled && !readOnly && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={t.clear}
                  className={pickerIconButtonClass}
                  onClick={() => {
                    field.choose("");
                    input.current?.focus();
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
              <Popover.Trigger asChild>
                <button
                  type="button"
                  {...pickerButtonName({
                    action: t.openCalendar,
                    named: t.openCalendarFor,
                    ariaLabel: aria["aria-label"],
                    ariaLabelledby: aria["aria-labelledby"],
                    id,
                  })}
                  aria-controls={open ? contentId : undefined}
                  disabled={disabled || readOnly}
                  className={cn(pickerIconButtonClass, "mr-1")}
                >
                  <Icon name="calendar" size={18} />
                </button>
              </Popover.Trigger>
              {name && <input type="hidden" name={name} form={form} value={field.current} />}
              <PickerAnnouncer message={field.announcement} />
              {why.text}
            </div>
          </TooltipTrigger>
        </Popover.Anchor>
        <Popover.Portal container={portal}>
          <Popover.Content
            id={contentId}
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label={t.calendar}
            className={pickerPopoverClass}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => {
              outside.current = true;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!outside.current) input.current?.focus();
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              {aside?.(() => setOpen(false))}
              <div className="flex flex-col gap-3">
                <Calendar
                  value={field.current}
                  onSelect={choose}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  range={range}
                  rangeEdit={rangeEdit}
                  defaultFocus={focusMonth}
                  today={shownToday || undefined}
                  autoFocus
                />
                {(canPickToday || (clearable && field.current)) && (
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                    {canPickToday ? (
                      <button
                        type="button"
                        className={cn(pickerFooterButtonClass, "text-gold-ink")}
                        onClick={() => choose(shownToday)}
                      >
                        {t.today}
                      </button>
                    ) : (
                      <span />
                    )}
                    {clearable && field.current && (
                      <button
                        type="button"
                        className={cn(pickerFooterButtonClass, "text-ink-muted")}
                        onClick={() => choose("")}
                      >
                        {t.clear}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
        {why.bubble}
      </Popover.Root>
    </TooltipRoot>
  );
}
