import { formatMillions, formatNumber } from "@/lib/format";

/**
 * Customer groups (segments, contract §2.8). Membership = active customer ∧
 * (every set rule matches ∨ manual member); with no rule set the group is
 * manual only. `size` counts members with a push-enabled device (one push
 * per customer), so it is what a campaign to the group reaches.
 */

export interface SegmentRules {
  /** Paid, non-reversed online orders, at least; `null` = rule off. */
  minOnlineOrders: number | null;
  /** Lifetime purchases (store + online), so‘m, at least; `null` = rule off. */
  minLifetimeAmount: number | null;
}

export interface Segment {
  id: string;
  name: string;
  rules: SegmentRules;
  manualMemberCount: number;
  memberCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
}

/** A member row (contract §2.6 `CustomerListItem`). */
export interface SegmentMember {
  id: string;
  name: string;
  phone: string;
  status: "active" | "deleted";
  registeredAt: string;
  lifetimeTotal: number;
  /** Active-policy rate for the lifetime total ("1,5"); `null` until the loyalty slice. */
  percent: string | null;
  balance: number;
  onlineOrdersCount: number;
}

export const SEGMENT_NAME_MIN = 2;
export const SEGMENT_NAME_MAX = 60;
export const SEGMENT_MEMBERS_MAX = 500;

/** "Kamida 3 ta onlayn buyurtma va jami xaridlar 10 mln so‘mdan"; no rule → manual only. */
export function segmentRulesSummary(rules: SegmentRules): string {
  const parts: string[] = [];
  if (rules.minOnlineOrders !== null) {
    parts.push(`kamida ${formatNumber(rules.minOnlineOrders)} ta onlayn buyurtma`);
  }
  if (rules.minLifetimeAmount !== null) {
    parts.push(`jami xaridlar ${formatAmount(rules.minLifetimeAmount)} so‘mdan`);
  }
  if (parts.length === 0) return "Faqat qo‘lda qo‘shilgan mijozlar";
  const text = parts.join(" va ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** 10 000 000 → "10 mln"; amounts under a million stay plain ("500 000"). */
function formatAmount(value: number): string {
  return value >= 1_000_000 ? formatMillions(value) : formatNumber(value);
}

/** A customer id or E.164 phone to add, with the input row (0-based) that named it first. */
export interface MemberRef {
  value: string;
  row: number;
}

/** One entry of the "customer ids or phones" input, read by `parseMemberEntry`. */
export type MemberEntry =
  | { kind: "empty" }
  | { kind: "id"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "incomplete" }
  | { kind: "invalid" };

/**
 * One customer id or phone as the admin typed it. Spaces, parentheses and
 * dashes inside the entry are dropped, then:
 *
 * - `+998` / `998` + 9 digits, or exactly 9 digits (the national number the
 *   app shows, "90 123 45 67"), is a phone, normalised to E.164
 *   (`+998901234567`);
 * - 1–7 digits typed without inner spaces is a customer id;
 * - digits with inner spaces that do not make a whole phone are
 *   `incomplete` ("Telefonni to‘liq kiriting");
 * - anything else is `invalid`.
 */
export function parseMemberEntry(raw: string): MemberEntry {
  const entry = raw.trim();
  if (!entry) return { kind: "empty" };
  const compact = entry.replace(/[\s()-]/g, "");
  if (/^\+?998\d{9}$/.test(compact))
    return { kind: "phone", value: `+${compact.replace(/^\+/, "")}` };
  if (/^\d{9}$/.test(compact)) return { kind: "phone", value: `+998${compact}` };
  if (/^\d{1,7}$/.test(entry)) return { kind: "id", value: String(Number(entry)) };
  if (/^\+?[\d\s()-]+$/.test(entry) && /\s/.test(entry)) return { kind: "incomplete" };
  return { kind: "invalid" };
}

/**
 * Splits pasted text into entries on commas, semicolons and new lines only —
 * never on spaces, because the app writes phones with spaces
 * ("90 123 45 67") and splitting those would turn one phone into four ids.
 */
export function splitMemberList(input: string): string[] {
  return input
    .split(/[,;\n\r]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The admin's "customer ids or phones" list (`splitMemberList` +
 * `parseMemberEntry`): ids and E.164 phones de-duplicated, the entries that
 * are not a whole phone in `incomplete`, the rest in `invalid`.
 */
export function parseMemberList(input: string): {
  ids: string[];
  phones: string[];
  invalid: string[];
  incomplete: string[];
} {
  const ids = new Set<string>();
  const phones = new Set<string>();
  const invalid: string[] = [];
  const incomplete: string[] = [];
  for (const entry of splitMemberList(input)) {
    const parsed = parseMemberEntry(entry);
    if (parsed.kind === "id") ids.add(parsed.value);
    else if (parsed.kind === "phone") phones.add(parsed.value);
    else if (parsed.kind === "incomplete") incomplete.push(entry);
    else if (parsed.kind === "invalid") invalid.push(entry);
  }
  return { ids: [...ids], phones: [...phones], invalid, incomplete };
}
