import { formatDayMonthShort, formatMillions, tashkentParts } from "@/lib/format";

/**
 * Cashback rules from the "Cashback va QR qoidalari" backend board and the
 * admin cashback settings screen.
 *
 * - The rate comes from a tier table keyed by the customer's lifetime
 *   purchases (store + online).
 * - Promotional products earn nothing.
 * - Credit = `(eligible × basis points) // 10 000`, integer math only, exactly
 *   like the backend engine (`loyalty/engine.py`, contract §2.7), so the
 *   editor's preview and the ledger agree to the so‘m. Balances are the sum
 *   of immutable ledger entries and never expire.
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

/**
 * The version the policy editor starts from and "O‘zgarishlarni bekor
 * qilish" restores: the latest saved one, i.e. the scheduled version when
 * there is one (the version a new save supersedes), else the one in force.
 * The same rule holds after a save (the new version is the scheduled one)
 * and after a reload, so Reset always does the same thing.
 */
export function editorBaseline<P extends CashbackPolicy>(active: P, scheduled: P | null): P {
  return scheduled ?? active;
}

export type PolicyVersionState = "active" | "scheduled" | "expired" | "superseded";

export interface PolicyVersion {
  version: number;
  summary: string;
  author: string;
  period: string;
  active: boolean;
  /** Saved but not yet in effect. */
  scheduled?: boolean;
  /** Contract §2.7 `state`; absent in the older demo rows (derived from the flags). */
  state?: PolicyVersionState;
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
  /**
   * Balance right after this entry (contract §2.6 `balance_after`, the
   * server's own running total). Mock rows get it from `withBalanceAfter`.
   */
  balanceAfter?: number;
  /** Order number for order entries (links to the order). */
  orderId?: number;
  /** Policy version a credit was computed with. */
  policyVersion?: number;
  /** A credit whose base excluded promotional items. */
  promoExcluded?: boolean;
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

export function sortTiers<T extends Pick<CashbackTier, "from">>(tiers: ReadonlyArray<T>): T[] {
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
  const bp = percent === null ? null : basisPoints(percent);
  return { eligible, percent, amount: bp === null ? 0 : applyBasisPoints(eligible, bp) };
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

/**
 * Balance after each entry, newest first (the ledger order), for rows that do
 * not carry the server's `balance_after` (the demo fixtures): the newest
 * entry's balance is the sum of all entries.
 */
export function withBalanceAfter<T extends Pick<LedgerEntry, "amount">>(
  entries: ReadonlyArray<T>,
): Array<T & { balanceAfter: number }> {
  let balance = ledgerBalance(entries);
  return entries.map((entry) => {
    const row = { ...entry, balanceAfter: balance };
    balance -= entry.amount;
    return row;
  });
}

/* -------------------------------------------------------------------------- */
/* Percent ⇄ basis points (contract §1.4 "Percent", §2.7 "integer math only") */
/* -------------------------------------------------------------------------- */

const PERCENT_TEXT = /^(\d{1,3})(?:[.,](\d{1,2}))?$/;

/**
 * Integer basis points of a percent with at most two decimals: `"0.57"` → 57,
 * `"2,3"` → 230, `1.5` → 150, `"1.00"` → 100. Strings are read digit by digit
 * (no float rounding); numbers are accepted when they are within 1e-9 of a
 * two-decimal value (`0.57` is `0.5699999…` in binary). Anything else —
 * more decimals, out of (0, 100], not a number — is `null`.
 */
export function basisPoints(percent: number | string): number | null {
  let bp: number;
  if (typeof percent === "string") {
    const match = PERCENT_TEXT.exec(percent.trim());
    if (!match) return null;
    bp = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  } else {
    if (!Number.isFinite(percent)) return null;
    bp = Math.round(percent * 100);
    if (Math.abs(percent * 100 - bp) > 1e-9) return null;
  }
  return bp > 0 && bp <= 10_000 ? bp : null;
}

/** `(amount × bp) // 10 000` with integer arithmetic (the backend's `apply_bp`). */
export function applyBasisPoints(amount: number, bp: number): number {
  const product = amount * bp;
  return (product - (product % 10_000)) / 10_000;
}

/** Request form of a percent (contract §1.4): a decimal string with two places, 150 → `"1.50"`. */
export function percentString(bp: number): string {
  return `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, "0")}`;
}

/**
 * `PCT(p)` of contract §5: trailing zeros and the dot dropped, `.` → `,`:
 * `"1.00"` → `1`, `"1.50"` → `1,5`, `0.57` → `0,57`. A value that is not a
 * two-decimal percent is printed as given.
 */
export function formatPercent(percent: number | string): string {
  const bp = basisPoints(percent);
  if (bp === null) return String(percent).replace(".", ",");
  const whole = Math.floor(bp / 100);
  const fraction = String(bp % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole},${fraction}` : String(whole);
}

/* -------------------------------------------------------------------------- */
/* Version history strings (contract §5.4)                                     */
/* -------------------------------------------------------------------------- */

type TierBand = Pick<CashbackTier, "from" | "to" | "percent">;

const NBSP = "\u00a0";

/** `MLN0(x)`: `formatMillions` without its NBSP `" mln"` suffix ("20"). */
function millionsBare(value: number): string {
  return formatMillions(value).replace(`${NBSP}mln`, "");
}

/** `RANGE(t)`: "30–50 mln", or "50 mln dan" for an open top. */
export function tierRange(tier: Pick<CashbackTier, "from" | "to">): string {
  return tier.to === null
    ? `${formatMillions(tier.from)} dan`
    : `${millionsBare(tier.from)}–${formatMillions(tier.to)}`;
}

const bandKey = (tier: TierBand) =>
  `${tier.from}:${tier.to ?? "∞"}:${basisPoints(tier.percent) ?? tier.percent}`;

/**
 * `PolicyVersion.summary`: the version's tiers against the previous
 * non-superseded version's, keyed by `(from, to, percent)` — never by tier id,
 * since every version stores its own tier rows. `previous` is `null` for the
 * first version.
 */
export function policySummary(
  tiers: ReadonlyArray<TierBand>,
  previous: ReadonlyArray<TierBand> | null,
): string {
  if (previous === null) {
    const parts = sortTiers(tiers).map((t) =>
      t.from === 0 && t.to !== null
        ? `${formatMillions(t.to)} gacha ${formatPercent(t.percent)}%`
        : `${tierRange(t)}: ${formatPercent(t.percent)}%`,
    );
    return `Boshlang‘ich: ${parts.join("; ")}`;
  }
  const before = new Set(previous.map(bandKey));
  const after = new Set(tiers.map(bandKey));
  const added = tiers.filter((t) => !before.has(bandKey(t)));
  const removed = previous.filter((t) => !after.has(bandKey(t)));
  if (added.length > 0 && removed.length === 0) {
    return sortTiers(added)
      .map((t) => `${tierRange(t)}: ${formatPercent(t.percent)}% qo‘shildi`)
      .join("; ");
  }
  if (removed.length > 0 && added.length === 0) return "Daraja olib tashlandi";
  if (added.length > 0) return "Darajalar yangilandi";
  return "Hisoblash qoidalari yangilandi";
}

const DAY_MS = 86_400_000;

/** "1-okt 2026" */
function dayMonthYear(iso: string): string {
  return `${formatDayMonthShort(iso)} ${tashkentParts(iso).year}`;
}

/**
 * `PolicyVersion.period`: "1-okt 2026 dan", "15-avg – 30-sen 2026",
 * "1-dek 2025 – 31-yan 2026", or "1-noy 2026 dan · almashtirildi" for a
 * superseded version. `effectiveTo` is exclusive, so the last day is the one
 * before it.
 */
export function policyPeriod(version: {
  effectiveFrom: string;
  effectiveTo: string | null;
  state: PolicyVersionState;
}): string {
  const from = version.effectiveFrom;
  if (version.state === "superseded") return `${dayMonthYear(from)} dan · almashtirildi`;
  if (version.effectiveTo === null) return `${dayMonthYear(from)} dan`;
  const last = new Date(Date.parse(version.effectiveTo) - DAY_MS).toISOString();
  return tashkentParts(from).year === tashkentParts(last).year
    ? `${formatDayMonthShort(from)} – ${dayMonthYear(last)}`
    : `${dayMonthYear(from)} – ${dayMonthYear(last)}`;
}

/** Non-blocking notes of a saved version (contract §2.7 `warnings`). */
export interface TierWarning {
  code: "gap" | "uncovered_above";
  from: number;
  to: number | null;
}

/** The toast text of the save warnings ("" when there are none). */
export function tierWarningsText(warnings: ReadonlyArray<TierWarning>): string {
  return warnings
    .map((w) =>
      w.code === "gap" && w.to !== null
        ? `${formatMillions(w.from)} – ${formatMillions(w.to)} so‘m oralig‘i uchun foiz yo‘q.`
        : `${formatMillions(w.from)} so‘mdan yuqori xaridlar uchun foiz belgilanmagan.`,
    )
    .join(" ");
}
