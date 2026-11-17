"use client";

import { Select as SelectPrimitive } from "radix-ui";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { kitCopy } from "./copy";
import {
  disabledReasonProps,
  isReasonKey,
  useDisabledReason,
  type DisabledReason,
} from "./disabled-reason";
import { controlClass } from "./field";
import { Icon } from "./icon";
import { usePortalContainer } from "./layer";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

/* ------------------------------------------------------------------ model */

export interface SelectOption<T extends string = string> {
  /** The submitted value; `""` is allowed (e.g. «Hammasi») and mapped to an internal sentinel. */
  value: T;
  label: ReactNode;
  /** Plain text for typeahead when `label` is not a string. */
  text?: string;
  /** A second, muted line under the label. */
  description?: ReactNode;
  /** Unavailable without explanation; prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the option cannot be chosen and what to do. Shown as the second line; the option stays
   * reachable with the arrow keys (announced as unavailable, described by the reason) but cannot
   * be chosen.
   */
  disabledReason?: DisabledReason;
}

export interface SelectGroup<T extends string = string> {
  /** Group header (overline style), also the group's accessible name. */
  label: string;
  options: ReadonlyArray<SelectOption<T>>;
}

export type SelectItems<T extends string = string> = ReadonlyArray<
  SelectOption<T> | SelectGroup<T>
>;

/** Radix Select reserves `""` for "no value"; an option whose value is `""` uses this instead. */
export const SELECT_EMPTY_VALUE = "__gd_select_empty__";

export function isSelectGroup<T extends string>(
  item: SelectOption<T> | SelectGroup<T>,
): item is SelectGroup<T> {
  return "options" in item;
}

/** Every option in display order, groups flattened. */
export function flattenSelectOptions<T extends string>(
  items: SelectItems<T>,
): ReadonlyArray<SelectOption<T>> {
  return items.flatMap((item) => (isSelectGroup(item) ? item.options : [item]));
}

export function findSelectOption<T extends string>(
  items: SelectItems<T>,
  value: string | undefined,
): SelectOption<T> | undefined {
  if (value === undefined) return undefined;
  return flattenSelectOptions(items).find((option) => option.value === value);
}

/** The value handed to Radix: `""` is the placeholder state unless an option is `""`. */
export function toRadixValue(items: SelectItems, value: string): string {
  if (value !== "") return value;
  return findSelectOption(items, "") ? SELECT_EMPTY_VALUE : "";
}

export function fromRadixValue(value: string): string {
  return value === SELECT_EMPTY_VALUE ? "" : value;
}

function optionValue(value: string): string {
  return value === "" ? SELECT_EMPTY_VALUE : value;
}

/** Typeahead text of an option. */
export function optionText(option: SelectOption): string | undefined {
  if (option.text) return option.text;
  return typeof option.label === "string" || typeof option.label === "number"
    ? String(option.label)
    : undefined;
}

/* ------------------------------------------------------------------ looks */

export type SelectVariant = "field" | "filter";
export type SelectSize = "sm" | "md";

/** Toolbar filter trigger ("Holat: Hammasi"), shared with `SelectMenu`, `Combobox`, menus. */
export const filterTriggerClass =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-line-strong bg-transparent px-3.5 text-label whitespace-nowrap text-ink transition-colors duration-150 hover:bg-surface-raised data-[state=open]:bg-surface-raised";

/** Trigger classes; `field` is pixel-identical to `controlClass` (44px, 12px radius, 1.5px line). */
export function selectTriggerClass(variant: SelectVariant, size: SelectSize = "md"): string {
  if (variant === "filter") {
    return cn(
      filterTriggerClass,
      "min-w-[180px] justify-between text-left disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger data-disabled:cursor-not-allowed data-disabled:opacity-60 data-disabled:hover:bg-transparent",
      size === "sm" && "h-9 px-3 text-[13px] leading-[18px]",
    );
  }
  return cn(
    controlClass,
    "inline-flex items-center justify-between gap-2 text-left hover:border-ink aria-invalid:hover:border-danger data-disabled:cursor-not-allowed data-disabled:opacity-60 data-disabled:hover:border-line-strong data-[state=open]:border-gold-ink",
    size === "sm" && "h-9 px-3 text-[13px] leading-[18px]",
  );
}

