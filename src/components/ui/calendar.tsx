"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  addYears,
  daysInMonth,
  endOfWeek,
  isIsoDate,
  isoDate,
  isWithin,
  monthGrid,
  monthKey,
  parseIsoDate,
  startOfWeek,
  tashkentToday,
} from "@/lib/datetime";
import { useCopy } from "@/lib/i18n/admin-context";

import { Icon } from "./icon";
import { pickerCopy } from "./picker-copy";

const FIRST_DAY = "0001-01-01";
const LAST_DAY = "9999-12-31";
const YEARS_PER_PAGE = 12;

/** Why a day cannot be chosen: `true`, or a short reason added to its name. */
export type DateDisabled = (iso: string) => boolean | string;

export interface CalendarProps {
  /** The chosen day (`YYYY-MM-DD`) or "". */
  value?: string;
  /** Called with the day a person picked (never a disabled one). */
  onSelect: (iso: string) => void;
  /** Earliest and latest selectable days (`YYYY-MM-DD`, inclusive). */
  min?: string;
  max?: string;
  /** Extra rule for days that cannot be chosen (e.g. closed days). */
  isDateDisabled?: DateDisabled;
  /**
   * A range to draw (the range picker): its ends look chosen and the days in
   * between sit on a soft gold band. `rangeEdit` names the end being picked,
   * so hovering or focusing a day previews the new range.
   */
  range?: { from?: string; to?: string };
  rangeEdit?: "from" | "to";
  /** The day shown when nothing is chosen (default: today, kept within min/max). */
  defaultFocus?: string;
  /** "Today" for the ring (default: Tashkent today, read when the calendar mounts). */
  today?: string;
  /** Focus the active day when the calendar mounts (inside a popover). */
  autoFocus?: boolean;
  className?: string;
}

type View = "days" | "months" | "years";

/**
 * Whether assistive tech hears a day as chosen (`aria-selected`): the value or an end of the
 * committed range, never the preview a range edit draws under the pointer or the keyboard focus.
 */
export function isCommittedDay(
  iso: string,
  value: string | null | undefined,
  range: { from?: string; to?: string } | undefined,
): boolean {
  return iso === value || (range !== undefined && (iso === range.from || iso === range.to));
}

function clampDay(iso: string, min?: string, max?: string): string {
  const lower = min && isIsoDate(min) ? min : FIRST_DAY;
  const upper = max && isIsoDate(max) ? max : LAST_DAY;
  if (iso < lower) return lower;
  if (iso > upper) return upper;
  return iso;
}

/** Moves by `step`, staying inside the representable years. */
function safeMove(iso: string, move: (iso: string) => string): string {
  try {
    return clampDay(move(iso));
  } catch {
    return iso;
  }
}

/**
 * A month calendar (WAI-ARIA date grid, Monday first). One day is in the tab
 * order (roving tabindex); arrows move by day and week, Home/End to the
 * week's start and end, Page Up/Down by month, with Shift by year, Enter or
 * Space picks. The month title opens a month view and then a year view for
 * long jumps (a birth year). Disabled days stay reachable by keyboard and
 * say why in their name; they cannot be picked. Strings come from
 * `picker-copy.ts`.
 */
