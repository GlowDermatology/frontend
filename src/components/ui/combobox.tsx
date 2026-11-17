"use client";

import { Popover } from "radix-ui";
import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { filterOptions } from "@/lib/search";

import { kitCopy } from "./copy";
import { isReasonKey, useDisabledReason, type DisabledReason } from "./disabled-reason";
import { Icon } from "./icon";
import { usePortalContainer } from "./layer";
import { filterTriggerClass } from "./select";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

export interface ComboboxOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Plain text the search matches (case- and accent-insensitive). */
  text: string;
  /** A second, muted line under the label (also searched when it is a string). */
  description?: ReactNode;
  /** Shown but not choosable (skipped by the arrow keys); prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the option cannot be chosen and what to do. Shown as the second line (instead of
   * `description`); the option stays reachable with the arrow keys, is announced as unavailable
   * and described by the reason, but cannot be chosen.
   */
  disabledReason?: DisabledReason;
}

export interface ComboboxGroup<T extends string> {
  /** Group header (overline style), also the group's accessible name. */
  label: string;
  options: ReadonlyArray<ComboboxOption<T>>;
}

export type ComboboxItems<T extends string> = ReadonlyArray<ComboboxOption<T> | ComboboxGroup<T>>;

function isGroup<T extends string>(
  item: ComboboxOption<T> | ComboboxGroup<T>,
): item is ComboboxGroup<T> {
  return "options" in item;
}

export interface ComboboxSection<T extends string> {
  /** `null` for options outside any group. */
  label: string | null;
  /** Visible options with their index in the flat navigation order. */
  options: ReadonlyArray<{ option: ComboboxOption<T>; index: number }>;
}

/**
 * The visible list for a query: matching options in display order, grouped, empty groups
 * dropped, each with its position in the flat order the arrow keys walk. Consecutive ungrouped
 * options share one section. Pure, for the component and its tests.
 */
export function comboboxSections<T extends string>(
  items: ComboboxItems<T>,
  query: string,
): { sections: ReadonlyArray<ComboboxSection<T>>; flat: ReadonlyArray<ComboboxOption<T>> } {
  const sections: ComboboxSection<T>[] = [];
  const flat: ComboboxOption<T>[] = [];
  const push = (label: string | null, options: ReadonlyArray<ComboboxOption<T>>) => {
    const visible = filterOptions(
      options.map((option) => ({
        option,
        text:
          typeof option.description === "string"
            ? `${option.text} ${option.description}`
            : option.text,
      })),
      query,
    );
    if (visible.length === 0) return;
    const entries = visible.map(({ option }) => {
      flat.push(option);
      return { option, index: flat.length - 1 };
    });
    const last = sections.at(-1);
    if (label === null && last && last.label === null) {
      last.options = [...last.options, ...entries];
    } else {
      sections.push({ label, options: entries });
    }
  };
  for (const item of items) {
    if (isGroup(item)) push(item.label, item.options);
    else push(null, [item]);
  }
  return { sections, flat };
}

/**
 * The enabled option `step` places from `from` (clamped to the list), skipping disabled ones in
 * the direction of travel and, if there are none that way, the nearest one back. `step` 0 finds
 * the nearest enabled option at or after `from`. `-1` when no option is enabled.
 */
export function nextEnabledIndex<T extends string>(
  flat: ReadonlyArray<ComboboxOption<T>>,
  from: number,
  step: number,
): number {
  const n = flat.length;
  if (n === 0) return -1;
  const direction = step < 0 ? -1 : 1;
  const start = Math.max(0, Math.min(n - 1, from + step));
  for (let i = start; i >= 0 && i < n; i += direction) if (!flat[i]?.disabled) return i;
  for (let i = start - direction; i >= 0 && i < n; i -= direction) if (!flat[i]?.disabled) return i;
  return -1;
}

