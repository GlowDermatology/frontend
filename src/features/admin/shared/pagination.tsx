import type { Route } from "next";

import { formatNumber } from "@/lib/format";

import { PaginationLinks } from "./pagination-links";

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

/** "1–20 / 1 284"; pass the admin formatter (`useFormat()` / `getFormat()`) for its digit grouping. */
export function rangeLabel(
  page: number,
  pageSize: number,
  total: number,
  fmt: { number: (value: number) => string } = { number: formatNumber },
): string {
  if (total === 0) return "0 / 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return `${fmt.number(from)}–${fmt.number(to)} / ${fmt.number(total)}`;
}

interface PaginationProps {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => Route;
}

/**
 * Page links of a list. Usable from server and client components alike: the hrefs are worked
 * out here and handed to `PaginationLinks` (a client component, so its labels follow the admin
 * language through `useCopy`).
 */
export function Pagination({ page, pageCount, hrefFor }: PaginationProps) {
  return (
    <PaginationLinks
      page={page}
      previous={page > 1 ? hrefFor(page - 1) : null}
      next={page < pageCount ? hrefFor(page + 1) : null}
      items={pageItems(page, pageCount).map((item) =>
        item === "gap" ? item : { page: item, href: hrefFor(item) },
      )}
    />
  );
}
