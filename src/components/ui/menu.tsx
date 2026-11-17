"use client";

import { DropdownMenu } from "radix-ui";
import {
  useId,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/cn";

import {
  disabledReasonProps,
  isReasonKey,
  useDisabledReason,
  type DisabledReason,
} from "./disabled-reason";
import { Icon } from "./icon";
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

/*
 * Shared menu classes (Radix `DropdownMenu` parts), so every menu of the site (the storefront's
 * account menu, the admin profile menu, the sign-in brand rows) looks the same.
 */

/**
 * `DropdownMenu.Content`: never taller than the viewport leaves (Radix exposes the room left on
 * the chosen side): a long option list scrolls instead of running off-screen. At least as wide
 * as its trigger (and 220px).
 */
export const menuContentClass =
  "scroll-slim z-50 max-h-[min(60vh,var(--radix-dropdown-menu-content-available-height))] min-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] max-w-[min(360px,calc(100vw-16px))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/** `DropdownMenu.SubContent`: as `menuContentClass`, sized by its own content. */
export const menuSubContentClass =
  "scroll-slim z-50 max-h-[min(60vh,var(--radix-dropdown-menu-content-available-height))] min-w-[220px] max-w-[min(320px,calc(100vw-16px))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/** A command or link row (`DropdownMenu.Item`, also `asChild` on an `<a>` or a `<button>`). */
export const menuItemClass =
  "relative flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-label text-ink no-underline outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[highlighted]:bg-gold-soft";

/** A row with room for a check at the end (radio rows, `MenuRadioItem`). */
export const menuCheckItemClass = cn(menuItemClass, "pr-9");

/** A group heading (`DropdownMenu.Label`): a small uppercase overline. */
export const menuLabelClass = "px-3 pt-2 pb-1 text-overline text-ink-muted uppercase";

/** `DropdownMenu.Separator`. */
export const menuSeparatorClass = "mx-1 my-1 h-px bg-line";

const contentClass = menuContentClass;
const itemClass = menuCheckItemClass;

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

/* ---------------------------------------------------------------------------------------------
 * Submenus and radio rows
 * ------------------------------------------------------------------------------------------- */

/** The `sm` breakpoint (`--breakpoint-sm`, 600px): from here a submenu opens to the side. */
export const MENU_SIDE_QUERY = "(min-width: 37.5rem)";

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };
}

/** Whether a submenu fits beside its menu (true on the server: menus open on the client only). */
function useSideSubmenus(): boolean {
  return useSyncExternalStore(
    subscribeMedia(MENU_SIDE_QUERY),
    () =>
      typeof window === "undefined" || typeof window.matchMedia !== "function"
        ? true
        : window.matchMedia(MENU_SIDE_QUERY).matches,
    () => true,
  );
}

export interface MenuSubProps {
  /** The row's name, e.g. «Til». */
  label: ReactNode;
  /** The current value, shown muted at the end of the row, e.g. «O‘zbekcha». */
  value?: ReactNode;
  /** A leading icon (an `<Icon>` or a flag), muted. */
  icon?: ReactNode;
  /** Accessible name of the submenu (and of the inline group below `sm`). */
  contentLabel: string;
  /** The submenu's items: `DropdownMenu.Item`s (links, commands) or a `MenuRadioGroup`. */
  children: ReactNode;
  /**
   * `auto` (default): a side submenu from `sm`, an inline expansion below it (a side submenu
   * cannot fit at 390px). `side` / `inline` force one form (e.g. `inline` in a drawer).
   */
  layout?: "auto" | "side" | "inline";
  /** Opens the inline form expanded (tests, a remembered state). */
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * A menu row that opens a nested menu: «Til · O‘zbekcha ›». From `sm` it is a Radix submenu
 * (opens on hover, →/Enter/Space; ← or Esc closes it), portalled like its parent. Below `sm` the
 * row is a disclosure inside the same menu: selecting it (tap, Enter, Space, →) toggles its items
 * in place below it (`aria-expanded`), so the menu never leaves the screen; ← collapses it.
 * Must be rendered inside a `DropdownMenu.Content`.
 */
export function MenuSub({
  label,
  value,
  icon,
  contentLabel,
  children,
  layout = "auto",
  defaultExpanded = false,
  className,
}: MenuSubProps) {
  const side = useSideSubmenus();
  const container = usePortalContainer();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const groupId = useId();
  const asSide = layout === "side" || (layout === "auto" && side);

  const row = (chevron: "chevron-right" | "chevron-down") => (
    <>
      {icon ? <span className="flex shrink-0 text-ink-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value ? (
        <span className="max-w-[45%] min-w-0 truncate text-body-sm font-normal text-ink-muted">
          {value}
        </span>
      ) : null}
      <Icon
        name={chevron}
        size={16}
        className={cn(
          "shrink-0 text-ink-muted transition-transform duration-150",
          chevron === "chevron-down" && expanded && "rotate-180",
        )}
      />
    </>
  );

