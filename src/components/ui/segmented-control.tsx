"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { disabledReasonProps, ReasonTooltip, type DisabledReason } from "./disabled-reason";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /**
   * Why the option cannot be chosen and what to do («Avval manzilni kiriting»). The option stays
   * reachable with the arrow keys, is announced as unavailable with the reason, and shows the
   * reason in a tooltip on hover, focus and tap.
   */
  disabledReason?: DisabledReason;
  /**
   * @deprecated Use `disabledReason`. A `title` on a `disabled` option is treated as its reason;
   * on an available option it stays a native tooltip.
   */
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** `fill` splits the width equally (grid); `hug` sizes to content. */
  layout?: "hug" | "fill";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ITEM_SIZES = {
  sm: "h-9 px-3.5 text-[13px] leading-[18px]",
  md: "h-9 px-4 text-label",
  lg: "h-10 px-4 text-label",
} as const;

/**
 * Single-choice segmented control ("pill tabs" on a gold-soft track). Built on
 * native radio inputs so arrow keys, form semantics and screen-reader
 * announcements work without custom keyboard code.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = "hug",
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "gap-1 rounded-md bg-gold-soft p-1",
        layout === "fill" ? "grid auto-cols-fr grid-flow-col" : "flex flex-wrap",
        className,
      )}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          name={name}
          option={option}
          checked={value === option.value}
          size={size}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function Segment<T extends string>({
  name,
  option,
  checked,
  size,
  onChange,
}: {
  name: string;
  option: SegmentOption<T>;
  checked: boolean;
  size: "sm" | "md" | "lg";
  onChange: (value: T) => void;
}) {
  const reasonId = useId();
  const [tipOpen, setTipOpen] = useState(false);
  const reason = option.disabledReason || (option.disabled ? option.title : undefined) || null;
  const input = (
    <input
      type="radio"
      name={name}
      value={option.value}
      checked={checked}
      disabled={reason ? undefined : option.disabled}
      {...(reason ? disabledReasonProps(reasonId) : {})}
      /* A disabled-reason radio is still reached by the arrow keys; React keeps the controlled
         `checked` as it was, so only the reason opens. */
      onChange={() => (reason ? setTipOpen(true) : onChange(option.value))}
      onClick={
        reason
          ? (event) => {
              /* Cancelling the click keeps the radio unchecked and keeps Radix from closing
                 the tooltip it opens (touch screens have no hover). */
              event.preventDefault();
              setTipOpen(true);
            }
          : undefined
      }
      className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[9px] focus-visible:outline-none disabled:cursor-not-allowed data-disabled:cursor-not-allowed"
    />
  );
  return (
    <label className="relative flex" title={reason ? undefined : option.title}>
      {reason ? (
        <ReasonTooltip reason={reason} open={tipOpen} onOpenChange={setTipOpen}>
          {input}
        </ReasonTooltip>
      ) : (
        input
      )}
      <span
        className={cn(
          "pointer-events-none flex w-full items-center justify-center gap-2 rounded-[9px] font-semibold whitespace-nowrap text-ink transition-[background-color,box-shadow] duration-150",
          "peer-checked:bg-surface-raised peer-checked:shadow-sm peer-hover:peer-not-checked:bg-surface-raised/50",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
          "peer-disabled:text-ink-muted peer-disabled:peer-hover:bg-transparent",
          "peer-data-disabled:text-ink-muted peer-data-disabled:peer-hover:bg-transparent",
          ITEM_SIZES[size],
        )}
      >
        {option.label}
        {reason && (
          <span id={reasonId} hidden>
            {reason}
          </span>
        )}
      </span>
    </label>
  );
}
