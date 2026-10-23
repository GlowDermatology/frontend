"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name; required because the visual label sits elsewhere. */
  "aria-label": string;
}

/** 52×32 toggle: gold track when on, line-strong when off. */
export function Switch({ checked, onCheckedChange, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-150",
        checked ? "bg-gold" : "bg-line-strong",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
