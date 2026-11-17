"use client";

import { Popover } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
  type MouseEvent,
} from "react";

import { cn } from "@/lib/cn";
import { isIsoTime, isWithin, maskTimeDraft, minuteSteps, parseDisplayTime } from "@/lib/datetime";
import { useCopy } from "@/lib/i18n/admin-context";

import { isReasonKey, useDisabledReason, type DisabledReason } from "./disabled-reason";
import { Icon } from "./icon";
import { usePortalContainer } from "./layer";
import { pickerCopy } from "./picker-copy";
import {
  mergeRefs,
  PickerAnnouncer,
  pickerIconButtonClass,
  pickerInputClass,
  pickerPopoverClass,
  pickerShellClass,
  usePickerField,
  type PickerCommit,
  pickerButtonName,
} from "./picker-field";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

const pad2 = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface TimeColumnsProps {
  /** `HH:MM` or "". */
  value: string;
  /**
   * A new time: after an hour (`final: false`, the minutes column takes
   * focus) or after a minute (`final: true`, the picker may close).
   */
  onChange: (time: string, final: boolean) => void;
  /** Minutes between options (default 5). */
  step?: number;
  /** Earliest and latest times (`HH:MM`, inclusive). */
  min?: string;
  max?: string;
  /** Focus the hours column on mount. */
  autoFocus?: boolean;
  className?: string;
}

/**
 * Two listbox columns, hours and minutes (on the `step` grid). Each column is
 * one tab stop driven by `aria-activedescendant`: ↑/↓ move, Home/End jump,
 * Enter or Space choose, ←/→ switch columns. Times outside `min`/`max` are
 * shown but cannot be chosen.
 */
