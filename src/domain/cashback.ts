/**
 * Cashback rules from the "Cashback va QR qoidalari" backend board and the
 * admin cashback settings screen.
 *
 * - The rate comes from a tier table keyed by the customer's lifetime
 *   purchases (store + online).
 * - Promotional products earn nothing.
 * - Credit = floor(eligible × rate). Balances are the sum of immutable ledger
 *   entries and never expire.
 */

export interface CashbackTier {
  id: string;
  /** Inclusive lower bound, so‘m. */
  from: number;
  /** Exclusive upper bound, so‘m; `null` means unbounded. */
  to: number | null;
  percent: number;
}

/** Which lifetime total picks the rate for the purchase that crosses a threshold. */
export type RateBasis = "before_purchase" | "with_purchase";

export interface CashbackRules {
  tiers: CashbackTier[];
  basis: RateBasis;
  /** Whether the part paid with cashback balance earns cashback too. */
  earnOnCashbackPaid: boolean;
}

export interface CashbackPolicy extends CashbackRules {
  version: number;
  effectiveFrom: string;
}

export interface PolicyVersion {
  version: number;
  summary: string;
  author: string;
  period: string;
  active: boolean;
  /** Saved but not yet in effect. */
  scheduled?: boolean;
}

export type LedgerEntryKind = "credit" | "debit" | "adjustment" | "reversal";

export interface LedgerEntry {
  id: string;
  at: string;
  kind: LedgerEntryKind;
  /** Where the entry came from, e.g. "Buyurtma №10231" or "Billz savdo S-88213". */
  source: string;
  note: string;
  /** Signed amount, so‘m. */
  amount: number;
}

export interface TierAnalysis {
  /** Tiers whose bounds are invalid or that overlap a neighbour. */
  invalid: Set<string>;
  overlaps: Array<
    | { kind: "empty-range"; tier: CashbackTier }
    | { kind: "overlap"; previous: CashbackTier; next: CashbackTier }
  >;
  /** Uncovered ranges between tiers, `[from, to)`. */
  gaps: Array<{ from: number; to: number }>;
  /** Upper bound of the last tier when it is not open-ended. */
  uncoveredAbove: number | null;
}

const upper = (tier: CashbackTier) => tier.to ?? Number.POSITIVE_INFINITY;

export function sortTiers(tiers: ReadonlyArray<CashbackTier>): CashbackTier[] {
  return [...tiers].sort((a, b) => a.from - b.from);
}

/** Overlaps block saving; gaps and a bounded last tier are warnings. */
export function analyzeTiers(tiers: ReadonlyArray<CashbackTier>): TierAnalysis {
  const sorted = sortTiers(tiers);
  const result: TierAnalysis = { invalid: new Set(), overlaps: [], gaps: [], uncoveredAbove: null };
  const first = sorted[0];
  if (first && first.from > 0) result.gaps.push({ from: 0, to: first.from });

  sorted.forEach((tier, index) => {
    if (upper(tier) <= tier.from) {
      result.invalid.add(tier.id);
      result.overlaps.push({ kind: "empty-range", tier });
    }
    const previous = sorted[index - 1];
    if (!previous) return;
    if (tier.from < upper(previous)) {
      result.invalid.add(tier.id);
      result.invalid.add(previous.id);
      result.overlaps.push({ kind: "overlap", previous, next: tier });
    }
    if (previous.to !== null && tier.from > previous.to) {
      result.gaps.push({ from: previous.to, to: tier.from });
    }
  });

  const last = sorted[sorted.length - 1];
  if (last && last.to !== null) result.uncoveredAbove = last.to;
  return result;
}

/** Percent for a lifetime total, or `null` when no tier covers it. */
export function rateFor(tiers: ReadonlyArray<CashbackTier>, lifetimeTotal: number): number | null {
  for (const tier of sortTiers(tiers)) {
    if (lifetimeTotal >= tier.from && lifetimeTotal < upper(tier)) return tier.percent;
  }
  return null;
}

export interface PurchaseInput {
  /** Purchase total before cashback redemption, so‘m. */
  amount: number;
  /** Part of the amount that is promotional. */
  promoAmount: number;
  /** Part paid from the cashback balance. */
  paidWithCashback: number;
  /** Customer's lifetime purchases before this one. */
  lifetimeBefore: number;
}

export interface CashbackResult {
  eligible: number;
  percent: number | null;
  amount: number;
}

export function calculateCashback(purchase: PurchaseInput, rules: CashbackRules): CashbackResult {
  const eligible = Math.max(
    0,
    purchase.amount -
      purchase.promoAmount -
      (rules.earnOnCashbackPaid ? 0 : purchase.paidWithCashback),
  );
  const lifetime =
    rules.basis === "before_purchase"
      ? purchase.lifetimeBefore
      : purchase.lifetimeBefore + purchase.amount;
  const percent = rateFor(rules.tiers, lifetime);
  const amount = percent === null ? 0 : Math.floor((eligible * percent) / 100);
  return { eligible, percent, amount };
}

/** Next tier above a lifetime total, with the amount still missing to reach it. */
export function nextTier(
  tiers: ReadonlyArray<CashbackTier>,
  lifetimeTotal: number,
): { tier: CashbackTier; remaining: number; progress: number } | null {
  const sorted = sortTiers(tiers);
  const index = sorted.findIndex((t) => lifetimeTotal >= t.from && lifetimeTotal < upper(t));
  const current = sorted[index];
  const next = sorted[index + 1];
  if (!current || !next) return null;
  const span = next.from - current.from;
  return {
    tier: next,
    remaining: next.from - lifetimeTotal,
    progress: span > 0 ? (lifetimeTotal - current.from) / span : 1,
  };
}

export function ledgerBalance(entries: ReadonlyArray<Pick<LedgerEntry, "amount">>): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}
