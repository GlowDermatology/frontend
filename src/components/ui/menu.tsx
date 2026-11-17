"use client";

import { DropdownMenu } from "radix-ui";
import { useId, useState, type KeyboardEvent, type ReactNode, type SyntheticEvent } from "react";

import { cn } from "@/lib/cn";

import {
  disabledReasonProps,
  isReasonKey,
  useDisabledReason,
  type DisabledReason,
} from "./disabled-reason";
import { usePortalContainer } from "./layer";
import { Select, filterTriggerClass } from "./select";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

export { filterTriggerClass };

export interface MenuOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /** Why the option cannot be chosen; shown under the label. */
  disabledReason?: DisabledReason;
}

interface SelectMenuProps<T extends string> {
  /** Button content, e.g. "Olish usuli: Hammasi". */
  trigger: ReactNode;
  /** Accessible name of the trigger and of the option list. */
  label: string;
  options: ReadonlyArray<MenuOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  triggerClassName?: string;
  align?: "start" | "end";
  /** A real `disabled` (not focusable); prefer `disabledReason`. */
  disabled?: boolean;
  /** Why the filter cannot be changed now and what to do (see `Select`). */
  disabledReason?: DisabledReason;
}

/**
 * Never taller than the viewport leaves (Radix exposes the room left on the
 * chosen side): a long option list scrolls instead of running off-screen. At
 * least as wide as its trigger (and 220px).
 */
const contentClass =
  "z-50 max-h-[min(60vh,var(--radix-dropdown-menu-content-available-height))] min-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] max-w-[min(360px,calc(100vw-16px))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

const itemClass =
  "relative flex h-10 cursor-pointer items-center gap-2.5 rounded-sm pr-9 pl-3 text-label outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[highlighted]:bg-gold-soft";

/**
 * A toolbar filter (one of several mutually exclusive options, e.g. page size), kept for its
 * call sites: a thin wrapper over `Select variant="filter"` (combobox trigger named by `label`,
 * listbox of options; arrow keys, typeahead and focus return from Radix Select). The trigger
 * shows `trigger` as given and hugs it. New code uses `Select` with `prefix` directly.
 */
export function SelectMenu<T extends string>({
  trigger,
  label,
  options,
  value,
  onValueChange,
  triggerClassName,
  align = "start",
  disabled,
  disabledReason,
}: SelectMenuProps<T>) {
  return (
    <Select<T>
      variant="filter"
      aria-label={label}
      disabled={disabled}
      disabledReason={disabledReason}
      options={options}
      value={value}
      onValueChange={onValueChange}
      triggerContent={trigger}
      align={align}
      className={cn("min-w-0 justify-start", triggerClassName)}
    />
  );
}

export interface ActionMenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  /** Unavailable without explanation; prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the command cannot run now and what to do. Shown under the label (instead of `hint`);
   * the item stays reachable with the arrow keys, is announced as unavailable with the reason,
   * and selecting it does nothing (the menu stays open).
   */
  disabledReason?: DisabledReason;
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
  /** A real `disabled` (not focusable); prefer `disabledReason` or `busy`. */
  disabled?: boolean;
  /**
   * Why the menu cannot be opened now and what to do: the trigger stays focusable
   * (`aria-disabled`), is described by the reason and shows it in a tooltip (hover, focus, tap).
   */
  disabledReason?: DisabledReason;
  /** A command from this menu is running: focusable, `aria-busy`, does not open. */
  busy?: boolean;
}

/** A menu of commands, e.g. "Holatni o‘zgartirish". */
export function ActionMenu({
  trigger,
  label,
  items,
  triggerClassName,
  align = "end",
  empty,
  disabled,
  disabledReason,
  busy = false,
}: ActionMenuProps) {
  const container = usePortalContainer();
  const [open, setOpen] = useState(false);
  const why = useDisabledReason(busy ? null : disabledReason);
  const inert = busy || why.reason !== null;
  /* What would open the menu is cancelled (which also skips Radix's own handlers). */
  const swallow = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.focus();
    why.reveal();
  };
  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <DropdownMenu.Root
        modal={false}
        open={open && !inert}
        onOpenChange={(next) => setOpen(next && !inert)}
      >
        <DropdownMenu.Trigger
          asChild
          disabled={inert ? false : disabled}
          {...(inert
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
              {...why.props}
              {...(busy ? { "aria-busy": true, "aria-disabled": true, "data-busy": "" } : {})}
              className={cn(
                triggerClassName,
                why.reason && "cursor-not-allowed opacity-60",
                busy && "cursor-wait opacity-80",
              )}
            >
              {trigger}
              {why.text}
            </button>
          </TooltipTrigger>
        </DropdownMenu.Trigger>
        {why.bubble}
        <DropdownMenu.Portal container={container}>
          <DropdownMenu.Content
            align={align}
            sideOffset={6}
            collisionPadding={8}
            aria-label={label}
            className={contentClass}
          >
            {items.length === 0 && empty && (
              <div className="max-w-[260px] px-3 py-2.5 text-body-sm text-ink-muted">{empty}</div>
            )}
            {items.map((item) => (
              <ActionItem key={item.key} item={item} />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </TooltipRoot>
  );
}

function ActionItem({ item }: { item: ActionMenuItem }) {
  const hintId = useId();
  const reason = item.disabledReason || null;
  const hint = reason ?? item.hint;
  return (
    <DropdownMenu.Item
      disabled={item.disabled && !reason}
      onSelect={(event) => {
        /* A disabled-reason item is focusable (Radix `disabled` would skip it, hiding the
           reason from keyboard users); selecting it keeps the menu open and does nothing. */
        if (reason) event.preventDefault();
        else item.onSelect();
      }}
      {...(reason
        ? disabledReasonProps(hintId)
        : { "aria-describedby": hint ? hintId : undefined })}
      className={cn(
        itemClass,
        "group h-auto min-h-10 flex-col items-start justify-center gap-0 py-2 pr-3",
      )}
    >
      {item.label}
      {hint && (
        <span
          id={hintId}
          className={cn(
            "text-caption font-normal text-ink-muted",
            !reason && "group-data-[highlighted]:text-ink",
          )}
        >
          {hint}
        </span>
      )}
    </DropdownMenu.Item>
  );
}
