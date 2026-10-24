import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

/** Page numbers with ellipses: 1 2 3 … 129, or 1 … 4 5 6 … 129. */
export function pageItems(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 2) [2, 3].forEach((p) => pages.add(p));
  if (page >= pageCount - 1) [pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && p - previous > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

export function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 / 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return `${formatNumber(from)}–${formatNumber(to)} / ${formatNumber(total)}`;
}

interface PaginationProps {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => Route;
}

const arrowClass = "flex size-9 items-center justify-center rounded-md border";

export function Pagination({ page, pageCount, hrefFor }: PaginationProps) {
  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < pageCount ? hrefFor(page + 1) : null;
  return (
    <nav aria-label="Sahifalar" className="flex items-center gap-1">
      {prev ? (
        <Link
          href={prev}
          scroll={false}
          aria-label="Oldingi sahifa"
          className={cn(arrowClass, "border-line-strong text-ink hover:bg-gold-soft")}
        >
          <Icon name="chevron-left" size={18} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          aria-label="Oldingi sahifa"
          role="link"
          className={cn(arrowClass, "border-line text-ink-muted")}
        >
          <Icon name="chevron-left" size={18} />
        </span>
      )}
      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            scroll={false}
            aria-current={item === page ? "page" : undefined}
            aria-label={`${item}-sahifa`}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-[13px] leading-none no-underline",
              item === page
                ? "bg-gold font-bold text-on-gold"
                : "font-semibold text-ink hover:bg-gold-soft",
            )}
          >
            {item}
          </Link>
        ),
      )}
      {next ? (
        <Link
          href={next}
          scroll={false}
          aria-label="Keyingi sahifa"
          className={cn(arrowClass, "border-line-strong text-ink hover:bg-gold-soft")}
        >
          <Icon name="chevron-right" size={18} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          aria-label="Keyingi sahifa"
          role="link"
          className={cn(arrowClass, "border-line text-ink-muted")}
        >
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </nav>
  );
}
