import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * F2c, customers and cashback in both modes: the read dispatchers (customers
 * list and card, cashback policy, staff directory, group options) and the
 * two Server Actions (`adjustCashback`, `saveCashbackPolicy`). Api branches
 * send the documented request (path, params, key, body) and map the
 * recorded answers; mock branches answer from the fixtures with the
 * backend's rules.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const refresh = vi.fn();
const apiFetch = vi.fn();
const cachedGet = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  requireApiToken: async () => "t",
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: (...args: unknown[]) => cachedGet(...args),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import adjustmentFixture from "./api/__fixtures__/cashback-adjustment.json";
import policyScheduledFixture from "./api/__fixtures__/cashback-policy-scheduled.json";
import policyFixture from "./api/__fixtures__/cashback-policy.json";
import malikaFixture from "./api/__fixtures__/customer-5.json";
import deletedPageFixture from "./api/__fixtures__/customers-deleted-page.json";
import insufficientFixture from "./api/__fixtures__/err-insufficient-balance.json";
import policyErrorFixture from "./api/__fixtures__/err-policy-version.json";
import createdFixture from "./api/__fixtures__/policy-version-created.json";
import segmentsFixture from "./api/__fixtures__/segments-page.json";
import staffFixture from "./api/__fixtures__/staff-page.json";
import { ApiError } from "./api/errors";
import type { ErrorEnvelope } from "./api/types";
import { saveCashbackPolicy } from "./cashback.actions";
import { getCashbackSettings } from "./cashback";
import { listCustomers, getCustomer } from "./customers";
import { adjustCashback } from "./customers.actions";
import { ACTIVE_POLICY } from "./mock/cashback";
import { exportCustomers } from "./mock/customers.queries";
import { listSegmentOptions } from "./segments";
import { listStaff } from "./staff";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const apiError = (status: number, body: unknown) => new ApiError(status, body as ErrorEnvelope);
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const LIST = { sort: "registered_desc" as const, page: 1, pageSize: 20 as const };

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  refresh.mockClear();
  apiFetch.mockReset();
  cachedGet.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("mock mode", () => {
  it("lists the 432 customers with the backend's filters, ordering and page sizes", async () => {
    const all = await listCustomers(LIST);
    expect(all).toMatchObject({ total: 432, pageSize: 20, pageCount: 22 });
    const deleted = await listCustomers({ ...LIST, status: "deleted" });
    expect(deleted.total).toBe(6);
    expect(deleted.items.every((row) => row.name === "O‘chirilgan mijoz")).toBe(true);
    // ≥ 3 digits match the phone, spaces ignored; fewer digits match names only.
    const byPhone = await listCustomers({ ...LIST, q: "90 123 45" });
    expect(byPhone.items.map((row) => row.id)).toEqual(["5"]);
    expect((await listCustomers({ ...LIST, q: "malika" })).items[0]?.id).toBe("5");
    const group = await listCustomers({ ...LIST, group: "1", sort: "name_asc" });
    expect(group.items.map((row) => row.name)).toEqual([
      "Aziza Tursunova",
      "Bekzod Rasulov",
      "Malika Karimova",
      "Sevara Xolmatova",
    ]);
    const richest = await listCustomers({ ...LIST, sort: "total_desc", pageSize: 50 });
    expect(richest.items).toHaveLength(50);
    expect(richest.items[0]!.lifetimeTotal).toBeGreaterThanOrEqual(richest.items[1]!.lifetimeTotal);
    expect((await exportCustomers({ sort: "registered_desc", status: "deleted" })).length).toBe(6);
  });

  it("builds the card with the server-shaped tier, balances and balance_after", async () => {
    const malika = await getCustomer("5");
    expect(malika).toMatchObject({
      balance: 48_600,
      held: 0,
      available: 48_600,
      tier: { percent: 1, policyVersion: 3, next: { percent: 2, remaining: 6_420_000 } },
    });
    expect(malika?.ledger[0]?.balanceAfter).toBe(48_600);
    expect((await listSegmentOptions()).map((group) => group.name)).toEqual([
      "Doimiy mijozlar",
      "10 mln+ xarid",
    ]);
    expect((await listStaff()).map((member) => member.name)).toEqual(["Administrator"]);
  });

  it("refuses to subtract more than the available balance (insufficient_balance)", async () => {
    expect(
      await adjustCashback(
        "5",
        { direction: "subtract", amount: 48_601, reason: "xato" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: false, fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." } });
  });

  it("supersedes nothing and warns about the bounded top like the backend", async () => {
    const result = await saveCashbackPolicy(
      { ...ACTIVE_POLICY, effectiveFrom: "2026-11-01T00:00:00+05:00" },
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({
      ok: true,
      data: { warnings: [{ code: "uncovered_above", from: 50_000_000, to: null }] },
    });
    if (result.ok) expect(result.data.supersededVersion).toBeUndefined();
  });
});

describe("api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("reads the customers list with the API's parameter names", async () => {
    cachedGet.mockResolvedValue(respond(200, deletedPageFixture));
    const page = await listCustomers({
      q: "933",
      status: "deleted",
      group: "1",
      sort: "name_desc",
      page: 2,
      pageSize: 50,
    });
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/customers/",
      {
        search: "933",
        status: "deleted",
        segment: "1",
        ordering: "-name",
        page: 2,
        page_size: 50,
      },
      "t",
    );
    expect(page.total).toBe(6);
  });

  it("reads one card per id; an unknown id is null, a non-numeric one never reaches Django", async () => {
    cachedGet.mockResolvedValueOnce(respond(200, malikaFixture));
    expect((await getCustomer("5"))?.balance).toBe(5_680);
    expect(cachedGet).toHaveBeenLastCalledWith("/api/v1/admin/customers/5/", undefined, "t");
    cachedGet.mockRejectedValueOnce(
      apiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "r" }),
    );
    expect(await getCustomer("99999")).toBeNull();
    cachedGet.mockClear();
    expect(await getCustomer("abc")).toBeNull();
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("reads the policy, the staff directory and the group options", async () => {
    cachedGet.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/cashback/policy/") return respond(200, policyScheduledFixture);
      if (path === "/api/v1/admin/staff/") return respond(200, staffFixture);
      if (path === "/api/v1/admin/segments/") return respond(200, segmentsFixture);
      throw new Error(`unexpected GET ${path}`);
    });
    const settings = await getCashbackSettings();
    expect(settings.policy.version).toBe(3);
    expect(settings.scheduled?.version).toBe(4);
    expect(await listStaff()).toEqual([
      { id: "1", name: "Administrator", email: "admin@glowderma.uz", isActive: true },
    ]);
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/staff/",
      { page: 1, page_size: 100 },
      "t",
    );
    expect((await listSegmentOptions()).map((group) => group.id)).toEqual(["1", "2"]);
  });

  it("adjustCashback posts the dialog's key and returns the server balances", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, adjustmentFixture));
    const result = await adjustCashback(
      "288",
      { direction: "add", amount: 1_000, reason: "  F2c fixture: qo‘shish " },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/customers/288/cashback-adjustments/",
      expect.objectContaining({
        method: "POST",
        token: "t",
        idempotencyKey: KEY,
        body: { direction: "add", amount: 1_000, reason: "F2c fixture: qo‘shish" },
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { balance: 31_000, available: 31_000, entry: { kind: "adjustment", amount: 1_000 } },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("adjustCashback maps insufficient_balance to the amount field without refreshing", async () => {
    apiFetch.mockRejectedValueOnce(apiError(400, insufficientFixture));
    expect(
      await adjustCashback(
        "288",
        { direction: "subtract", amount: 9_999_999, reason: "abc test" },
        KEY,
        CSRF,
      ),
    ).toEqual({
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      code: "validation_error",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    });
    apiFetch.mockRejectedValueOnce(
      apiError(422, {
        code: "idempotency_key_reused",
        message: "Bu kalit boshqa so‘rov uchun ishlatilgan.",
        errors: [],
        request_id: "r",
      }),
    );
    expect(
      await adjustCashback("288", { direction: "add", amount: 5, reason: "abc" }, KEY, CSRF),
    ).toMatchObject({ code: "idempotency_key_reused" });
    expect(refresh).not.toHaveBeenCalled();
    apiFetch.mockClear();
    expect(
      await adjustCashback("x-5", { direction: "add", amount: 5, reason: "abc" }, KEY, CSRF),
    ).toMatchObject({ code: "not_found" });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("saveCashbackPolicy posts percent strings with the key, re-reads the history and returns the warnings", async () => {
    apiFetch.mockImplementation(async (path: string, init: { method?: string }) => {
      if (path === "/api/v1/admin/cashback/policy-versions/") return respond(201, createdFixture);
      if (path === "/api/v1/admin/cashback/policy/" && !init.method) {
        return respond(200, policyScheduledFixture);
      }
      throw new Error(`unexpected ${init.method ?? "GET"} ${path}`);
    });
    const tiers = [
      ...ACTIVE_POLICY.tiers,
      { id: "tier-4", from: 50_000_000, to: 80_000_000, percent: 4 },
    ];
    const result = await saveCashbackPolicy(
      {
        ...ACTIVE_POLICY,
        earnOnCashbackPaid: true,
        effectiveFrom: "2027-01-01T00:00:00+05:00",
        tiers,
      },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/cashback/policy-versions/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: {
          effective_from: "2027-01-01T00:00:00+05:00",
          basis: "before_purchase",
          earn_on_cashback_paid: true,
          tiers: [
            { from: 0, to: 20_000_000, percent: "1.00" },
            { from: 20_000_000, to: 30_000_000, percent: "2.00" },
            { from: 30_000_000, to: 50_000_000, percent: "3.00" },
            { from: 50_000_000, to: 80_000_000, percent: "4.00" },
          ],
        },
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        policy: { version: 4 },
        version: {
          version: 4,
          summary: "50–80 mln: 4% qo‘shildi",
          period: "1-yan 2027 dan",
          scheduled: true,
        },
        warnings: [{ code: "uncovered_above", from: 80_000_000, to: null }],
      },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("saveCashbackPolicy keeps the API paths of a 400 (row errors, past date)", async () => {
    apiFetch.mockRejectedValueOnce(apiError(400, policyErrorFixture));
    const result = await saveCashbackPolicy(
      { ...ACTIVE_POLICY, effectiveFrom: "2026-10-01T00:00:00+05:00" },
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        "tiers.1.from": "Darajalar ustma-ust tushmoqda.",
        effectiveFrom: "Kelajakdagi sanani tanlang.",
      },
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(await saveCashbackPolicy(ACTIVE_POLICY, "nope", CSRF)).toMatchObject({ ok: false });
  });

  it("the policy without an active version starts the editor from an empty v0", async () => {
    cachedGet.mockResolvedValueOnce(respond(200, { ...policyFixture, active: null, versions: [] }));
    const settings = await getCashbackSettings();
    expect(settings.policy).toMatchObject({
      version: 0,
      tiers: [],
      effectiveFrom: "2026-11-01T00:00:00+05:00",
    });
  });
});
