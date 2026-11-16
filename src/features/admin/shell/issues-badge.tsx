"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { CountPill } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

import { attach, getServerSnapshot, getSnapshot, offerServerCount, subscribe } from "./issue-watch";

/** The live count: the poll's once it answered, else the server's render. */
function useIssueCount(initial: number | null) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => offerServerCount(initial), [initial]);
  return { open: snapshot.open ?? initial ?? 0, urgent: snapshot.urgent };
}

/**
 * The header's alert button (next to the bell): open delivery issues with a
 * live count (red while an urgent one is open), linking to «Muammolar». It
 * owns the 30 s poll and toasts each new urgent issue once.
 */
export function IssuesAlertButton({ initial }: { initial: number | null }) {
  const toast = useToast();
  useEffect(() => attach((item) => toast({ tone: "info", ...item })), [toast]);
  const { open, urgent } = useIssueCount(initial);
  const label =
    open === 0
      ? "Yetkazish muammolari: ochiq muammo yo‘q"
      : `Yetkazish muammolari: ${open} ta ochiq${urgent > 0 ? `, ${urgent} tasi shoshilinch` : ""}`;
  return (
    <Link
      href="/admin/delivery-issues"
      aria-label={label}
      title={label}
      className="relative flex size-11 items-center justify-center rounded-md border border-line bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface"
    >
      <Icon name="alert-triangle" size={20} className={cn(urgent > 0 && "text-danger")} />
      {open > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold tabular-nums",
            urgent > 0 ? "bg-danger-strong text-white" : "bg-gold text-on-gold",
          )}
        >
          {open > 99 ? "99+" : open}
        </span>
      )}
    </Link>
  );
}

/** The sidebar pill of «Muammolar», following the same poll. */
export function IssuesNavPill({ initial }: { initial: number | null }) {
  const { open, urgent } = useIssueCount(initial);
  if (open === 0) return null;
  return (
    <>
      <CountPill className={cn(urgent > 0 && "bg-danger-strong text-white")}>{open}</CountPill>
      <span className="sr-only">
        {` — ${open} ta ochiq${urgent > 0 ? `, ${urgent} tasi shoshilinch` : ""}`}
      </span>
    </>
  );
}
