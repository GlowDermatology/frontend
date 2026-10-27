/**
 * Loads every page of a paginated list (contract §1.5) for the resources the
 * UI needs whole (categories, banners). The loop is bounded on purpose: it
 * stops on the server's `page_count`, on a short or empty page, and at a
 * hard cap, so a non-conforming or proxied answer (no `page_count`, `null`,
 * a value that keeps growing) can never turn into an unbounded request
 * storm against Django and the staff throttle.
 */

/** Pages beyond this are a bug or a non-conforming backend, never a real catalog. */
export const ALL_PAGES_LIMIT = 20;

export interface PageLike<T> {
  results: T[];
  page_count?: unknown;
  page_size?: unknown;
}

export class PageLimitExceededError extends Error {
  constructor(path: string, limit: number) {
    super(`${path}: more than ${limit} pages; refusing to load the whole list`);
    this.name = "PageLimitExceededError";
  }
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Calls `fetchPage(1)`, `fetchPage(2)`, … and concatenates `results`.
 * `pageSize` is the size requested; the server's own `page_size` (when it is
 * a positive integer) decides what counts as a short page. Throws
 * `PageLimitExceededError` instead of fetching page `limit + 1`.
 */
export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PageLike<T>>,
  options: { pageSize: number; limit?: number; path?: string },
): Promise<T[]> {
  const limit = options.limit ?? ALL_PAGES_LIMIT;
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const data = await fetchPage(page);
    const results = Array.isArray(data.results) ? data.results : [];
    rows.push(...results);
    const pageCount = positiveInt(data.page_count) ?? 1;
    const pageSize = positiveInt(data.page_size) ?? options.pageSize;
    if (page >= pageCount || results.length === 0 || results.length < pageSize) return rows;
    if (page >= limit) throw new PageLimitExceededError(options.path ?? "list", limit);
  }
}
