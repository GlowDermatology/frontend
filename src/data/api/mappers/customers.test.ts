import { describe, expect, it } from "vitest";

import adjustmentFixture from "../__fixtures__/cashback-adjustment.json";
import policyScheduledFixture from "../__fixtures__/cashback-policy-scheduled.json";
import policyFixture from "../__fixtures__/cashback-policy.json";
import malikaFixture from "../__fixtures__/customer-5.json";
import deletedFixture from "../__fixtures__/customer-deleted.json";
import deletedPageFixture from "../__fixtures__/customers-deleted-page.json";
import adjustmentErrorFixture from "../__fixtures__/err-cashback-adjustment.json";
import insufficientFixture from "../__fixtures__/err-insufficient-balance.json";
import policyErrorFixture from "../__fixtures__/err-policy-version.json";
import createdFixture from "../__fixtures__/policy-version-created.json";
import staffFixture from "../__fixtures__/staff-page.json";
import { ApiError } from "../errors";
import type {
  ApiCashbackAdjustmentResult,
  ApiCashbackPolicy,
  ApiCustomerCard,
  ApiPaginatedCustomers,
  ApiPaginatedStaff,
  ApiPolicyVersionCreated,
  ErrorEnvelope,
} from "../types";
import { mapCashbackSettings, mapPolicy, mapTierWarning, policyVersionBody } from "./cashback";
import {
  customerFilterParams,
  customerListParams,
  mapCustomerCard,
  mapLedgerEntry,
} from "./customers";
import { toActionResult } from "./errors";
import { mapPage } from "./page";
import { mapSegmentMember } from "./segments";
import { mapStaffMember } from "./staff";

/**
 * Customers, cashback policy and staff mappers (contract §5.3, §5.4, §2.16)
 * against answers recorded from the seeded backend (acd1534, anchor
 * 2026-10-24 12:05 Tashkent): Malika's card, the deleted customers, the
 * policy before and after a scheduled v4, an adjustment and the 400s.
 */

const NBSP = " ";
const malika = mapCustomerCard(malikaFixture as ApiCustomerCard);

describe("mapCustomerCard (Malika, customer 5)", () => {
  it("keeps the server totals, tier, balances, groups and device", () => {
    expect(malika).toMatchObject({
      id: "5",
      name: "Malika Karimova",
      phone: "+998901234567",
      status: "active",
      language: "uz",
      address: "Toshkent, Chilonzor, 9-kvartal",
      totals: { store: 9_940_000, online: 3_640_000, lifetime: 13_580_000 },
      onlineOrders: { count: 12, lastOrderId: 10248, lastOrderAt: "2026-10-23T14:02:00+05:00" },
      tier: {
        percent: 1,
        policyVersion: 3,
        next: { percent: 2, from: 20_000_000, remaining: 6_420_000, progress: 0.679 },
      },
      balance: 5_680,
      held: 0,
      available: 5_680,
      upcomingAppointments: 1,
      groups: ["Doimiy mijozlar", "10 mln+ xarid"],
      device: { model: "iPhone 14", os: "iOS 18.1", appVersion: "1.0.0", pushEnabled: true },
    });
    expect(malika.deletedAt).toBeUndefined();
    expect(malika.purchases).toHaveLength(25);
  });

  it("maps the full ledger with the server's balance_after and the §5.3 strings", () => {
    expect(malika.ledger).toHaveLength(15);
    expect(malika.ledger.map((e) => e.id).slice(0, 3)).toEqual(["121", "120", "112"]);
    expect(malika.ledger[0]).toEqual({
      id: "121",
      at: expect.any(String),
      kind: "credit",
      source: "Buyurtma №10248",
      note: `568${NBSP}000 so‘m · 1% · aksiyasiz qism`,
      amount: 5_680,
      balanceAfter: 5_680,
      orderId: 10248,
      policyVersion: 3,
      promoExcluded: true,
    });
    const byId = new Map(malika.ledger.map((e) => [e.id, e]));
    expect(byId.get("120")).toMatchObject({
      kind: "debit",
      source: "Buyurtma №10248",
      note: "To‘lovning bir qismi",
      amount: -48_600,
      balanceAfter: 0,
    });
    expect(byId.get("112")).toMatchObject({
      source: "Billz savdo S-88213",
      note: `Chek 231${NBSP}000 so‘m · 1%`,
      balanceAfter: 48_600,
      orderId: undefined,
    });
    expect(byId.get("109")).toMatchObject({
      kind: "adjustment",
      source: "Administrator",
      note: "Kassada QR o‘qilmadi, chek S-87011 qo‘lda bog‘landi",
      amount: 2_950,
      balanceAfter: 63_150,
    });
    expect(byId.get("107")).toMatchObject({
      kind: "reversal",
      note: "Buyurtma bekor qilindi · cashback qaytarildi",
      orderId: 10198,
    });
    // The server's running total agrees with the rows, newest first.
    let expected = malika.balance;
    for (const entry of malika.ledger) {
      expect(entry.balanceAfter).toBe(expected);
      expected -= entry.amount;
    }
    expect(expected).toBe(0);
  });

  it("labels purchases by order number or Billz document and keeps the reversal flag", () => {
    const [online, store, , , reversed] = malika.purchases;
    expect(online).toMatchObject({ document: "№10248", orderId: 10248, reversed: false });
    expect(store).toMatchObject({ document: "S-88213", orderId: undefined, source: "store_qr" });
    expect(reversed).toMatchObject({ document: "№10198", reversed: true });
  });

  it("renders a deleted customer as deleted, with no address or device", () => {
    const card = mapCustomerCard(deletedFixture as ApiCustomerCard);
    expect(card).toMatchObject({
      name: "O‘chirilgan mijoz",
      status: "deleted",
      deletedAt: "2026-10-20T10:00:00+05:00",
      address: undefined,
      device: undefined,
      ledger: [],
    });
  });
});

