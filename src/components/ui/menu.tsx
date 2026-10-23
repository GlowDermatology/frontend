"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./icon";

export interface MenuOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectMenuProps<T extends string> {
  /** Button content, e.g. "Olish usuli: Hammasi". */
  trigger: ReactNode;
  /** Accessible name for the option list. */
  label: string;
  options: ReadonlyArray<MenuOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  triggerClassName?: string;
  align?: "start" | "end";
}

export const filterTriggerClass =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-line-strong bg-transparent px-3.5 text-label whitespace-nowrap text-ink transition-colors duration-150 hover:bg-surface-raised data-[state=open]:bg-surface-raised";

const contentClass =
  "z-50 min-w-[220px] overflow-hidden rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

const itemClass =
  "relative flex h-10 cursor-pointer items-center gap-2.5 rounded-sm pr-9 pl-3 text-label outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[highlighted]:bg-gold-soft";

/**
 * A menu of mutually exclusive options (filters, page size). Radix provides
 * arrow-key navigation, typeahead, focus return and `menuitemradio` semantics.
 */
export function SelectMenu<T extends string>({
  trigger,
  label,
  options,
  value,
  onValueChange,
  triggerClassName,
  align = "start",
}: SelectMenuProps<T>) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={cn(filterTriggerClass, triggerClassName)}>
        {trigger}
        <Icon name="chevron-down" size={16} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          aria-label={label}
          className={contentClass}
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onValueChange(v as T)}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={itemClass}
              >
                {option.label}
                <DropdownMenu.ItemIndicator className="absolute right-3 text-gold-ink">
                  <Icon name="check" size={16} strokeWidth={2} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export interface ActionMenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  hint?: ReactNode;
}

interface ActionMenuProps {
  trigger: ReactNode;
  label: string;
  items: ReadonlyArray<ActionMenuItem>;
  triggerClassName?: string;
  align?: "start" | "end";
  /** Shown when there are no items. */
  empty?: ReactNode;
}

/** A menu of commands, e.g. "Holatni o‘zgartirish". */
export function ActionMenu({
  trigger,
  label,
  items,
  triggerClassName,
  align = "end",
  empty,
}: ActionMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={triggerClassName}>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          aria-label={label}
          className={contentClass}
        >
          {items.length === 0 && empty && (
            <div className="max-w-[260px] px-3 py-2.5 text-body-sm text-ink-muted">{empty}</div>
          )}
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.key}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                itemClass,
                "h-auto min-h-10 flex-col items-start justify-center gap-0 py-2 pr-3",
              )}
            >
              {item.label}
              {item.hint && (
                <span className="text-caption font-normal text-ink-muted">{item.hint}</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
