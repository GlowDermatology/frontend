import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: ReactNode;
  /** Small line above the title, e.g. "1 284 ta buyurtma". */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && <span className="text-body-sm text-ink-muted tabular-nums">{eyebrow}</span>}
        <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