describe("customers list", () => {
  it("maps the page envelope and the scrubbed names", () => {
    const page = mapPage(deletedPageFixture as ApiPaginatedCustomers, mapSegmentMember);
    expect(page).toMatchObject({ total: 6, page: 1, pageSize: 20, pageCount: 1 });
    expect(page.items.every((row) => row.status === "deleted")).toBe(true);
    expect(page.items[0]).toMatchObject({ name: "O‘chirilgan mijoz", percent: "1.00" });
  });

  it("renames the URL filters to the API's in the mapper (q→search, group→segment, sort→ordering)", () => {
    expect(
      customerListParams({
        q: "Malika",
        status: "active",
        group: "2",
        sort: "balance_desc",
        page: 3,
        pageSize: 50,
      }),
    ).toEqual({
      search: "Malika",
      status: "active",
      segment: "2",
      ordering: "-balance",
      page: 3,
      page_size: 50,
    });
    // The server default ordering is not sent; the export drops the page.
    expect(customerFilterParams({ sort: "registered_desc" })).toEqual({
      search: undefined,
      status: undefined,
      segment: undefined,
      ordering: undefined,
    });
    expect(customerFilterParams({ sort: "name_asc" }).ordering).toBe("name");
  });
});

describe("cashback adjustment", () => {
  it("maps the 201 entry with the adjustment strings", () => {
    const data = adjustmentFixture as ApiCashbackAdjustmentResult;
    expect(mapLedgerEntry(data.entry)).toMatchObject({
      kind: "adjustment",
      source: "Administrator",
      note: "F2c fixture: qo‘shish",
      amount: 1_000,
      balanceAfter: 31_000,
    });
    expect(data.available).toBe(31_000);
  });

  it("puts reason and insufficient_balance errors on the dialog fields", () => {
    expect(toActionResult(new ApiError(400, adjustmentErrorFixture as ErrorEnvelope))).toEqual({
      ok: false,
      error: "Sababni kiriting.",
      code: "validation_error",
      fieldErrors: { reason: "Kamida 3 ta belgi kiriting." },
    });
    expect(toActionResult(new ApiError(400, insufficientFixture as ErrorEnvelope))).toEqual({
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      code: "validation_error",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    });
  });
});

