"use client";

import { Popover } from "radix-ui";
import { useId, useRef, useState, type FocusEvent, type Ref, type MouseEvent } from "react";

import { cn } from "@/lib/cn";
import {
  clampIso,
  formatDisplayDateTime,
  isIsoDate,
  isIsoDateTime,
  isIsoTime,
  isWithin,
  joinDateTime,
  maskDateTimeDraft,
  parseDisplayDateTime,
  splitDateTime,
  tashkentNow,
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
import { TimeColumns } from "./time-picker";

export interface DateTimePickerProps {
  /** `YYYY-MM-DDTHH:MM` (Tashkent wall clock) or "" (controlled). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Earliest and latest moments (`YYYY-MM-DDTHH:MM`, inclusive). */
  min?: string;
  max?: string;
  /** Days that cannot be picked (on top of min/max). */
  isDateDisabled?: DateDisabled;
  /** Minutes between the listed times (default 5). */
  step?: number;
  /** Time used when a day is picked before any time (default 09:00, kept within min/max). */
  defaultTime?: string;
  commit?: PickerCommit;
  strict?: boolean;
  /** Name of the hidden input carrying `YYYY-MM-DDTHH:MM`. */
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
  ref?: Ref<HTMLInputElement>;
  className?: string;
  /** "Now" for «Hozir» and the calendar (default: Tashkent wall clock when opened). */
  now?: string;
}

/**
 * A date-and-time field (replaces `datetime-local`): one masked
 * `DD.MM.YYYY HH:MM` text box that also takes ISO (`.fill("9999-12-31T10:00")`
 * works) and a popover with the calendar beside the hour and minute columns.
 * Picking a day keeps the popover open and moves to the hours; picking a
 * minute (or «Tayyor») closes it. The value is `YYYY-MM-DDTHH:MM` or "";
 * convert to the API's aware ISO with `fromLocalInput` (`@/lib/datetime`).
 */
export function DateTimePicker({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  isDateDisabled,
  step = 5,
  defaultTime = "09:00",
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
  now,
  ...aria
}: DateTimePickerProps) {
  const t = useCopy(pickerCopy);
  const portal = usePortalContainer();
  const contentId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [nowOnOpen, setNowOnOpen] = useState(now ?? "");
  const outside = useRef(false);
  const why = useDisabledReason(disabledReason, aria["aria-describedby"]);
  const locked = why.reason !== null;
  const disabled = locked ? false : disabledProp;
  const readOnly = Boolean(readOnlyProp) || locked;

  const minDay = min && isIsoDateTime(min) ? min.slice(0, 10) : undefined;
  const maxDay = max && isIsoDateTime(max) ? max.slice(0, 10) : undefined;

  const isAllowed = (moment: string) =>
    isWithin(moment, min, max) && !(isDateDisabled && isDateDisabled(moment.slice(0, 10)));

  const field = usePickerField({
    value,
    defaultValue,
    onValueChange,
    parse: parseDisplayDateTime,
    format: formatDisplayDateTime,
    mask: maskDateTimeDraft,
    commit,
    isAllowed,
    strict,
    messages: { invalid: t.invalidDateTime, outOfRange: t.outOfRange, selected: t.selected },
    onBlur,
  });

  // The popover keeps a day picked before its time, so the time column knows its bounds.
  const committed = splitDateTime(isIsoDateTime(field.current) ? field.current : "");
  const [pendingDay, setPendingDay] = useState("");
  const day = pendingDay || committed.date;
  const time = committed.date === day ? committed.time : "";
  const timeMin = day && minDay === day ? min!.slice(11, 16) : undefined;
  const timeMax = day && maxDay === day ? max!.slice(11, 16) : undefined;

  const onOpenChange = (next: boolean) => {
    if (next) {
      outside.current = false;
      setNowOnOpen(now ?? tashkentNow());
      setPendingDay("");
    }
    setOpen(next);
  };

  const pickDay = (iso: string) => {
    const keep = isIsoTime(time) ? time : committed.time || defaultTime;
    const bounded = clampIso(
      keep,
      minDay === iso ? min!.slice(11, 16) : undefined,
      maxDay === iso ? max!.slice(11, 16) : undefined,
    );
    setPendingDay(iso);
    field.choose(joinDateTime(iso, bounded));
  };

  const pickTime = (next: string, final: boolean) => {
    const target = day || (nowOnOpen ? nowOnOpen.slice(0, 10) : "");
    if (!isIsoDate(target)) return;
    field.choose(joinDateTime(target, next));
    if (final) setOpen(false);
  };

  const shownNow = nowOnOpen || now || "";
  const canPickNow = isIsoDateTime(shownNow) && isAllowed(shownNow);
  const invalid = field.invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true";

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
            <div
              className={cn(pickerShellClass, className)}
              data-picker="datetime"
              data-reveal-box=""
            >
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
                placeholder={placeholder ?? t.dateTimePlaceholder}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
              <Calendar
                value={day}
                onSelect={pickDay}
                min={minDay}
                max={maxDay}
                isDateDisabled={isDateDisabled}
                defaultFocus={
                  shownNow ? clampIso(shownNow.slice(0, 10), minDay, maxDay) : undefined
                }
                today={shownNow ? shownNow.slice(0, 10) : undefined}
                autoFocus
              />
              <div aria-hidden="true" className="hidden w-px self-stretch bg-line sm:block" />
              <div className="flex flex-col items-center justify-center gap-2 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
                <TimeColumns
                  key={day}
                  value={time}
                  step={step}
                  min={timeMin}
                  max={timeMax}
                  autoFocus={pendingDay !== ""}
                  onChange={pickTime}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              {canPickNow ? (
                <button
                  type="button"
                  className={cn(pickerFooterButtonClass, "text-gold-ink")}
                  onClick={() => {
                    field.choose(shownNow);
                    setOpen(false);
                  }}
                >
                  {t.now}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className={cn(pickerFooterButtonClass, "font-bold")}
                onClick={() => setOpen(false)}
              >
                {t.done}
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
        {why.bubble}
      </Popover.Root>
    </TooltipRoot>
  );
}
