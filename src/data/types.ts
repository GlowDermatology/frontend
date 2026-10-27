/** A page of results, mirroring DRF's paginated list responses. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Machine-readable reason of a failed mutation, next to the human message.
 * The client plumbing branches on a few of them (`session_expired` →
 * refresh and retry once, `csrf` → reload, `idempotency_key_reused` → renew
 * the key); any other API error code may appear as well.
 */
export type ActionErrorCode =
  "session_expired" | "csrf" | "idempotency_key_reused" | "not_found" | (string & {});

/** The failure half of `ActionResult`. */
export interface ActionFailure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  code?: ActionErrorCode;
  /** The customer API's code-specific `details` object (customer contract §1.6), when it sent one. */
  details?: unknown;
  /** Seconds from `Retry-After` (OTP resend windows, throttles), when the API sent it. */
  retryAfter?: number;
}

/**
 * Outcome of a mutation. Expected failures (validation, conflicts) are values,
 * not exceptions, so forms can show them next to the right field.
 */
export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

/** The page an empty list produces: no items, `page` 1 of 1 (contract §1.5). */
export function emptyPage<T>(pageSize: number): Page<T> {
  return { items: [], total: 0, page: 1, pageSize, pageCount: 1 };
}

export function paginate<T>(items: ReadonlyArray<T>, page: number, pageSize: number): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    total,
    page: current,
    pageSize,
    pageCount,
  };
}