const contentClass =
  "z-50 flex max-h-[min(360px,var(--radix-select-content-available-height))] flex-col overflow-hidden rounded-md border border-line bg-surface-raised text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/* The list is as wide as its trigger (long labels wrap); a filter trigger hugs its text, so its
   list is at least 180px and may grow to 320px before wrapping. */
const contentWidth: Record<SelectVariant, string> = {
  field: "w-(--radix-select-trigger-width) max-w-[calc(100vw-16px)]",
  filter:
    "min-w-[max(var(--radix-select-trigger-width),180px)] max-w-[min(320px,calc(100vw-16px))]",
};

const itemClass =
  "relative flex min-h-10 cursor-pointer flex-col justify-center gap-0.5 rounded-sm py-2 pr-9 pl-3 text-label text-ink outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[highlighted]:bg-gold-soft data-[state=checked]:text-ink";

const scrollButtonClass =
  "flex h-7 shrink-0 cursor-default items-center justify-center text-ink-muted";

/* --------------------------------------------------------------- hydrated */

const noopSubscribe = () => () => {};

/** `false` in the server render and during hydration, `true` afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* -------------------------------------------------------------- component */

export interface SelectProps<T extends string = string> {
  options: SelectItems<T>;
  /** Controlled value (`""` = nothing chosen unless an option has the value `""`). */
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  /** Shown while nothing is chosen. Defaults to «Tanlang». */
  placeholder?: ReactNode;
  /** Submits the value in a hidden input. */
  name?: string;
  form?: string;
  /** Announced as required (`aria-required`); validation stays with the form. */
  required?: boolean;
  /** A real `disabled` (not focusable); prefer `disabledReason`. */
  disabled?: boolean;
  /**
   * Why the choice cannot be changed now and what to do, e.g. «Avval sanani tanlang». A truthy
   * reason keeps the trigger focusable (`aria-disabled`), describes it to screen readers, shows
   * the reason in a tooltip on hover, focus and tap, and keeps the list closed. Wins over
   * `disabled`. The value is still submitted (like a read-only field).
   */
  disabledReason?: DisabledReason;
  /** The trigger's id, e.g. from `Field` so its `<label>` names the trigger. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  /** Accessible name when there is no `<label>`, also the list's name (filters). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** `field` = form control (full width, like a text input); `filter` = toolbar trigger. */
  variant?: SelectVariant;
  /** Muted text before the value in the trigger, e.g. «Holat:». */
  prefix?: ReactNode;
  size?: SelectSize;
  /** List alignment against the trigger. */
  align?: "start" | "end";
  /**
   * Render a styled native `<select>` on the server and until hydration, then swap to the custom
   * list: a no-JS GET form (storefront sort) still works.
   */
  nativeFallback?: boolean;
  /** Called when focus leaves the control (not when it moves into its own list). */
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  /** The trigger (or the native select before hydration), e.g. for React Hook Form `setFocus`. */
  ref?: Ref<HTMLButtonElement | HTMLSelectElement>;
  /** Trigger classes. */
  className?: string;
  /** List classes. */
  contentClassName?: string;
  /**
   * Replaces the trigger's content (prefix + selected label). For the `SelectMenu` wrapper, whose
   * callers build the whole trigger text themselves; prefer `prefix`.
   */
  triggerContent?: ReactNode;
}

/**
 * A single choice from a list (Radix Select, popper positioning): keyboard and typeahead, focus
 * return, a list portalled into the nearest dialog (or `<main>`), as wide as its trigger, with
 * group headers, descriptions, disabled reasons and a check mark on the chosen option. The trigger
 * renders the chosen label itself and carries `data-value`, so the server render is complete.
 */
