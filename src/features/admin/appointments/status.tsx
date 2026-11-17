"use client";

import type { Tone } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { appointmentsCopy } from "./copy";
import { STATUS_ORDER } from "./layout";

/**
 * Status colours shared by the day, week and month boards: the visit box, its dot, the month
 * pill and the badge tone. A request is dashed (it still needs an answer); closed visits
 * (cancelled) are muted.
 */
export const STATUS_LOOK: Readonly<
  Record<AppointmentStatus, { tone: Tone; box: string; dot: string; pill: string }>
> = {
  requested: {
    tone: "warning",
    box: "border-[1.5px] border-dashed border-warning bg-warning-soft",
    dot: "bg-warning",
    pill: "bg-warning-soft text-ink ring-1 ring-warning/40 ring-inset",
  },
  confirmed: {
    tone: "success",
    box: "border border-transparent bg-success-soft",
    dot: "bg-success",
    pill: "bg-success-soft text-ink",
  },
  attended: {
    tone: "gold",
    box: "border border-transparent bg-gold-soft",
    dot: "bg-gold",
    pill: "bg-gold-soft text-ink",
  },
  rejected: {
    tone: "danger",
    box: "border border-transparent bg-danger-soft",
    dot: "bg-danger",
    pill: "bg-danger-soft text-ink",
  },
  cancelled: {
    tone: "muted",
    box: "border border-dashed border-line-strong bg-surface opacity-75",
    dot: "bg-ink-muted",
    pill: "bg-surface text-ink-muted ring-1 ring-line ring-inset",
  },
};

/** The legend above a grid: one dot per status, plus the hatch of unavailable time. */
export function StatusLegend({
  statuses = STATUS_ORDER,
  hatch = true,
  className,
}: {
  statuses?: ReadonlyArray<AppointmentStatus>;
  hatch?: boolean;
  className?: string;
}) {
  const t = useCopy(appointmentsCopy).legend;
  return (
    <ul
      aria-label={t.label}
      className={cn(
        "m-0 flex list-none flex-wrap gap-x-4 gap-y-2 text-caption font-semibold text-ink",
        className,
      )}
    >
      {statuses.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", STATUS_LOOK[status].dot)}
          />
          {t[status]}
        </li>
      ))}
      {hatch && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-3.5 rounded-[3px] border border-line hatch" />
          {t.unavailable}
        </li>
      )}
    </ul>
  );
}