  if (asSide) {
    return (
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          data-menu-sub=""
          className={cn(
            menuItemClass,
            "data-[state=open]:bg-gold-soft data-[state=open]:data-[highlighted]:bg-gold-soft",
            className,
          )}
        >
          {row("chevron-right")}
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal container={container}>
          <DropdownMenu.SubContent
            aria-label={contentLabel}
            sideOffset={6}
            alignOffset={-6}
            collisionPadding={8}
            className={menuSubContentClass}
          >
            {children}
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    );
  }

  return (
    <>
      <DropdownMenu.Item
        data-menu-sub=""
        aria-expanded={expanded}
        aria-controls={expanded ? groupId : undefined}
        onSelect={(event) => {
          /* A disclosure, not a command: the menu stays open. */
          event.preventDefault();
          setExpanded((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && !expanded) {
            event.preventDefault();
            setExpanded(true);
          } else if (event.key === "ArrowLeft" && expanded) {
            event.preventDefault();
            setExpanded(false);
          }
        }}
        className={cn(menuItemClass, className)}
      >
        {row("chevron-down")}
      </DropdownMenu.Item>
      {expanded ? (
        <DropdownMenu.Group
          id={groupId}
          aria-label={contentLabel}
          data-menu-sub-inline=""
          className="mb-1 ml-3 border-l border-line pl-1.5"
        >
          {children}
        </DropdownMenu.Group>
      ) : null}
    </>
  );
}

interface MenuRadioGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the group. */
  label?: string;
  children: ReactNode;
  className?: string;
}

/** A single-choice group inside a menu (`menuitemradio` rows, `aria-checked`). */
export function MenuRadioGroup<T extends string>({
  value,
  onValueChange,
  label,
  children,
  className,
}: MenuRadioGroupProps<T>) {
  return (
    <DropdownMenu.RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      aria-label={label}
      className={className}
    >
      {children}
    </DropdownMenu.RadioGroup>
  );
}

interface MenuRadioItemProps {
  value: string;
  children: ReactNode;
  /** A leading icon, muted. */
  icon?: ReactNode;
  /** Keep the menu open after choosing (settings that apply at once, e.g. the theme). */
  keepOpen?: boolean;
  /** Accessible name when the visible content is an icon only. */
  "aria-label"?: string;
  className?: string;
}

/** A radio row: icon, label, and a gold check at the end when chosen. */
export function MenuRadioItem({
  value,
  children,
  icon,
  keepOpen = false,
  "aria-label": ariaLabel,
  className,
}: MenuRadioItemProps) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      aria-label={ariaLabel}
      onSelect={keepOpen ? (event) => event.preventDefault() : undefined}
      className={cn(menuCheckItemClass, className)}
    >
      {icon ? <span className="flex shrink-0 text-ink-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <DropdownMenu.ItemIndicator className="absolute top-1/2 right-3 flex -translate-y-1/2 text-gold-ink">
        <Icon name="check" size={16} />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  );
}
