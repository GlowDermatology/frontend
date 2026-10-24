import type { CashbackPolicy, LedgerEntry, PolicyVersion } from "@/domain/cashback";

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

export const POLICY_VERSIONS: ReadonlyArray<PolicyVersion> = [
  {
    version: 3,
    summary: "30–50 mln: 3% qo‘shildi",
    author: "Administrator",
    period: "1-okt 2026 dan",
    active: true,
  },
  {
    version: 2,
    summary: "20–30 mln: 2% qo‘shildi",
    author: "Administrator",
    period: "15-avg – 30-sen 2026",
    active: false,
  },
  {
    version: 1,
    summary: "Boshlang‘ich: 20 mln gacha 1%",
    author: "Tizim",
    period: "1-iyun – 14-avg 2026",
    active: false,
  },
];

const t = (iso: string) => `${iso}+05:00`;

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
    amount: 2_310,
  },
  {
    id: "l-11",
    at: t("2026-10-18T15:25:00"),
    kind: "credit",
    source: "Buyurtma №10231",
    note: "314 000 so‘m · 1% · aksiyasiz qism",
    amount: 3_140,
  },
  {
    id: "l-10",
    at: t("2026-10-18T15:22:00"),
    kind: "debit",
    source: "Buyurtma №10231",
    note: "To‘lovning bir qismi",
    amount: -20_000,
  },
  {
    id: "l-09",
    at: t("2026-10-12T10:03:00"),
    kind: "adjustment",
    source: "Administrator",
    note: "Kassada QR o‘qilmadi, chek S-87011 qo‘lda bog‘landi",
    amount: 2_950,
  },
  {
    id: "l-08",
    at: t("2026-10-09T13:40:00"),
    kind: "credit",
    source: "Billz savdo S-86540",
    note: "Chek 412 000 so‘m · 1%",
    amount: 4_120,
  },
  {
    id: "l-07",
    at: t("2026-10-02T16:10:00"),
    kind: "reversal",
    source: "Buyurtma №10198",
    note: "Buyurtma bekor qilindi · cashback qaytarildi",
    amount: -1_560,
  },
  {
    id: "l-06",
    at: t("2026-10-02T14:34:00"),
    kind: "credit",
    source: "Buyurtma №10198",
    note: "156 000 so‘m · 1%",
    amount: 1_560,
  },
  {
    id: "l-05",
    at: t("2026-09-14T12:20:00"),
    kind: "credit",
    source: "Billz savdo S-81377",
    note: "Chek 864 000 so‘m · 1%",
    amount: 8_640,
  },
  {
    id: "l-04",
    at: t("2026-08-02T17:05:00"),
    kind: "credit",
    source: "Billz savdo S-76102",
    note: "Chek 621 000 so‘m · 1%",
    amount: 6_210,
  },
  {
    id: "l-03",
    at: t("2026-07-11T11:42:00"),
    kind: "credit",
    source: "Billz savdo S-71840",
    note: "Chek 1 530 000 so‘m · 1%",
    amount: 15_300,
  },
  {
    id: "l-02",
    at: t("2026-06-20T15:18:00"),
    kind: "credit",
    source: "Billz savdo S-68011",
    note: "Chek 987 000 so‘m · 1%",
    amount: 9_870,
  },
  {
    id: "l-01",
    at: t("2026-06-03T10:55:00"),
    kind: "credit",
    source: "Billz savdo S-65230",
    note: "Chek 1 245 000 so‘m · 1%",
    amount: 12_450,
  },
  {
    id: "l-00",
    at: t("2026-06-01T09:30:00"),
    kind: "credit",
    source: "Billz savdo S-64998",
    note: "Chek 361 000 so‘m · 1%",
    amount: 3_610,
  },
];
