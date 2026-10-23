import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: IconName;
  label: string;
  value: ReactNode;
  note: ReactNode;
  /** The whole card becomes a link (e.g. to the sold-out products list). */
  href?: Route;
  alert?: boolean;
}

const cardClass =
  "flex flex-col gap-2 rounded-lg bg-surface-raised p-5 shadow-sm text-ink no-underline";

export function StatCard({ icon, label, value, note, href, alert }: StatCardProps) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-body-sm font-semibold text-ink-muted">
        <Icon name={icon} size={18} className={alert ? "text-danger" : "text-gold-ink"} />
        {label}
      </span>
      <span className="text-[28px] leading-[34px] font-extrabold tracking-[-0.01em] text-ink tabular-nums">
        {value}
      </span>
      <span className="text-caption text-ink-muted">{note}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cn(cardClass, "transition-shadow duration-150 hover:shadow-lg")}>
      {body}
    </Link>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}
