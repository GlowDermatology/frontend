import type { ReactNode, Ref } from "react";

import { cn } from "@/lib/cn";

interface ScrollRegionProps {
  /** Accessible name, e.g. the table's title. */
  label: string;
  children: ReactNode;
  className?: string;
  /** The focusable region, e.g. to return focus to it after a dialog. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Horizontal scroller for wide tables on narrow screens. It is focusable so
 * keyboard users can scroll it (WCAG 2.1.1), and positioned so visually hidden
 * text inside cells cannot widen the page.
 */
export function ScrollRegion({ label, children, className, ref }: ScrollRegionProps) {
  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "relative overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