describe("cashback policy (contract §5.4)", () => {
  it("maps the active policy and the history strings of the seeded versions", () => {
    const settings = mapCashbackSettings(policyFixture as ApiCashbackPolicy);
    expect(settings.policy).toMatchObject({
      version: 3,
      effectiveFrom: "2026-10-01T00:00:00+05:00",
      basis: "before_purchase",
      earnOnCashbackPaid: true,
    });
    expect(settings.policy.tiers.map((t) => [t.from, t.to, t.percent])).toEqual([
      [0, 20_000_000, 1],
      [20_000_000, 30_000_000, 2],
      [30_000_000, 50_000_000, 3],
    ]);
    expect(settings.scheduled).toBeNull();
    expect(settings.nextEffectiveFrom).toBe("2026-11-01T00:00:00+05:00");
    expect(settings.versions).toEqual([
      {
        version: 3,
        summary: `30–50${NBSP}mln: 3% qo‘shildi`,
        author: "Administrator",
        period: "1-okt 2026 dan",
        active: true,
        scheduled: false,
        state: "active",
      },
      {
        version: 2,
        summary: `20–30${NBSP}mln: 2% qo‘shildi`,
        author: "Administrator",
        period: "15-avg – 30-sen 2026",
        active: false,
        scheduled: false,
        state: "expired",
      },
      {
        version: 1,
        summary: `Boshlang‘ich: 20${NBSP}mln gacha 1%`,
        author: "Tizim",
        period: "1-iyun – 14-avg 2026",
        active: false,
        scheduled: false,
        state: "expired",
      },
    ]);
  });

  it("shows a scheduled version and bounds the active one at its start", () => {
    const settings = mapCashbackSettings(policyScheduledFixture as ApiCashbackPolicy);
    expect(settings.scheduled?.version).toBe(4);
    expect(settings.versions[0]).toMatchObject({
      version: 4,
      summary: `50–80${NBSP}mln: 4% qo‘shildi`,
      period: "1-yan 2027 dan",
      scheduled: true,
    });
    expect(settings.versions[1]).toMatchObject({ version: 3, period: "1-okt – 31-dek 2026" });
  });

  it("maps the 201 and its warnings", () => {
    const created = createdFixture as ApiPolicyVersionCreated;
    expect(mapPolicy(created.version)).toMatchObject({ version: 4, tiers: expect.any(Array) });
    expect(created.warnings.map(mapTierWarning)).toEqual([
      { code: "uncovered_above", from: 80_000_000, to: null },
    ]);
  });

  it("sends percents as two-decimal strings from basis points, in the editor's order", () => {
    expect(
      policyVersionBody({
        version: 3,
        effectiveFrom: "2026-11-01T00:00:00+05:00",
        basis: "with_purchase",
        earnOnCashbackPaid: false,
        tiers: [
          { id: "b", from: 20_000_000, to: 30_000_000, percent: 2.3 },
          { id: "a", from: 0, to: 20_000_000, percent: 1.5 },
          { id: "c", from: 60_000_000, to: null, percent: 0.57 },
        ],
      }),
    ).toEqual({
      effective_from: "2026-11-01T00:00:00+05:00",
      basis: "with_purchase",
      earn_on_cashback_paid: false,
      tiers: [
        { from: 20_000_000, to: 30_000_000, percent: "2.30" },
        { from: 0, to: 20_000_000, percent: "1.50" },
        { from: 60_000_000, to: null, percent: "0.57" },
      ],
    });
  });

  it("keeps the API paths of the 400 so the editor finds the row (first message per field)", () => {
    expect(toActionResult(new ApiError(400, policyErrorFixture as ErrorEnvelope))).toEqual({
      ok: false,
      error: "Darajalar ustma-ust tushmoqda.",
      code: "validation_error",
      fieldErrors: {
        "tiers.2.to": "Yuqori chegara quyi chegaradan katta bo‘lsin.",
        "tiers.1.from": "Darajalar ustma-ust tushmoqda.",
        "tiers.2.from": "Darajalar ustma-ust tushmoqda.",
        "tiers.2.percent": "Foiz 0 dan katta va 100 dan oshmasligi kerak.",
        "tiers.1.percent": "Ko‘pi bilan 2 ta kasr raqam.",
        effectiveFrom: "Kelajakdagi sanani tanlang.",
      },
    });
  });
});

describe("staff directory", () => {
  it("maps the actor filter options", () => {
    const data = staffFixture as ApiPaginatedStaff;
    expect(data.results.map(mapStaffMember)).toEqual([
      { id: "1", name: "Administrator", email: "admin@glowderma.uz", isActive: true },
    ]);
  });
});