interface ComboboxProps<T extends string> {
  /** Button content, e.g. the current choice. */
  trigger: ReactNode;
  /** Accessible name of the search box and the option list. */
  label: string;
  /** Options, optionally in groups (`{ label, options }`). */
  options: ComboboxItems<T>;
  value: T;
  onValueChange: (value: T) => void;
  triggerClassName?: string;
  align?: "start" | "end";
  /** Search box placeholder; defaults to «Qidirish…». */
  placeholder?: string;
  /** Marks the trigger invalid (danger border, `data-invalid` for the error reveal); point
   * `describedBy` at the error text. */
  invalid?: boolean;
  describedBy?: string;
  /** The trigger's id (e.g. from `Field`). */
  id?: string;
  /** A real `disabled` (not focusable); prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the choice cannot be changed now and what to do: the trigger stays focusable
   * (`aria-disabled`), is described by the reason, shows it in a tooltip (hover, focus, tap) and
   * does not open. Wins over `disabled`.
   */
  disabledReason?: DisabledReason;
}

/**
 * A searchable single choice for long lists (the notification link picker lists every active
 * product; the audit log's grouped action list): a popover with a search box (`role="combobox"`)
 * driving a scrollable `listbox` through `aria-activedescendant`. Arrow keys, Page Up/Down,
 * Home/End, Enter and Escape work from the search box; group headers are announced through
 * `role="group"`. The list is as wide as its trigger (at least 280px, so the search box has room;
 * long labels wrap) and never taller than the space the viewport leaves.
 */
