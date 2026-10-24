import { describe, expect, it } from "vitest";

import {
  analyzeTiers,
  calculateCashback,
  ledgerBalance,
  nextTier,
  rateFor,
  type CashbackRules,
  type CashbackTier,
} from "./cashback";

const tiers: CashbackTier[] = [
  { id: "t1", from: 0, to: 20_000_000, percent: 1 },
  { id: "t2", from: 20_000_000, to: 30_000_000, percent: 2 },
  { id: "t3", from: 30_000_000, to: 50_000_000, percent: 3 },
];

const rules: CashbackRules = { tiers, basis: "before_purchase", earnOnCashbackPaid: false };

/** The worked example on the admin cashback screen. */
const sample = {
  amount: 1_000_000,
  promoAmount: 200_000,
  paidWithCashback: 100_000,
  lifetimeBefore: 19_500_000,
};

describe("rateFor", () => {
  it("uses inclusive lower and exclusive upper bounds", () => {
    expect(rateFor(tiers, 0)).toBe(1);
    expect(rateFor(tiers, 19_999_999)).toBe(1);
    expect(rateFor(tiers, 20_000_000)).toBe(2);
    expect(rateFor(tiers, 49_999_999)).toBe(3);
  });

  it("returns null above a bounded last tier", () => {
    expect(rateFor(tiers, 50_000_000)).toBeNull();
  });
});

describe("calculateCashback", () => {
  it("excludes promo and cashback-paid parts and floors the result", () => {
    expect(calculateCashback(sample, rules)).toEqual({
      eligible: 700_000,
      percent: 1,
      amount: 7_000,
    });
  });

  it("applies the new tier when the rate is based on the total with this purchase", () => {
    const result = calculateCashback(sample, { ...rules, basis: "with_purchase" });
    expect(result).toEqual({ eligible: 700_000, percent: 2, amount: 14_000 });
  });

  it("counts the cashback-paid part when enabled", () => {
    expect(calculateCashback(sample, { ...rules, earnOnCashbackPaid: true }).eligible).toBe(
      800_000,
    );
  });

  it("rounds down fractional credits", () => {
    const result = calculateCashback(
      { amount: 999, promoAmount: 0, paidWithCashback: 0, lifetimeBefore: 0 },
      rules,
    );
    expect(result.amount).toBe(9);
  });
});

describe("analyzeTiers", () => {
  it("accepts contiguous tiers and reports the bounded top", () => {
    const analysis = analyzeTiers(tiers);
    expect(analysis.overlaps).toHaveLength(0);
    expect(analysis.gaps).toHaveLength(0);
    expect(analysis.uncoveredAbove).toBe(50_000_000);
  });

  it("flags overlapping neighbours as invalid", () => {
    const analysis = analyzeTiers([tiers[0]!, { ...tiers[1]!, from: 15_000_000 }]);
    expect(analysis.overlaps).toHaveLength(1);
    expect([...analysis.invalid].sort()).toEqual(["t1", "t2"]);
  });

  it("flags a tier whose upper bound is not above its lower bound", () => {
    const analysis = analyzeTiers([{ id: "x", from: 5, to: 5, percent: 1 }]);
    expect(analysis.overlaps[0]?.kind).toBe("empty-range");
  });

  it("reports gaps, including one before the first tier", () => {
    const analysis = analyzeTiers([
      { id: "a", from: 1_000, to: 2_000, percent: 1 },
      { id: "b", from: 3_000, to: null, percent: 2 },
    ]);
    expect(analysis.gaps).toEqual([
      { from: 0, to: 1_000 },
      { from: 2_000, to: 3_000 },
    ]);
    expect(analysis.uncoveredAbove).toBeNull();
  });
});

describe("nextTier", () => {
  it("returns the remaining amount and progress to the next tier", () => {
    const result = nextTier(tiers, 13_580_000);
    expect(result?.tier.id).toBe("t2");
    expect(result?.remaining).toBe(6_420_000);
    expect(result?.progress).toBeCloseTo(0.679);
  });

  it("returns null in the top tier", () => {
    expect(nextTier(tiers, 35_000_000)).toBeNull();
  });
});

describe("ledgerBalance", () => {
  it("sums signed entries", () => {
    expect(ledgerBalance([{ amount: 5_680 }, { amount: -48_600 }, { amount: 50_000 }])).toBe(7_080);
  });
});