export function Calendar({
  value,
  onSelect,
  min,
  max,
  isDateDisabled,
  range,
  rangeEdit,
  defaultFocus,
  today: todayProp,
  autoFocus = false,
  className,
}: CalendarProps) {
  const t = useCopy(pickerCopy);
  const id = useId();
  const [today] = useState(() => todayProp ?? tashkentToday());
  const [focused, setFocused] = useState(() =>
    clampDay(isIsoDate(value) ? value : isIsoDate(defaultFocus) ? defaultFocus : today, min, max),
  );
  const [view, setView] = useState<View>("days");
  const [hovered, setHovered] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  /** Set by keyboard moves so the new day takes focus after the render. */
  const moveFocus = useRef(autoFocus);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    root.current
      ?.querySelector<HTMLElement>('[data-calendar-active="true"]')
      ?.focus({ preventScroll: true });
  }, [focused, view]);

  const parts = parseIsoDate(focused)!;
  const title = t.monthTitle(parts.month - 1, parts.year);

  const disabledReason = (iso: string): string | null => {
    if (!isWithin(iso, min, max)) return t.unavailable;
    const rule = isDateDisabled?.(iso);
    if (!rule) return null;
    return typeof rule === "string" ? rule : t.unavailable;
  };

  const go = (next: string, { focus }: { focus: boolean }) => {
    moveFocus.current = focus;
    setFocused(next);
  };

  const pick = (iso: string) => {
    if (disabledReason(iso)) return;
    setFocused(iso);
    onSelect(iso);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => startOfWeek(focused),
      End: () => endOfWeek(focused),
      PageUp: () => (event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1)),
      PageDown: () => (event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1)),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      const next = safeMove(focused, move);
      go(next, { focus: true });
      if (rangeEdit) setHovered(next);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(focused);
    }
  };

  // The range drawn: the edited end follows the hovered/focused day.
  const drawn = (() => {
    if (!range) return null;
    const from = rangeEdit === "from" && hovered ? hovered : range.from;
    const to = rangeEdit === "to" && hovered ? hovered : range.to;
    return { from, to, band: Boolean(from && to && from < to) };
  })();

  const navButton =
    "inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  const titleButton =
    "inline-flex h-9 items-center gap-1 rounded-sm px-2 font-serif text-[22px] leading-7 font-semibold text-ink transition-colors duration-150 hover:bg-gold-soft";

  const monthStart = isoDate(parts.year, parts.month, 1);
  const lowerMonth = min && isIsoDate(min) ? monthKey(min) : null;
  const upperMonth = max && isIsoDate(max) ? monthKey(max) : null;

  return (
    <div ref={root} className={cn("w-[296px] max-w-full select-none", className)}>
      <p id={`${id}-hint`} className="sr-only">
        {t.keyboardHint}
      </p>
      <span aria-live="polite" className="sr-only">
        {view === "days" ? title : String(parts.year)}
      </span>

      {view === "days" && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className={navButton}
              aria-label={t.previousMonth}
              data-calendar-nav="previous"
              disabled={lowerMonth !== null && monthKey(monthStart) <= lowerMonth}
              onClick={() =>
                go(
                  safeMove(focused, (d) => addMonths(d, -1)),
                  { focus: false },
                )
              }
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <button
              type="button"
              className={titleButton}
              aria-describedby={`${id}-month-hint`}
              onClick={() => {
                moveFocus.current = true;
                setView("months");
              }}
            >
              <span id={`${id}-title`}>{title}</span>
              <Icon name="chevron-down" size={16} className="text-gold-ink" />
              <span id={`${id}-month-hint`} className="sr-only">
                {t.chooseMonth}
              </span>
            </button>
            <button
              type="button"
              className={navButton}
              aria-label={t.nextMonth}
              data-calendar-nav="next"
              disabled={upperMonth !== null && monthKey(monthStart) >= upperMonth}
              onClick={() =>
                go(
                  safeMove(focused, (d) => addMonths(d, 1)),
                  { focus: false },
                )
              }
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>

          <table
            role="grid"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-hint`}
            data-month={monthKey(focused)}
            onKeyDown={onGridKeyDown}
            onPointerLeave={() => setHovered(null)}
            className="w-full border-collapse"
          >
            <thead>
              <tr>
                {t.weekdaysShort.map((short, index) => (
                  <th
                    key={short}
                    scope="col"
                    abbr={t.weekdays[index]}
                    className="h-8 p-0 text-center text-overline text-ink-muted uppercase"
                  >
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody key={monthKey(focused)} className="animate-fade-in">
              {monthGrid(parts.year, parts.month).map((week) => (
                <tr key={week[0]!.iso}>
                  {week.map((day) => {
                    const reason = disabledReason(day.iso);
                    // Drawn as chosen: the value, or an end of the range as previewed.
                    const isSelected =
                      day.iso === value || day.iso === drawn?.from || day.iso === drawn?.to;
                    // Announced as chosen: only what is committed (the preview follows the
                    // keyboard focus in range edit and must not report every day passed over).
                    const isCommitted = isCommittedDay(day.iso, value, range);
                    const inBand = drawn?.band && day.iso > drawn.from! && day.iso < drawn.to!;
                    const isStart = drawn?.band && day.iso === drawn.from;
                    const isEnd = drawn?.band && day.iso === drawn.to;
                    const isToday = day.iso === today;
                    const active = day.iso === focused;
                    return (
                      <td
                        key={day.iso}
                        role="gridcell"
                        tabIndex={active ? 0 : -1}
                        aria-selected={isCommitted}
                        aria-disabled={reason ? true : undefined}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${t.dayLabel(day.day, Number(day.iso.slice(5, 7)) - 1, Number(day.iso.slice(0, 4)), day.weekday)}${reason ? `, ${reason}` : ""}`}
                        data-date={day.iso}
                        data-calendar-active={active}
                        data-outside={day.inMonth ? undefined : ""}
                        onClick={() => pick(day.iso)}
                        onFocus={() => {
                          if (!active) setFocused(day.iso);
                        }}
                        onPointerEnter={() => {
                          if (rangeEdit && !reason) setHovered(day.iso);
                        }}
                        className={cn(
                          "group h-10 p-0 text-center outline-none",
                          inBand && "bg-gold-soft",
                          inBand && day.weekday === 0 && "rounded-l-full",
                          inBand && day.weekday === 6 && "rounded-r-full",
                          isStart &&
                            day.weekday !== 6 &&
                            "bg-[linear-gradient(to_right,transparent_50%,var(--gd-gold-soft)_50%)]",
                          isEnd &&
                            day.weekday !== 0 &&
                            "bg-[linear-gradient(to_left,transparent_50%,var(--gd-gold-soft)_50%)]",
                          reason ? "cursor-not-allowed" : "cursor-pointer",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mx-auto flex size-10 items-center justify-center rounded-full text-[14px] leading-none tabular-nums transition-[background-color,color,box-shadow] duration-150 group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-gold-ink",
                            day.inMonth ? "text-ink" : "text-ink-muted",
                            !reason && !isSelected && "group-hover:bg-gold-soft",
                            isToday &&
                              !isSelected &&
                              "font-bold text-gold-ink ring-[1.5px] ring-gold ring-inset",
                            isSelected && "bg-gold font-bold text-on-gold shadow-sm",
                            reason && "line-through decoration-1 opacity-40",
                          )}
                        >
                          {day.day}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {view === "months" && (
        <ChoiceView
          title={String(parts.year)}
          titleHint={t.chooseYear}
          onTitle={() => {
            moveFocus.current = true;
            setView("years");
          }}
          previous={{
            label: t.previousYear,
            disabled: Boolean(min && isIsoDate(min) && parts.year <= Number(min.slice(0, 4))),
            onClick: () => setFocused(safeMove(focused, (d) => addYears(d, -1))),
          }}
          next={{
            label: t.nextYear,
            disabled: Boolean(max && isIsoDate(max) && parts.year >= Number(max.slice(0, 4))),
            onClick: () => setFocused(safeMove(focused, (d) => addYears(d, 1))),
          }}
          options={t.monthsShort.map((label, index) => {
            const key = `${String(parts.year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;
            return {
              key,
              label,
              name: t.monthTitle(index, parts.year),
              current: index + 1 === parts.month,
              disabled:
                (lowerMonth !== null && key < lowerMonth) ||
                (upperMonth !== null && key > upperMonth),
            };
          })}
          activeIndex={parts.month - 1}
          onActiveChange={(index) =>
            go(
              clampDay(
                isoDate(
                  parts.year,
                  index + 1,
                  Math.min(parts.day, daysInMonth(parts.year, index + 1)),
                ),
                min,
                max,
              ),
              { focus: true },
            )
          }
          onChoose={() => {
            moveFocus.current = true;
            setView("days");
          }}
        />
      )}

      {view === "years" && (
        <YearsView
          year={parts.year}
          min={min}
          max={max}
          onActiveChange={(year, focus) =>
            go(
              clampDay(
                isoDate(year, parts.month, Math.min(parts.day, daysInMonth(year, parts.month))),
                min,
                max,
              ),
              { focus },
            )
          }
          onChoose={() => {
            moveFocus.current = true;
            setView("months");
          }}
        />
      )}
    </div>
  );
}

interface ChoiceOption {
  key: string;
  label: string;
  /** Accessible name. */
  name: string;
  current: boolean;
  disabled: boolean;
}

interface ChoiceViewProps {
  title: string;
  titleHint?: string;
  onTitle?: () => void;
  previous: { label: string; disabled: boolean; onClick: () => void };
  next: { label: string; disabled: boolean; onClick: () => void };
  options: ChoiceOption[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onChoose: () => void;
}

/** A 3 × 4 grid of months or years with the same roving focus as the day grid. */
function ChoiceView({
  title,
  titleHint,
  onTitle,
  previous,
  next,
  options,
  activeIndex,
  onActiveChange,
  onChoose,
}: ChoiceViewProps) {
  const id = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowLeft: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      ArrowUp: activeIndex - 3,
      ArrowDown: activeIndex + 3,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      onActiveChange(Math.max(0, Math.min(last, moves[event.key]!)));
    } else if ((event.key === "Enter" || event.key === " ") && options[activeIndex]?.disabled) {
      event.preventDefault();
    }
  };

  const navButton =
    "inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className={navButton}
          aria-label={previous.label}
          disabled={previous.disabled}
          onClick={previous.onClick}
        >
          <Icon name="chevron-left" size={18} />
        </button>
        {onTitle ? (
          <button
            type="button"
            onClick={onTitle}
            className="inline-flex h-9 items-center gap-1 rounded-sm px-2 font-serif text-[22px] leading-7 font-semibold text-ink tabular-nums transition-colors duration-150 hover:bg-gold-soft"
          >
            <span id={`${id}-title`}>{title}</span>
            <Icon name="chevron-down" size={16} className="text-gold-ink" />
            {titleHint && <span className="sr-only">{titleHint}</span>}
          </button>
        ) : (
          <span
            id={`${id}-title`}
            className="font-serif text-[22px] leading-7 font-semibold text-ink tabular-nums"
          >
            {title}
          </span>
        )}
        <button
          type="button"
          className={navButton}
          aria-label={next.label}
          disabled={next.disabled}
          onClick={next.onClick}
        >
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div
        role="group"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-1.5"
      >
        {options.map((option, index) => (
          <button
            key={option.key}
            type="button"
            data-choice=""
            data-calendar-active={index === activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            aria-label={option.name}
            aria-pressed={option.current}
            aria-disabled={option.disabled || undefined}
            onClick={() => {
              if (option.disabled) return;
              onActiveChange(index);
              onChoose();
            }}
            className={cn(
              "h-12 rounded-md text-label text-ink tabular-nums transition-colors duration-150 hover:bg-gold-soft aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:hover:bg-transparent",
              option.current && "bg-gold font-bold text-on-gold shadow-sm hover:bg-gold",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function YearsView({
  year,
  min,
  max,
  onActiveChange,
  onChoose,
}: {
  year: number;
  min?: string;
  max?: string;
  onActiveChange: (year: number, focus: boolean) => void;
  onChoose: () => void;
}) {
  const t = useCopy(pickerCopy);
  const first = Math.max(1, year - (year % YEARS_PER_PAGE));
  const lowerYear = min && isIsoDate(min) ? Number(min.slice(0, 4)) : 1;
  const upperYear = max && isIsoDate(max) ? Number(max.slice(0, 4)) : 9999;
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => first + i).filter(
    (y) => y <= 9999,
  );
  return (
    <ChoiceView
      title={`${years[0]}–${years.at(-1)}`}
      previous={{
        label: t.previousYears,
        disabled: first <= lowerYear,
        onClick: () => onActiveChange(Math.max(lowerYear, year - YEARS_PER_PAGE), false),
      }}
      next={{
        label: t.nextYears,
        disabled: first + YEARS_PER_PAGE > upperYear,
        onClick: () => onActiveChange(Math.min(upperYear, year + YEARS_PER_PAGE), false),
      }}
      options={years.map((y) => ({
        key: String(y),
        label: String(y),
        name: String(y),
        current: y === year,
        disabled: y < lowerYear || y > upperYear,
      }))}
      activeIndex={years.indexOf(year)}
      onActiveChange={(index) => onActiveChange(years[index]!, true)}
      onChoose={onChoose}
    />
  );
}
