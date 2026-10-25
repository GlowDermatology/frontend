"use client";

import { Popover } from "radix-ui";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { filterOptions } from "@/lib/search";

import { Icon } from "./icon";
import { filterTriggerClass } from "./menu";

export interface ComboboxOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Plain text the search matches (case- and accent-insensitive). */
  text: string;
}

interface ComboboxProps<T extends string> {
  /** Button content, e.g. the current choice. */
  trigger: ReactNode;
  /** Accessible name of the search box and the option list. */
  label: string;
  options: ReadonlyArray<ComboboxOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  triggerClassName?: string;
  align?: "start" | "end";
  placeholder?: string;
  /** Marks the trigger invalid and points it at the error text. */
  invalid?: boolean;
  describedBy?: string;
}

/**
 * A searchable single choice for long lists (the notification link picker
 * lists every active product, which grows with Billz imports): a popover with
 * a search box (`role="combobox"`) driving a scrollable `listbox` through
 * `aria-activedescendant`. Arrow keys, Home/End, Enter and Escape work from
 * the search box; the list never grows past the space the viewport leaves.
 */
export function Combobox<T extends string>({
  trigger,
  label,
  options,
  value,
  onValueChange,
  triggerClassName,
  align = "start",
  placeholder = "Qidirish…",
  invalid,
  describedBy,
}: ComboboxProps<T>) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const visible = filterOptions(options, query);
  const activeIndex = Math.min(active, visible.length - 1);
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [id, open, activeIndex]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setQuery("");
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.value === value),
        ),
      );
    }
    setOpen(next);
  };

  const choose = (option: ComboboxOption<T> | undefined) => {
    if (!option) return;
    onValueChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = visible.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(activeIndex + 1, last),
      ArrowUp: Math.max(activeIndex - 1, 0),
      PageDown: Math.min(activeIndex + 8, last),
      PageUp: Math.max(activeIndex - 8, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]!);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visible[activeIndex]);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        className={cn(filterTriggerClass, triggerClassName, invalid && "border-danger")}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        {trigger}
        <Icon name="chevron-down" size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
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
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-label focus-visible:outline-none"
            />
          </label>
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="m-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-0"
          >
            {visible.length === 0 && (
              <li className="px-3 py-2.5 text-body-sm text-ink-muted">Hech narsa topilmadi</li>
            )}
            {visible.map((option, index) => (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={option.value === value}
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={cn(
                  "relative flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm py-2 pr-9 pl-3 text-label select-none",
                  index === activeIndex && "bg-gold-soft",
                )}
              >
                {option.label}
                {option.value === value && (
                  <Icon
                    name="check"
                    size={16}
                    strokeWidth={2}
                    className="absolute right-3 text-gold-ink"
                  />
                )}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
