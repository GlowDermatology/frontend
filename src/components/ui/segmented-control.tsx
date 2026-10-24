"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /** Tooltip, e.g. why an option is unavailable. */
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
        <label key={option.value} className="relative flex" title={option.title}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[9px] focus-visible:outline-none disabled:cursor-not-allowed"
          />
          <span
            className={cn(
              "pointer-events-none flex w-full items-center justify-center gap-2 rounded-[9px] font-semibold whitespace-nowrap text-ink transition-[background-color,box-shadow] duration-150",
              "peer-checked:bg-surface-raised peer-checked:shadow-sm peer-hover:peer-not-checked:bg-surface-raised/50",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
              "peer-disabled:text-ink-muted peer-disabled:peer-hover:bg-transparent",
              ITEM_SIZES[size],
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
