import type { ReactNode } from "react";

import { Rings } from "@/components/brand/rings";

/** A calm, ringed empty state (no results, nothing published yet). */
export function EmptyState({
  title,
  body,
  action,
  headingLevel: Heading = "h2",
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-line bg-surface-raised px-6 py-16 text-center">
      <Rings
        viewBox={400}
        rings={[
          [60, 0.5],
          [100, 0.3],
          [140, 0.16],
        ]}
        className="absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2"
      />
      <Heading className="relative m-0 font-serif text-headline-sm font-semibold text-ink">
        {title}
      </Heading>
      {body ? (
        <p className="relative m-0 max-w-[440px] text-body text-pretty text-ink-muted">{body}</p>
      ) : null}
      {action ? <div className="relative pt-2">{action}</div> : null}
    </div>
  );
}
