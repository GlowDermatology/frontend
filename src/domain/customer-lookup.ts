import { nationalDigits } from "@/lib/phone";

/**
 * Customer lookup for pickers (DESIGN §C): `GET /admin/customers/lookup?q=&segment=` answers
 * with at most `CUSTOMER_LOOKUP_LIMIT` customers matching a name or a phone. Pure helpers shared
 * by the route handler and the add-members dialog.
 */

export const CUSTOMER_LOOKUP_LIMIT = 8;
/** Shortest name part the backend is asked about. */
export const LOOKUP_MIN_NAME = 2;
/** Fewest phone digits the backend matches (contract §2.6 `search`). */
export const LOOKUP_MIN_DIGITS = 3;
/** Longest search text accepted (a whole name or a pasted phone). */
export const LOOKUP_MAX_LENGTH = 64;

export interface CustomerLookupItem {
  id: string;
  /** `""` for a deleted (anonymised) customer. */
  name: string;
  /** E.164, or `null` for an account without a phone yet. */
  phone: string | null;
  /** Verified e-mail address, or `null`. */
  email: string | null;
  status: "active" | "deleted";
  /** Already a member of the group named by `segment` (absent without one). */
  member?: boolean;
}

export interface CustomerLookupResult {
  /** The term that was searched (national digits for a phone), `""` when too short. */
  term: string;
  kind: LookupKind;
  items: CustomerLookupItem[];
}

export type LookupKind = "phone" | "name";

/** Text made of phone characters only (digits, `+`, spaces, dashes, dots, parentheses). */
export function looksLikePhone(raw: string): boolean {
  const value = raw.trim();
  return /\d/.test(value) && /^\+?[\d\s().-]+$/.test(value);
}

/**
 * What to send as `search`: a phone-like text becomes its national digits only ("+998 90 123"
 * → "90123", so the backend matches it inside `+99890123…`), a name is trimmed with inner
 * whitespace collapsed. `null` when it is too short to search (fewer than 3 digits / 2 letters)
 * or too long.
 */
export function lookupTerm(raw: string): { term: string; kind: LookupKind } | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value || value.length > LOOKUP_MAX_LENGTH) return null;
  if (looksLikePhone(value)) {
    const digits = nationalDigits(value);
    return digits.length >= LOOKUP_MIN_DIGITS ? { term: digits, kind: "phone" } : null;
  }
  return value.length >= LOOKUP_MIN_NAME ? { term: value, kind: "name" } : null;
}

/** A group (segment) id from the query, or `null` when it cannot be one. */
export function lookupSegmentId(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

/** Narrows an untrusted JSON row (the route's answer) to a lookup item, or `null`. */
export function readLookupItem(value: unknown): CustomerLookupItem | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const contact = (v: unknown) => (typeof v === "string" ? v : v === null ? null : undefined);
  const phone = contact(row.phone);
  const email = contact(row.email);
  if (phone === undefined || email === undefined) return null;
  if (row.status !== "active" && row.status !== "deleted") return null;
  return {
    id: row.id,
    name: row.name,
    phone,
    email,
    status: row.status,
    ...(typeof row.member === "boolean" && { member: row.member }),
  };
}