export function Select<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  name,
  form,
  required,
  disabled: disabledProp,
  disabledReason,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  variant = "field",
  prefix,
  size = "md",
  align = "start",
  nativeFallback = false,
  onBlur,
  ref,
  className,
  contentClassName,
  triggerContent,
}: SelectProps<T>) {
  const t = useCopy(kitCopy);
  const hydrated = useHydrated();
  const container = usePortalContainer();
  const [inner, setInner] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const why = useDisabledReason(disabledReason, describedBy);
  const locked = why.reason !== null;
  const disabled = locked ? false : disabledProp;
  const current: string = value !== undefined ? value : inner;
  const selected = findSelectOption(options, current);
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  const placeholderNode = placeholder ?? t.select.placeholder;

  const change = (next: string) => {
    const option = findSelectOption(options, next);
    if (locked || option?.disabledReason) return;
    if (value === undefined) setInner(next);
    onValueChange?.(next as T);
  };

  const triggerClass = cn(selectTriggerClass(variant, size), className);
  const shared = {
    id,
    "aria-describedby": why.props["aria-describedby"],
    "aria-invalid": invalid || undefined,
    "aria-label": ariaLabel,
    "aria-labelledby": labelledBy,
    "aria-required": required || undefined,
    "data-value": current,
  };

  if (nativeFallback && !hydrated) {
    return (
      <span className={cn("relative flex", variant === "field" && "w-full")}>
        <select
          {...shared}
          {...why.props}
          ref={ref as Ref<HTMLSelectElement>}
          name={name}
          form={form}
          required={required}
          disabled={disabled || locked}
          value={current}
          onChange={(event) => change(event.target.value)}
          onBlur={onBlur}
          className={cn(triggerClass, "appearance-none pr-10")}
        >
          {!selected && (
            <option value="" disabled hidden>
              {typeof placeholderNode === "string" ? placeholderNode : ""}
            </option>
          )}
          {options.map((item) =>
            isSelectGroup(item) ? (
              <optgroup key={`group-${item.label}`} label={item.label}>
                {item.options.map((option) => (
                  <NativeOption key={option.value} option={option} />
                ))}
              </optgroup>
            ) : (
              <NativeOption key={item.value} option={item} />
            ),
          )}
        </select>
        <Icon
          name="chevron-down"
          size={variant === "field" ? 18 : 16}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-muted"
        />
        {why.text}
        {locked && name && <input type="hidden" name={name} form={form} value={current} />}
      </span>
    );
  }

  const display = triggerContent ?? (
    <>
      {prefix != null && <span className="shrink-0 text-ink-muted">{prefix}</span>}
      <span className="min-w-0 truncate">{selected ? selected.label : placeholderNode}</span>
    </>
  );

  /* A disabled-reason trigger swallows what would open the list or type ahead (cancelling the
     event also skips Radix's own handlers) and shows the reason instead. */
  const swallow = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.focus();
    why.reveal();
  };

  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <SelectPrimitive.Root
        value={toRadixValue(options, current)}
        onValueChange={(next) => change(fromRadixValue(next))}
        open={open && !locked}
        onOpenChange={(next) => {
          const shown = next && !locked;
          openRef.current = shown;
          setOpen(shown);
        }}
        disabled={disabled}
        form={form}
      >
        {/* The tooltip trigger sits inside the Select trigger, so Radix Select's `data-state`
            (open/closed) wins over the tooltip's; the description and the disabled-reason state
            sit on the button itself, so they win over both (an open tooltip does not add its
            own copy of the reason to the description). */}
        <SelectPrimitive.Trigger
          {...shared}
          aria-describedby={undefined}
          asChild
          ref={ref as Ref<HTMLButtonElement>}
          onBlur={(event) => {
            if (!openRef.current) onBlur?.(event);
          }}
          {...(locked
            ? {
                onPointerDown: swallow,
                onClick: swallow,
                onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                  if (isReasonKey(event)) swallow(event);
                },
              }
            : {})}
          className={triggerClass}
        >
          <TooltipTrigger asChild>
            <button type="button" {...why.props}>
              {/* Not `Select.Value`: it fills in the chosen label only after the list has
                  mounted on the client. Rendering the label here keeps the server render
                  complete. */}
              <span
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1.5",
                  !selected && !triggerContent && "text-ink-muted",
                )}
              >
                {display}
              </span>
              <SelectPrimitive.Icon asChild>
                <Icon
                  name="chevron-down"
                  size={variant === "field" ? 18 : 16}
                  className="shrink-0 text-ink-muted transition-transform duration-200 ease-out [[data-state=open]>&]:rotate-180"
                />
              </SelectPrimitive.Icon>
              {why.text}
            </button>
          </TooltipTrigger>
        </SelectPrimitive.Trigger>
        {why.bubble}
        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content
            position="popper"
            side="bottom"
            align={align}
            sideOffset={6}
            collisionPadding={8}
            aria-label={ariaLabel}
            className={cn(contentClass, contentWidth[variant], contentClassName)}
          >
            <SelectPrimitive.ScrollUpButton className={scrollButtonClass}>
              <Icon name="chevron-up" size={16} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1.5">
              {options.map((item, index) =>
                isSelectGroup(item) ? (
                  <SelectPrimitive.Group key={`group-${item.label}`}>
                    {index > 0 && (
                      <SelectPrimitive.Separator className="mx-2 my-1.5 h-px bg-line" />
                    )}
                    <SelectPrimitive.Label className="px-3 pt-2 pb-1 text-overline text-ink-muted uppercase">
                      {item.label}
                    </SelectPrimitive.Label>
                    {item.options.map((option) => (
                      <SelectItem key={option.value} option={option} />
                    ))}
                  </SelectPrimitive.Group>
                ) : (
                  <SelectItem key={item.value} option={item} />
                ),
              )}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className={scrollButtonClass}>
              <Icon name="chevron-down" size={16} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {name && <input type="hidden" name={name} form={form} value={current} disabled={disabled} />}
    </TooltipRoot>
  );
}

