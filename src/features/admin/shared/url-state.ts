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

/** A real calendar day as `YYYY-MM-DD`, or `undefined` (malformed values are dropped, never sent on). */
export function isoDateParam(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value ? value : undefined;
}
