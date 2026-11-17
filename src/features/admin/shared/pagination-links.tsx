"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId } from "react";

import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { sharedCopy } from "./copy";

interface PaginationLinksProps {
  page: number;
  previous: Route | null;
  next: Route | null;
  items: ReadonlyArray<{ page: number; href: Route } | "gap">;
}

const arrowClass = "flex size-9 items-center justify-center rounded-md border";

/** The links of `Pagination` (worked out by it), labelled in the admin language. */
export function PaginationLinks({ page, previous, next, items }: PaginationLinksProps) {
  const t = useCopy(sharedCopy).pagination;
  return (
    <nav aria-label={t.nav} className="flex items-center gap-1">
      <Arrow href={previous} label={t.previous} reason={t.firstPage} icon="chevron-left" />
      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={item.page}
            href={item.href}
            scroll={false}
            aria-current={item.page === page ? "page" : undefined}
            aria-label={t.page(item.page)}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-[13px] leading-none tabular-nums no-underline",
              item.page === page
                ? "bg-gold font-bold text-on-gold"
                : "font-semibold text-ink hover:bg-gold-soft",
            )}
          >
            {item.page}
          </Link>
        ),
      )}
      <Arrow href={next} label={t.next} reason={t.lastPage} icon="chevron-right" />
    </nav>
  );
}

function Arrow({
  href,
  label,
  reason,
  icon,
}: {
  href: Route | null;
  label: string;
  reason: string;
  icon: "chevron-left" | "chevron-right";
}) {
  const reasonId = useId();
  if (href) {
    return (
      <Link
        href={href}
        scroll={false}
        aria-label={label}
        className={cn(arrowClass, "border-line-strong text-ink hover:bg-gold-soft")}
      >
        <Icon name={icon} size={18} />
      </Link>
    );
  }
  // At the first / last page: a link without a target, focusable, that says why.
  return (
    <Tooltip content={reason}>
      <span
        aria-disabled="true"
        aria-label={label}
        aria-describedby={reasonId}
        role="link"
        tabIndex={0}
        className={cn(arrowClass, "cursor-not-allowed border-line text-ink-muted/70")}
      >
        <Icon name={icon} size={18} />
        <span id={reasonId} hidden>
          {reason}
        </span>
      </span>
    </Tooltip>
  );
}