export function TimeColumns({
  value,
  onChange,
  step = 5,
  min,
  max,
  autoFocus = false,
  className,
}: TimeColumnsProps) {
  const t = useCopy(pickerCopy);
  const id = useId();
  const minutes = minuteSteps(step);
  const valueHour = isIsoTime(value) ? Number(value.slice(0, 2)) : null;
  const valueMinute = isIsoTime(value) ? Number(value.slice(3, 5)) : null;
  const firstFreeHour = HOURS.find((h) => minutes.some((m) => allowed(h, m))) ?? 0;
  const [activeHour, setActiveHour] = useState(valueHour ?? Math.max(firstFreeHour, 9));
  const [activeMinute, setActiveMinute] = useState(() => {
    const index = valueMinute === null ? 0 : minutes.indexOf(valueMinute);
    return Math.max(0, index);
  });
  const hoursList = useRef<HTMLDivElement>(null);
  const minutesList = useRef<HTMLDivElement>(null);

  function allowed(hour: number, minute: number): boolean {
    return isWithin(`${pad2(hour)}:${pad2(minute)}`, min, max);
  }
  const hourAllowed = (hour: number) => minutes.some((m) => allowed(hour, m));
  const shownHour = valueHour ?? activeHour;

  useEffect(() => {
    if (autoFocus) hoursList.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Keep the active option in view (centred on open, nearest afterwards).
  const centred = useRef(false);
  useEffect(() => {
    for (const [list, index] of [
      [hoursList.current, activeHour],
      [minutesList.current, activeMinute],
    ] as const) {
      const option = list?.children[index] as HTMLElement | undefined;
      if (!list || !option) continue;
      const top = option.offsetTop;
      const bottom = top + option.offsetHeight;
      if (!centred.current) {
        list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2;
      } else if (top < list.scrollTop) {
        list.scrollTop = top;
      } else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom - list.clientHeight;
      }
    }
    centred.current = true;
  }, [activeHour, activeMinute]);

  const chooseHour = (hour: number) => {
    if (!hourAllowed(hour)) return;
    setActiveHour(hour);
    const keep = valueMinute !== null && allowed(hour, valueMinute) ? valueMinute : null;
    const minute = keep ?? minutes.find((m) => allowed(hour, m)) ?? 0;
    const index = minutes.indexOf(minute);
    if (index >= 0) setActiveMinute(index);
    onChange(`${pad2(hour)}:${pad2(minute)}`, false);
    minutesList.current?.focus({ preventScroll: true });
  };

  const chooseMinute = (index: number) => {
    const minute = minutes[index];
    if (minute === undefined || !allowed(shownHour, minute)) return;
    setActiveMinute(index);
    onChange(`${pad2(shownHour)}:${pad2(minute)}`, true);
  };

  const columnKeys = (
    event: KeyboardEvent<HTMLDivElement>,
    count: number,
    active: number,
    setActive: (index: number) => void,
    choose: (index: number) => void,
    other: HTMLDivElement | null,
  ) => {
    const moves: Record<string, number> = {
      ArrowUp: active - 1,
      ArrowDown: active + 1,
      PageUp: active - 6,
      PageDown: active + 6,
      Home: 0,
      End: count - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(Math.max(0, Math.min(count - 1, moves[event.key]!)));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      other?.focus({ preventScroll: true });
    }
  };

  const listClass =
    "scroll-slim h-60 w-[76px] overflow-y-auto overscroll-contain rounded-md p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink";
  const optionClass = (selected: boolean, active: boolean, disabledOption: boolean) =>
    cn(
      "flex h-10 cursor-pointer items-center justify-center rounded-sm text-[15px] text-ink tabular-nums transition-colors duration-150",
      active && !selected && "bg-gold-soft",
      !disabledOption && !selected && "hover:bg-gold-soft",
      selected && "bg-gold font-bold text-on-gold shadow-sm",
      disabledOption && "cursor-not-allowed text-ink-muted line-through opacity-40",
    );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end justify-center gap-1">
        <div className="flex flex-col items-center gap-1.5">
          <span id={`${id}-hours`} className="text-overline text-ink-muted uppercase">
            {t.hours}
          </span>
          <div
            ref={hoursList}
            role="listbox"
            tabIndex={0}
            aria-labelledby={`${id}-hours`}
            aria-activedescendant={`${id}-h-${activeHour}`}
            onKeyDown={(event) =>
              columnKeys(event, 24, activeHour, setActiveHour, chooseHour, minutesList.current)
            }
            className={listClass}
          >
            {HOURS.map((hour) => {
              const off = !hourAllowed(hour);
              return (
                <div
                  key={hour}
                  id={`${id}-h-${hour}`}
                  role="option"
                  aria-selected={hour === valueHour}
                  aria-disabled={off || undefined}
                  data-value={pad2(hour)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => chooseHour(hour)}
                  className={optionClass(hour === valueHour, hour === activeHour, off)}
                >
                  {pad2(hour)}
                </div>
              );
            })}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="flex h-60 items-center px-0.5 pb-1 font-serif text-[28px] leading-none font-semibold text-gold"
        >
          :
        </span>
        <div className="flex flex-col items-center gap-1.5">
          <span id={`${id}-minutes`} className="text-overline text-ink-muted uppercase">
            {t.minutes}
          </span>
          <div
            ref={minutesList}
            role="listbox"
            tabIndex={0}
            aria-labelledby={`${id}-minutes`}
            aria-activedescendant={`${id}-m-${activeMinute}`}
            onKeyDown={(event) =>
              columnKeys(
                event,
                minutes.length,
                activeMinute,
                setActiveMinute,
                chooseMinute,
                hoursList.current,
              )
            }
            className={listClass}
          >
            {minutes.map((minute, index) => {
              const off = !allowed(shownHour, minute);
              const selected = valueHour !== null && minute === valueMinute;
              return (
                <div
                  key={minute}
                  id={`${id}-m-${index}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={off || undefined}
                  data-value={pad2(minute)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => chooseMinute(index)}
                  className={optionClass(selected, index === activeMinute, off)}
                >
                  {pad2(minute)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface TimePickerProps {
  /** `HH:MM` or "" (controlled). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Earliest and latest times (`HH:MM`, inclusive); options outside are disabled. */
  min?: string;
  max?: string;
  /**
   * Minutes between the listed options (default 5). A typed time off the
   * grid (18:03) is still handed on, so the form's own rule can name it.
   */
  step?: number;
  commit?: PickerCommit;
  /** Refuse typed times outside min/max instead of handing them on. */
  strict?: boolean;
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
}

/**
 * A time field: a masked `HH:MM` text box (typed `13:00`, `1300` or `9`
 * work) with hour and minute columns in a popover. The value is `HH:MM` or
 * "", carried by a hidden input named `name`. Choosing an hour moves to the
 * minutes; choosing a minute closes the popover and returns focus.
 */
export function TimePicker({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 5,
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
  ...aria
}: TimePickerProps) {
  const t = useCopy(pickerCopy);
  const portal = usePortalContainer();
  const contentId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const outside = useRef(false);
  const why = useDisabledReason(disabledReason, aria["aria-describedby"]);
  const locked = why.reason !== null;
  const disabled = locked ? false : disabledProp;
  const readOnly = Boolean(readOnlyProp) || locked;

  const field = usePickerField({
    value,
    defaultValue,
    onValueChange,
    parse: parseDisplayTime,
    format: (time) => (isIsoTime(time) ? time : ""),
    mask: maskTimeDraft,
    commit,
    isAllowed: (time) => isWithin(time, min, max),
    strict,
    messages: { invalid: t.invalidTime, outOfRange: t.outOfRange, selected: t.selected },
    onBlur,
  });

  const onOpenChange = (next: boolean) => {
    if (next) outside.current = false;
    setOpen(next);
  };
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
            <div className={cn(pickerShellClass, className)} data-picker="time" data-reveal-box="">
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
                placeholder={placeholder ?? t.timePlaceholder}
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
                    action: t.openTimes,
                    named: t.openTimesFor,
                    ariaLabel: aria["aria-label"],
                    ariaLabelledby: aria["aria-labelledby"],
                    id,
                  })}
                  aria-controls={open ? contentId : undefined}
                  disabled={disabled || readOnly}
                  className={cn(pickerIconButtonClass, "mr-1")}
                >
                  <Icon name="clock" size={18} />
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
            aria-label={t.timePanel}
            className={cn(pickerPopoverClass, "p-3")}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => {
              outside.current = true;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!outside.current) input.current?.focus();
            }}
          >
            <TimeColumns
              value={isIsoTime(field.current) ? field.current : ""}
              step={step}
              min={min}
              max={max}
              autoFocus
              onChange={(time, final) => {
                field.choose(time);
                if (final) setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
        {why.bubble}
      </Popover.Root>
    </TooltipRoot>
  );
}
