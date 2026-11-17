import type { ButtonHTMLAttributes, Ref } from "react";

import { cn } from "@/lib/cn";

import { DisabledReasonButton, type DisabledReason } from "./disabled-reason";

export type { DisabledReason };

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "destructive" | "dashed" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

/* Every look has a resting "unavailable" state for both a real `disabled`
   button and a disabled-reason one (`data-disabled`: it stays focusable, so
   the `:disabled` pseudo-class does not apply). Written out literally so
   Tailwind sees each class. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-on-gold hover:brightness-[1.04] disabled:bg-line disabled:text-ink-muted disabled:hover:brightness-100 data-disabled:bg-line data-disabled:text-ink-muted data-disabled:hover:brightness-100",
  secondary:
    "border-[1.5px] border-line-strong bg-surface-raised text-ink hover:bg-surface disabled:text-ink-muted disabled:hover:bg-surface-raised data-disabled:text-ink-muted data-disabled:hover:bg-surface-raised",
  outline:
    "border-[1.5px] border-line-strong bg-transparent text-ink hover:bg-surface-raised disabled:text-ink-muted disabled:hover:bg-transparent data-disabled:text-ink-muted data-disabled:hover:bg-transparent",
  ghost:
    "bg-transparent text-ink hover:bg-gold-soft disabled:text-ink-muted disabled:hover:bg-transparent data-disabled:text-ink-muted data-disabled:hover:bg-transparent",
  danger:
    "border-[1.5px] border-danger bg-transparent text-ink hover:bg-danger-soft disabled:opacity-60 disabled:hover:bg-transparent data-disabled:opacity-60 data-disabled:hover:bg-transparent",
  /* White on the design's danger red is 4.4:1, below AA for 15px text, so the
     fill uses a slightly deeper red (5.0:1). */
  destructive:
    "bg-danger-strong text-[15px] text-white hover:brightness-95 disabled:opacity-60 disabled:hover:brightness-100 data-disabled:opacity-60 data-disabled:hover:brightness-100",
  dashed:
    "border-[1.5px] border-dashed border-line-strong bg-transparent text-ink hover:bg-surface-raised disabled:text-ink-muted disabled:hover:bg-transparent data-disabled:text-ink-muted data-disabled:hover:bg-transparent",
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
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-bold whitespace-nowrap no-underline transition-[filter,background-color,border-color,color,transform] duration-150 ease-out disabled:cursor-not-allowed data-disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    lift &&
      "duration-200 hover:-translate-y-px hover:brightness-105 data-disabled:hover:translate-y-0",
    className,
  );
}

interface InertProps {
  /**
   * The control's own request is running: it stays focusable (`aria-busy`, `aria-disabled`) and
   * ignores activation, so a keyboard user keeps their place.
   */
  busy?: boolean;
  /**
   * Why the control cannot be used right now, phrased as "why + what to do", e.g. «Avval
   * mutaxassisni tanlang». A truthy reason renders the control `aria-disabled` but focusable,
   * swallows clicks, describes it to screen readers and shows the reason in a tooltip on hover,
   * focus and tap. Prefer it to `disabled`: a dead control with no explanation is a dead end.
   */
  disabledReason?: DisabledReason;
  /**
   * @deprecated Use `disabledReason` (say why) or `busy` (own request running). Still supported
   * while the call sites migrate: together with `aria-busy` it behaves as `busy`, otherwise it is
   * a real `disabled` attribute.
   */
  disabled?: boolean;
}

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled">;

/**
 * Shared by `Button` and `IconButton`. No hooks here, so both stay usable from Server
 * Components; only a disabled-reason control renders the client part (tooltip, tap handling).
 */
function renderButton(
  {
    busy: busyProp,
    disabledReason,
    disabled,
    type = "button",
    onClick,
    "aria-busy": ariaBusy,
    ...rest
  }: NativeButtonProps & InertProps & { ref?: Ref<HTMLButtonElement> },
  className: (busy: boolean) => string,
) {
  const legacyBusy = Boolean(disabled) && (ariaBusy === true || ariaBusy === "true");
  const busy = Boolean(busyProp) || legacyBusy;
  if (!busy && disabledReason) {
    return (
      <DisabledReasonButton
        {...rest}
        type={type}
        reason={disabledReason}
        className={className(false)}
      />
    );
  }
  if (busy) {
    return (
      <button
        {...rest}
        type="button"
        aria-busy
        aria-disabled
        data-busy=""
        className={className(true)}
        onClick={(event) => event.preventDefault()}
      />
    );
  }
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={ariaBusy}
      className={className(false)}
      onClick={onClick}
    />
  );
}

interface ButtonProps extends NativeButtonProps, ButtonStyleOptions, InertProps {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The design system's button. A button that cannot act stays focusable: `busy` while its own
 * request runs (a real `disabled` on the focused element drops focus to `<body>`, so a keyboard
 * user would lose their place on every save), `disabledReason` when the user must do something
 * first (the reason is announced and shown in a tooltip).
 */
export function Button({ variant, size, lift, className, ...rest }: ButtonProps) {
  return renderButton(rest, (busy) =>
    buttonStyles({
      variant,
      size,
      lift,
      className: cn(busy && "cursor-wait opacity-80", className),
    }),
  );
}

interface IconButtonProps extends NativeButtonProps, InertProps {
  /** Required: icon-only buttons need an accessible name. */
  "aria-label": string;
  variant?: "bordered" | "outline" | "ghost";
  size?: "sm" | "md";
  ref?: Ref<HTMLButtonElement>;
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
  ...rest
}: IconButtonProps) {
  return renderButton(rest, (busy) =>
    cn(
      "relative inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent",
      size === "md" ? "size-11" : "size-9",
      ICON_VARIANTS[variant],
      busy && "cursor-wait opacity-80",
      className,
    ),
  );
}
