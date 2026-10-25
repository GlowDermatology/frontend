import type { Page } from "../../types";

/** Django's paginated list envelope (contract §1.5). */
export interface PageEnvelope<T> {
  count: number;
  page: number;
  page_size: number;
  page_count: number;
  results: T[];
}

/** `{count, page, page_size, page_count, results}` → `Page<T>` with mapped items. */
export function mapPage<A, B>(
  envelope: PageEnvelope<A>,
  mapItem: (item: A, index: number) => B,
): Page<B> {
  return {
    items: envelope.results.map((item, index) => mapItem(item, index)),
    total: envelope.count,
    page: envelope.page,
    pageSize: envelope.page_size,
    pageCount: envelope.page_count,
  };
}
