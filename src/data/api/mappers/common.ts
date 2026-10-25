/**
 * Shared helpers of the API → domain mappers (contract §5, "generic mapping").
 */

/** `page_size` → `pageSize`; segments without underscores (incl. numbers) are unchanged. */
export function camelKey(key: string): string {
  return key.replace(/_+([a-zA-Z0-9])/g, (_, next: string) => next.toUpperCase());
}

/** Integer API ids become the string ids the FE domain types use. */
export function idString(id: number | string): string {
  return String(id);
}

/** API fields are always present with `null`; optional TS fields want `undefined`. */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/** An ISO 8601 string, or `undefined` for `null`/empty. */
export function isoOrUndefined(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}