function NativeOption({ option }: { option: SelectOption }) {
  return (
    <option value={option.value} disabled={option.disabled || Boolean(option.disabledReason)}>
      {optionText(option) ?? option.value}
    </option>
  );
}

/** Keys that would choose the highlighted option. */
const CHOOSE_KEYS = new Set([" ", "Enter"]);

function SelectItem({ option }: { option: SelectOption }) {
  const descriptionId = useId();
  const reason = option.disabledReason || null;
  const second = reason ?? option.description;
  /* A disabled-reason option is not Radix-disabled (that would skip it in keyboard navigation,
     hiding the reason from keyboard and screen-reader users); choosing it is cancelled here. */
  const cancel = (event: SyntheticEvent) => event.preventDefault();
  return (
    <SelectPrimitive.Item
      value={optionValue(option.value)}
      disabled={option.disabled && !reason}
      textValue={optionText(option)}
      className={itemClass}
      {...(reason ? {} : { "aria-describedby": second ? descriptionId : undefined })}
      {...(reason
        ? {
            ...disabledReasonProps(descriptionId),
            onKeyDown: (event: KeyboardEvent) => {
              if (CHOOSE_KEYS.has(event.key)) cancel(event);
            },
            onPointerUp: cancel,
            onClick: cancel,
          }
        : {})}
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      {second && (
        <span
          id={descriptionId}
          className={cn("text-caption", reason ? "text-ink-muted" : "font-normal text-ink-muted")}
        >
          {second}
        </span>
      )}
      <SelectPrimitive.ItemIndicator className="absolute top-1/2 right-3 -translate-y-1/2 text-gold-ink">
        <Icon name="check" size={16} strokeWidth={2} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