export function Combobox<T extends string>({
  trigger,
  label,
  options,
  value,
  onValueChange,
  triggerClassName,
  align = "start",
  placeholder,
  invalid,
  describedBy,
  id: triggerId,
  disabled,
  disabledReason,
}: ComboboxProps<T>) {
  const t = useCopy(kitCopy);
  const id = useId();
  const why = useDisabledReason(disabledReason, describedBy);
  const locked = why.reason !== null;
  const container = usePortalContainer();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { sections, flat } = comboboxSections(options, query);
  const activeIndex = flat[Math.min(active, flat.length - 1)]?.disabled
    ? nextEnabledIndex(flat, Math.min(active, flat.length - 1), 0)
    : Math.min(active, flat.length - 1);
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [id, open, activeIndex]);

  const onOpenChange = (next: boolean) => {
    if (next && locked) return;
    if (next) {
      setQuery("");
      const all = comboboxSections(options, "").flat;
      const chosen = all.findIndex((o) => o.value === value);
      setActive(Math.max(0, chosen >= 0 ? chosen : nextEnabledIndex(all, 0, 0)));
    }
    setOpen(next);
  };

  const choose = (option: ComboboxOption<T> | undefined) => {
    if (!option || option.disabled || option.disabledReason) return;
    onValueChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = flat.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => nextEnabledIndex(flat, activeIndex, 1),
      ArrowUp: () => nextEnabledIndex(flat, activeIndex, -1),
      PageDown: () => nextEnabledIndex(flat, activeIndex, 8),
      PageUp: () => nextEnabledIndex(flat, activeIndex, -8),
      Home: () => nextEnabledIndex(flat, 0, 0),
      End: () => nextEnabledIndex(flat, last, 0),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setActive(move());
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(flat[activeIndex]);
    }
  };

  const renderOption = ({ option, index }: { option: ComboboxOption<T>; index: number }) => {
    const reason = option.disabledReason || null;
    const second = reason ?? option.description;
    const secondId = `${optionId(index)}-second`;
    return (
      <li
        key={option.value}
        id={optionId(index)}
        role="option"
        aria-selected={option.value === value}
        aria-disabled={option.disabled || reason ? true : undefined}
        aria-describedby={second ? secondId : undefined}
        onPointerMove={() => {
          if (!option.disabled) setActive(index);
        }}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => choose(option)}
        className={cn(
          "relative flex min-h-10 cursor-pointer flex-col justify-center gap-0.5 rounded-sm py-2 pr-9 pl-3 text-label select-none",
          index === activeIndex && "bg-gold-soft",
          (option.disabled || reason) && "cursor-not-allowed text-ink-muted",
        )}
      >
        <span>{option.label}</span>
        {second && (
          <span id={secondId} className="text-caption font-normal text-ink-muted">
            {second}
          </span>
        )}
        {option.value === value && (
          <Icon
            name="check"
            size={16}
            strokeWidth={2}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gold-ink"
          />
        )}
      </li>
    );
  };

  /* A disabled-reason trigger cancels what would open the popover (which also skips Radix's own
     handlers) and shows the reason instead. */
  const swallow = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.focus();
    why.reveal();
  };

  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <Popover.Root open={open && !locked} onOpenChange={onOpenChange}>
        {/* Popover's `data-state` wins over the tooltip's; the description and the disabled-reason
          state sit on the button itself (an open tooltip adds no second copy of the reason). */}
        <Popover.Trigger
          asChild
          disabled={locked ? false : disabled}
          {...(locked
            ? {
                onPointerDown: swallow,
                onClick: swallow,
                onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                  if (isReasonKey(event)) swallow(event);
                },
              }
            : {})}
        >
          <TooltipTrigger asChild>
            <button
              type="button"
              id={triggerId}
              className={cn(
                filterTriggerClass,
                "disabled:cursor-not-allowed disabled:opacity-60 data-disabled:cursor-not-allowed data-disabled:opacity-60 data-disabled:hover:bg-transparent",
                triggerClassName,
                invalid && "border-danger",
              )}
              /* `aria-invalid` is not defined for a button: the error reaches screen readers
                 through `describedBy`, and `data-invalid` lets the error reveal find it. */
              data-invalid={invalid ? "true" : undefined}
              {...why.props}
            >
              {trigger}
              <Icon
                name="chevron-down"
                size={16}
                className="shrink-0 transition-transform duration-200 ease-out [[data-state=open]>&]:rotate-180"
              />
              {why.text}
            </button>
          </TooltipTrigger>
        </Popover.Trigger>
        {why.bubble}
        <Popover.Portal container={container}>
          <Popover.Content
            aria-label={label}
            align={align}
            sideOffset={6}
            collisionPadding={8}
            className="z-50 flex max-h-[min(70vh,var(--radix-popover-content-available-height))] w-[max(var(--radix-popover-trigger-width),280px)] max-w-[calc(100vw-16px)] flex-col gap-1.5 overflow-hidden rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
          >
            <label className="flex h-10 shrink-0 items-center gap-2 rounded-sm border border-line-strong px-2.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-gold-ink">
              <Icon name="search" size={16} className="shrink-0 text-ink-muted" />
              <input
                role="combobox"
                aria-label={label}
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(
                    Math.max(
                      0,
                      nextEnabledIndex(comboboxSections(options, event.target.value).flat, 0, 0),
                    ),
                  );
                }}
                onKeyDown={onKeyDown}
                placeholder={placeholder ?? t.combobox.placeholder}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-label focus-visible:outline-none"
              />
            </label>
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              className="scroll-slim m-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-0"
            >
              {flat.length === 0 && (
                <li role="presentation" className="px-3 py-2.5 text-body-sm text-ink-muted">
                  {t.combobox.empty}
                </li>
              )}
              {sections.map((section, sectionIndex) =>
                section.label === null ? (
                  section.options.map(renderOption)
                ) : (
                  <li
                    key={`group-${section.label}`}
                    role="presentation"
                    className={cn(sectionIndex > 0 && "mt-1.5 border-t border-line pt-1.5")}
                  >
                    <ul
                      role="group"
                      aria-labelledby={`${id}-group-${sectionIndex}`}
                      className="m-0 list-none p-0"
                    >
                      <li
                        id={`${id}-group-${sectionIndex}`}
                        role="presentation"
                        className="px-3 pt-1.5 pb-1 text-overline text-ink-muted uppercase"
                      >
                        {section.label}
                      </li>
                      {section.options.map(renderOption)}
                    </ul>
                  </li>
                ),
              )}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </TooltipRoot>
  );
}
