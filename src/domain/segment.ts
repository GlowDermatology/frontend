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

/**
 * The admin's "customer ids or phones" list (comma, space or newline
 * separated) split into ids and E.164 phones; anything else is reported.
 */
export function parseMemberList(input: string): {
  ids: string[];
  phones: string[];
  invalid: string[];
} {
  const ids = new Set<string>();
  const phones = new Set<string>();
  const invalid: string[] = [];
  for (const raw of input.split(/[\s,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    if (/^\d{1,9}$/.test(token)) ids.add(String(Number(token)));
    else if (/^\+?998\d{9}$/.test(token)) phones.add(`+${token.replace(/^\+/, "")}`);
    else invalid.push(token);
  }
  return { ids: [...ids], phones: [...phones], invalid };
}
