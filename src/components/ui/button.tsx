import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "dashed"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-on-gold hover:brightness-[1.04] disabled:bg-line disabled:text-ink-muted disabled:hover:brightness-100",
  secondary:
    "border-[1.5px] border-line-strong bg-surface-raised text-ink hover:bg-surface disabled:text-ink-muted",
  outline: "border-[1.5px] border-line-strong bg-transparent text-ink hover:bg-surface-raised",
  ghost: "bg-transparent text-ink hover:bg-gold-soft",
  danger: "border-[1.5px] border-danger bg-transparent text-ink hover:bg-danger-soft",
  /* White on danger is 4.4:1, so the label stays 15px bold (design-system rule). */
  destructive: "bg-danger text-[15px] text-white hover:brightness-95 disabled:opacity-60",
  dashed:
    "border-[1.5px] border-dashed border-line-strong bg-transparent text-ink hover:bg-surface-raised",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] leading-[18px]",
  md: "h-11 px-[18px] text-label font-bold",
  lg: "h-[52px] px-[26px] text-[15px] leading-[normal]",
  xl: "h-14 px-[26px] text-[15px] leading-[normal]",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Landing-page micro-interaction: lift by 1px on hover. */
  lift?: boolean;
  className?: string;
}

/** Class names for anything that should look like a button (incl. links). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  lift = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-bold whitespace-nowrap no-underline transition-[filter,background-color,border-color,color,transform] duration-150 ease-out disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    lift && "duration-200 hover:-translate-y-px hover:brightness-105",
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {}

export function Button({
  variant,
  size,
  lift,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, lift, className })} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  "aria-label": string;
  variant?: "bordered" | "outline" | "ghost";
  size?: "sm" | "md";
}

const ICON_VARIANTS = {
  bordered: "border border-line bg-surface-raised text-ink hover:bg-surface",
  outline: "border-[1.5px] border-line-strong bg-surface-raised text-ink hover:bg-surface",
  ghost: "bg-transparent text-ink-muted hover:bg-gold-soft hover:text-ink",
} as const;

export function IconButton({
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "size-11" : "size-9",
        ICON_VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
