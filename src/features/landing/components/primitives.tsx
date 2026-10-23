import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Horizontal padding shared by every landing section. */
export const gutter = "px-[clamp(16px,4vw,48px)]";

/** Vertical rhythm of full-width sections. */
export const sectionSpacing = "py-[clamp(72px,9vw,128px)]";

/** Text links: no underline at rest, gold underline on hover (design `.gd-link`). */
export const textLink =
  "no-underline decoration-gold decoration-1 underline-offset-[5px] hover:underline";

/** Short gold rule + overline label above section titles. */
export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className={cn(
        "m-0 flex items-center gap-3 text-overline uppercase",
        onDark ? "text-banner-ink" : "text-ink-muted",
      )}
    >
      <span aria-hidden="true" className="h-px w-8 bg-gold" />
      <span>{children}</span>
    </p>
  );
}

interface SectionTitleProps {
  id: string;
  children: ReactNode;
  className?: string;
}

/** Serif section heading; size and colour can be overridden per section. */
export function SectionTitle({ id, children, className }: SectionTitleProps) {
  return (
    <h2
      id={id}
      className={cn(
        "m-0 font-serif text-[clamp(38px,4.4vw,60px)] leading-[1.04] font-semibold tracking-[-0.015em] text-balance text-ink",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Icon in a soft gold circle (feature cards). */
export function IconBadge({ children, size = 52 }: { children: ReactNode; size?: 48 | 52 }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink",
        size === 52 ? "size-[52px]" : "size-12",
      )}
    >
      {children}
    </span>
  );
}
