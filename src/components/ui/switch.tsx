"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { useDisabledReason, type DisabledReason } from "./disabled-reason";
import { TooltipRoot, TooltipTrigger } from "./tooltip";

interface SwitchProps extends Omit<ComponentProps<"button">, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name; required because the visual label sits elsewhere. */
  "aria-label": string;
  /**
   * The change it started is being saved: the switch stays focusable (`aria-busy`,
   * `aria-disabled`) and ignores activation, so a keyboard user keeps their place.
   */
  busy?: boolean;
  /**
   * Why the switch cannot be flipped now and what to do, e.g. «Avval rasm qo‘shing». It stays
   * focusable (`aria-disabled`), is described by the reason, shows it in a tooltip on hover,
   * focus and tap, and does not toggle. Prefer it to `disabled`.
   */
  disabledReason?: DisabledReason;
}

/**
 * 52×32 toggle: gold track when on, line-strong when off. A `busy` or disabled-reason switch
 * keeps its place in the tab order and refuses to toggle; a plain `disabled` still works.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  busy = false,
  disabledReason,
  disabled,
  onClick,
  "aria-describedby": describedBy,
  ...rest
}: SwitchProps) {
  const why = useDisabledReason(busy ? null : disabledReason, describedBy);
  const inert = busy || why.reason !== null;
  return (
    <TooltipRoot open={why.open} onOpenChange={why.onOpenChange}>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          {...rest}
          disabled={inert ? undefined : disabled}
          {...why.props}
          {...(busy ? { "aria-busy": true, "aria-disabled": true, "data-busy": "" } : {})}
          onClick={(event) => {
            if (inert) {
              /* Cancelling also keeps Radix from closing the reason it opens on tap. */
              event.preventDefault();
              why.reveal();
              return;
            }
            onClick?.(event);
            if (!event.defaultPrevented) onCheckedChange(!checked);
          }}
          className={cn(
            "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-150",
            "disabled:cursor-not-allowed disabled:opacity-60 data-disabled:cursor-not-allowed data-disabled:opacity-60",
            busy && "cursor-wait opacity-80",
            checked ? "bg-gold" : "bg-line-strong",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
              checked && "translate-x-5",
            )}
          />
          {why.text}
        </button>
      </TooltipTrigger>
      {why.bubble}
    </TooltipRoot>
  );
}
