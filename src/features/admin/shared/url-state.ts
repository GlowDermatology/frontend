/**
 * Helpers for list pages whose filters live in the URL (shareable, survive
 * reloads, map 1:1 to DRF query parameters).
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function oneOf<T extends string>(
  value: string | undefined,
  allowed: ReadonlyArray<T>,
): T | undefined {
  return allowed.find((option) => option === value);
}

export function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Build a query string from defined, non-default values. */
export function toQueryString(
  values: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === false || value === "") continue;
    params.set(key, value === true ? "1" : String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The years a day filter may name. A date input reports `0002-10-20` while
 * the year is still being typed; such a value is never a filter.
 */
export const MIN_FILTER_YEAR = 2000;
export const MAX_FILTER_YEAR = 2099;

/**
 * A real calendar day as `YYYY-MM-DD` in 2000–2099, or `undefined`
 * (malformed or implausible values are dropped, never sent on).
 */
export function isoDateParam(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  if (year < MIN_FILTER_YEAR || year > MAX_FILTER_YEAR) return undefined;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value ? value : undefined;
}

/**
 * Free text from the URL as the API takes it: control characters (U+0000 is
 * a 400 `null_characters_not_allowed` in Django, which would fail the whole
 * board) are removed before trimming, and the result is cut to `max`
 * characters. Nothing left → `undefined` (no filter).
 */
export function parseSearchParam(value: string | undefined, max = 64): string | undefined {
  return (
    value
      ?.replace(/\p{Cc}/gu, "")
      .trim()
      .slice(0, max) || undefined
  );
}
