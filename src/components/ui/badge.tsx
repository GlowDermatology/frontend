import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type Tone = "success" | "warning" | "danger" | "gold" | "neutral" | "muted";

const SURFACES: Record<Tone, string> = {
  success: "bg-success-soft",
  warning: "bg-warning-soft",
  danger: "bg-danger-soft",
  gold: "bg-gold-soft",
  neutral: "bg-line",
  muted: "bg-surface",
};

const DOTS: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  gold: "bg-gold",
  neutral: "bg-ink-muted",
  muted: "bg-ink-muted",
};

export function dotClass(tone: Tone): string {
  return DOTS[tone];
}

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  /** Status badges carry a coloured dot; plain tags do not. */
  dot?: boolean;
  className?: string;
}

/**
 * Uppercase status chip. Colour is never the only signal: the text carries
 * the meaning and the dot/ground only reinforce it (design-system rule).
 */
export function Badge({ tone, children, dot = true, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-[11px] leading-[14px] font-bold tracking-[0.06em] whitespace-nowrap text-ink uppercase",
        SURFACES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-[7px] shrink-0 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

/** Small round count used in navigation and tabs. */
export function CountPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 min-w-[22px] rounded-full bg-gold px-1.5 text-center text-[11px] leading-5 font-extrabold text-on-gold tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
