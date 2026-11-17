import type { CashbackPolicy, LedgerEntry, LedgerOrigin, PolicyVersion } from "@/domain/cashback";

/** Policy v3, in force since 1 October 2026 (cashback settings screen). */
export const ACTIVE_POLICY: CashbackPolicy = {
  version: 3,
  effectiveFrom: "2026-10-01T00:00:00+05:00",
  basis: "before_purchase",
  earnOnCashbackPaid: false,
  tiers: [
    { id: "tier-1", from: 0, to: 20_000_000, percent: 1 },
    { id: "tier-2", from: 20_000_000, to: 30_000_000, percent: 2 },
    { id: "tier-3", from: 30_000_000, to: 50_000_000, percent: 3 },
  ],
};

/** Date a newly saved version would take effect (design: 1 November 2026, 00:00). */
export const NEXT_EFFECTIVE_FROM = "2026-11-01T00:00:00+05:00";

const V1_TIERS = [{ from: 0, to: 20_000_000, percent: 1 }];
const V2_TIERS = [...V1_TIERS, { from: 20_000_000, to: 30_000_000, percent: 2 }];

export const POLICY_VERSIONS: ReadonlyArray<PolicyVersion> = [
  {
    version: 3,
    summary: "30–50 mln: 3% qo‘shildi",
    author: "Administrator",
    period: "1-okt 2026 dan",
    active: true,
    state: "active",
    detail: {
      tiers: ACTIVE_POLICY.tiers,
      previous: V2_TIERS,
      effectiveFrom: ACTIVE_POLICY.effectiveFrom,
      effectiveTo: null,
      author: "Administrator",
    },
  },
  {
    version: 2,
    summary: "20–30 mln: 2% qo‘shildi",
    author: "Administrator",
    period: "15-avg – 30-sen 2026",
    active: false,
    state: "expired",
    detail: {
      tiers: V2_TIERS,
      previous: V1_TIERS,
      effectiveFrom: "2026-08-15T00:00:00+05:00",
      effectiveTo: "2026-10-01T00:00:00+05:00",
      author: "Administrator",
    },
  },
  {
    version: 1,
    summary: "Boshlang‘ich: 20 mln gacha 1%",
    author: "Tizim",
    period: "1-iyun – 14-avg 2026",
    active: false,
    state: "expired",
    detail: {
      tiers: V1_TIERS,
      previous: null,
      effectiveFrom: "2026-06-01T00:00:00+05:00",
      effectiveTo: "2026-08-15T00:00:00+05:00",
      author: null,
    },
  },
];

const t = (iso: string) => `${iso}+05:00`;

/** Structured ledger sources (§5.3), as the api mapper builds them; the card words them per language. */
const billz = (ref: string, base: number): LedgerOrigin => ({
  type: "billz_sale",
  ref,
  actor: null,
  base,
  percent: 1,
  reason: null,
});
const order = (ref: string, base: number | null): LedgerOrigin => ({
  type: "order",
  ref,
  actor: null,
  base,
  percent: base === null ? null : 1,
  reason: null,
});
const adjustment = (reason: string): LedgerOrigin => ({
  type: "admin",
  ref: "",
  actor: "Administrator",
  base: null,
  percent: null,
  reason,
});

/**
 * Malika Karimova's ledger, newest first. The first six entries are the ones
 * drawn on the customer card; the older ones make the balance add up to the
 * 48 600 so‘m shown there (balance = sum of entries).
 */
export const MALIKA_LEDGER: ReadonlyArray<LedgerEntry> = [
  {
    id: "l-12",
    at: t("2026-10-21T11:47:00"),
    kind: "credit",
    source: "Billz savdo S-88213",
    note: "Chek 231 000 so‘m · 1%",
    origin: billz("S-88213", 231_000),
    amount: 2_310,
  },
  {
    id: "l-11",
    at: t("2026-10-18T15:25:00"),
    kind: "credit",
    source: "Buyurtma №10231",
    note: "314 000 so‘m · 1% · aksiyasiz qism",
    origin: order("10231", 314_000),
    promoExcluded: true,
    amount: 3_140,
  },
  {
    id: "l-10",
    at: t("2026-10-18T15:22:00"),
    kind: "debit",
    source: "Buyurtma №10231",
    note: "To‘lovning bir qismi",
    origin: order("10231", null),
    amount: -20_000,
  },
  {
    id: "l-09",
    at: t("2026-10-12T10:03:00"),
    kind: "adjustment",
    source: "Administrator",
    note: "Kassada QR o‘qilmadi, chek S-87011 qo‘lda bog‘landi",
    origin: adjustment("Kassada QR o‘qilmadi, chek S-87011 qo‘lda bog‘landi"),
    amount: 2_950,
  },
  {
    id: "l-08",
    at: t("2026-10-09T13:40:00"),
    kind: "credit",
    source: "Billz savdo S-86540",
    note: "Chek 412 000 so‘m · 1%",
    origin: billz("S-86540", 412_000),
    amount: 4_120,
  },
  {
    id: "l-07",
    at: t("2026-10-02T16:10:00"),
    kind: "reversal",
    source: "Buyurtma №10198",
    note: "Buyurtma bekor qilindi · cashback qaytarildi",
    origin: order("10198", null),
    amount: -1_560,
  },
  {
    id: "l-06",
    at: t("2026-10-02T14:34:00"),
    kind: "credit",
    source: "Buyurtma №10198",
    note: "156 000 so‘m · 1%",
    origin: order("10198", 156_000),
    amount: 1_560,
  },
  {
    id: "l-05",
    at: t("2026-09-14T12:20:00"),
    kind: "credit",
    source: "Billz savdo S-81377",
    note: "Chek 864 000 so‘m · 1%",
    origin: billz("S-81377", 864_000),
    amount: 8_640,
  },
  {
    id: "l-04",
    at: t("2026-08-02T17:05:00"),
    kind: "credit",
    source: "Billz savdo S-76102",
    note: "Chek 621 000 so‘m · 1%",
    origin: billz("S-76102", 621_000),
    amount: 6_210,
  },
  {
    id: "l-03",
    at: t("2026-07-11T11:42:00"),
    kind: "credit",
    source: "Billz savdo S-71840",
    note: "Chek 1 530 000 so‘m · 1%",
    origin: billz("S-71840", 1_530_000),
    amount: 15_300,
  },
  {
    id: "l-02",
    at: t("2026-06-20T15:18:00"),
    kind: "credit",
    source: "Billz savdo S-68011",
    note: "Chek 987 000 so‘m · 1%",
    origin: billz("S-68011", 987_000),
    amount: 9_870,
  },
  {
    id: "l-01",
    at: t("2026-06-03T10:55:00"),
    kind: "credit",
    source: "Billz savdo S-65230",
    note: "Chek 1 245 000 so‘m · 1%",
    origin: billz("S-65230", 1_245_000),
    amount: 12_450,
  },
  {
    id: "l-00",
    at: t("2026-06-01T09:30:00"),
    kind: "credit",
    source: "Billz savdo S-64998",
    note: "Chek 361 000 so‘m · 1%",
    origin: billz("S-64998", 361_000),
    amount: 3_610,
  },
];
