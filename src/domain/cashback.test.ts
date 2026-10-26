import { describe, expect, it } from "vitest";

import {
  analyzeTiers,
  applyBasisPoints,
  basisPoints,
  calculateCashback,
  formatPercent,
  ledgerBalance,
  nextTier,
  percentString,
  policyPeriod,
  policySummary,
  rateFor,
  tierRange,
  tierWarningsText,
  withBalanceAfter,
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

/* -------------------------------------------------------------------------- */
/* Agreement with the backend engine (contract §2.7, §7.11)                    */
/* -------------------------------------------------------------------------- */

const NBSP = "\u00a0";
const single = (percent: number): CashbackRules => ({
  tiers: [{ id: "s", from: 0, to: null, percent }],
  basis: "before_purchase",
  earnOnCashbackPaid: false,
});
const purchase = (amount: number) => ({
  amount,
  promoAmount: 0,
  paidWithCashback: 0,
  lifetimeBefore: 0,
});

describe("basis points", () => {
  it("reads percents with at most two decimals exactly (core.money.percent_to_bp)", () => {
    expect(basisPoints("0.57")).toBe(57);
    expect(basisPoints(0.57)).toBe(57); // 0.5699999… in binary
    expect(basisPoints("2.3")).toBe(230);
    expect(basisPoints("2,3")).toBe(230);
    expect(basisPoints(1.5)).toBe(150);
    expect(basisPoints("1.00")).toBe(100);
    expect(basisPoints("100")).toBe(10_000);
    expect(basisPoints(0.07)).toBe(7);
    expect(basisPoints(1.15)).toBe(115);
    expect(basisPoints(2.35)).toBe(235);
  });

  it("refuses more than two decimals and values outside (0, 100]", () => {
    expect(basisPoints("2.345")).toBeNull();
    expect(basisPoints(1.234)).toBeNull();
    expect(basisPoints("0")).toBeNull();
    expect(basisPoints(0)).toBeNull();
    expect(basisPoints("100.01")).toBeNull();
    expect(basisPoints(Number.NaN)).toBeNull();
    expect(basisPoints("1,")).toBeNull();
    expect(basisPoints("abc")).toBeNull();
  });

  it("applies them with integer floor division (core.money.apply_bp)", () => {
    expect(applyBasisPoints(10_000, 57)).toBe(57);
    expect(applyBasisPoints(999, 150)).toBe(14);
    expect(applyBasisPoints(231_000, 57)).toBe(1_316); // 1 316.7 → 1 316
    expect(applyBasisPoints(150, 100)).toBe(1); // 1.5 → 1, never banker's rounding
    expect(applyBasisPoints(250, 100)).toBe(2);
  });

  it("writes the request form with two decimals and the display form without zeros", () => {
    expect(percentString(150)).toBe("1.50");
    expect(percentString(57)).toBe("0.57");
    expect(percentString(230)).toBe("2.30");
    expect(percentString(10_000)).toBe("100.00");
    expect(formatPercent("1.00")).toBe("1");
    expect(formatPercent("1.50")).toBe("1,5");
    expect(formatPercent(0.57)).toBe("0,57");
    expect(formatPercent("2.30")).toBe("2,3");
  });
});

describe("calculateCashback matches the backend vectors (loyalty/tests/test_engine.py)", () => {
  it.each([
    ["0.57 %", 0.57, 231_000, 1_316],
    ["0.57 % b", 0.57, 700_000, 3_990],
    ["2.3 %", 2.3, 568_000, 13_064],
    ["2.3 % floor", 2.3, 999, 22],
    ["1.5 %", 1.5, 700_000, 10_500],
    ["1.5 % floor", 1.5, 999, 14],
    ["1 % of 150", 1, 150, 1],
  ])("%s", (_, percent, amount, credit) => {
    expect(calculateCashback(purchase(amount), single(percent))).toEqual({
      eligible: amount,
      percent,
      amount: credit,
    });
  });

  it("order №10248 under the seeded v3 (earn on the cashback-paid part)", () => {
    const v3: CashbackRules = { ...rules, earnOnCashbackPaid: true };
    const order = {
      amount: 808_000,
      promoAmount: 240_000,
      paidWithCashback: 48_600,
      lifetimeBefore: 12_772_000,
    };
    expect(calculateCashback(order, v3)).toEqual({ eligible: 568_000, percent: 1, amount: 5_680 });
    expect(calculateCashback(order, rules).amount).toBe(5_194);
  });

  it("gives nothing without a covering tier", () => {
    expect(
      calculateCashback({ ...purchase(1_000_000), lifetimeBefore: 50_000_000 }, rules),
    ).toEqual({ eligible: 1_000_000, percent: null, amount: 0 });
  });
});

describe("version history strings (contract §5.4)", () => {
  it("strips the NBSP mln suffix in ranges (the old range() bug)", () => {
    expect(tierRange({ from: 30_000_000, to: 50_000_000 })).toBe(`30–50${NBSP}mln`);
    expect(tierRange({ from: 50_000_000, to: null })).toBe(`50${NBSP}mln dan`);
  });

  it("summarises the first version and diffs the others by (from, to, percent)", () => {
    const v1 = [{ from: 0, to: 20_000_000, percent: 1 }];
    const v2 = [...v1, { from: 20_000_000, to: 30_000_000, percent: 2 }];
    const v3 = [...v2, { from: 30_000_000, to: 50_000_000, percent: 3 }];
    expect(policySummary(v1, null)).toBe(`Boshlang‘ich: 20${NBSP}mln gacha 1%`);
    expect(policySummary(v2, v1)).toBe(`20–30${NBSP}mln: 2% qo‘shildi`);
    expect(policySummary(v3, v2)).toBe(`30–50${NBSP}mln: 3% qo‘shildi`);
    // Same bands under new tier ids (every version stores its own rows).
    expect(
      policySummary(
        v3.map((t) => ({ ...t })),
        v3,
      ),
    ).toBe("Hisoblash qoidalari yangilandi");
    expect(policySummary(v2, v3)).toBe("Daraja olib tashlandi");
    expect(policySummary([{ ...v1[0]!, percent: 1.5 }, ...v2.slice(1)], v2)).toBe(
      "Darajalar yangilandi",
    );
    // "1.00" from the API and 1 from the editor are the same band.
    expect(policySummary([{ from: 0, to: 20_000_000, percent: 1.0 }], v1)).toBe(
      "Hisoblash qoidalari yangilandi",
    );
  });

  it("prints the period of each state", () => {
    const at = (iso: string) => `${iso}T00:00:00+05:00`;
    expect(
      policyPeriod({ effectiveFrom: at("2026-10-01"), effectiveTo: null, state: "active" }),
    ).toBe("1-okt 2026 dan");
    expect(
      policyPeriod({
        effectiveFrom: at("2026-08-15"),
        effectiveTo: at("2026-10-01"),
        state: "expired",
      }),
    ).toBe("15-avg – 30-sen 2026");
    expect(
      policyPeriod({
        effectiveFrom: at("2025-12-01"),
        effectiveTo: at("2026-02-01"),
        state: "expired",
      }),
    ).toBe("1-dek 2025 – 31-yan 2026");
    expect(
      policyPeriod({
        effectiveFrom: at("2026-11-01"),
        effectiveTo: null,
        state: "superseded",
      }),
    ).toBe("1-noy 2026 dan · almashtirildi");
  });

  it("words the save warnings for the toast", () => {
    expect(
      tierWarningsText([
        { code: "gap", from: 50_000_000, to: 60_000_000 },
        { code: "uncovered_above", from: 80_000_000, to: null },
      ]),
    ).toBe(
      `50${NBSP}mln – 60${NBSP}mln so‘m oralig‘i uchun foiz yo‘q. 80${NBSP}mln so‘mdan yuqori xaridlar uchun foiz belgilanmagan.`,
    );
  });
});

describe("withBalanceAfter", () => {
  it("gives each entry (newest first) the balance right after it", () => {
    expect(
      withBalanceAfter([{ amount: 5_680 }, { amount: -48_600 }, { amount: 48_600 }]).map(
        (row) => row.balanceAfter,
      ),
    ).toEqual([5_680, 0, 48_600]);
  });
});
