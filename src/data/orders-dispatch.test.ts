import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * Yandex courier dispatch, return confirmation and the review read (plan
 * §3.6, §3.8; INTERFACES-dispatch, INTERFACES-cancel): the Server Actions in
 * api mode against a stubbed client, and the mock bodies with the backend's
 * refusals. `connection()` and `refresh()` are stubbed.
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
  getMe: async () => null,
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: (...args: unknown[]) => cachedGet(...args),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import order10248Fixture from "./api/__fixtures__/order-10248.json";
import { ApiError } from "./api/errors";
import type { ApiDeliveryIssue, ApiOrderDelivery, ApiOrderDetail } from "./api/types";
import { loadOpenIssue } from "./delivery-issues.actions";
import { ORDER_SEEDS } from "./mock/orders";
import { MESSAGE_YANDEX_RETURN_REQUESTED } from "./mock/orders.actions";
import { cancelOrder, confirmOrderReturn, dispatchOrder } from "./orders.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const refusal = (status: number, code: string, message: string, errors: unknown[] = []) =>
  new ApiError(status, { code, message, errors, request_id: "r" } as never);

const COURIER_REQUESTED: ApiOrderDelivery = {
  provider: "yandex",
  method: "standard",
  stage: "courier_requested",
  promised_from: null,
  promised_to: null,
  quote_fee: 22_000,
  carrier_price: 20_000,
  offer_price: null,
  approved_price: null,
  carrier_cost_total: null,
  cost_difference: null,
  parcel_weight_g: 650,
  prepared_at: "2026-11-15T13:40:00+05:00",
  courier_name: null,
  courier_vehicle: null,
  tracking_url: null,
  claim_status: "new",
  claim_number: 1,
  failure_code: null,
  open_issues: [],
};

const DETAIL = {
  ...(order10248Fixture as unknown as ApiOrderDetail),
  delivery: COURIER_REQUESTED,
  available_actions: {
    transitions: [],
    cancel: true,
    retry_shipment: false,
    dispatch: false,
    confirm_return: false,
  },
} as ApiOrderDetail;

const REVIEW: ApiDeliveryIssue = {
  id: 55,
  order_id: 10248,
  kind: "dispatch_review",
  code: "increase_over_limit",
  urgent: false,
  details: { order_id: 10248, claim_number: 1, offer_price: 44_500, paid_fee: 34_000 },
  note: "",
  state: "open",
  opened_at: "2026-11-15T19:10:00+05:00",
  updated_at: "2026-11-15T19:10:00+05:00",
  reminded_at: null,
  reminders: 0,
  resolved_at: null,
  resolved_by: null,
  resolution_note: "",
};

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

beforeEach(() => {
  process.env.GLOWDERMA_DATA_SOURCE = "api";
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  apiFetch.mockReset();
  cachedGet.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("dispatchOrder in api mode", () => {
  it("posts the checked parcel with the dialog's key and maps the 202 order", async () => {
    apiFetch.mockResolvedValueOnce(respond(202, DETAIL));
    const result = await dispatchOrder(10248, { contentsVerified: true, weightG: 650 }, KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/orders/10248/dispatch/", {
      method: "POST",
      body: { contents_verified: true, weight_g: 650 },
      token: "t",
      idempotencyKey: KEY,
      timeoutMs: 20_000,
    });
    expect(result.ok && result.data.delivery?.stage).toBe("courier_requested");
    expect(result.ok && result.data.availableActions).toMatchObject({ dispatch: false });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends an approved offer or a method switch only when set", async () => {
    apiFetch.mockResolvedValue(respond(202, DETAIL));
    await dispatchOrder(
      10248,
      { contentsVerified: true, weightG: 650, approvedPrice: 44_500 },
      KEY,
      CSRF,
    );
    expect(apiFetch.mock.calls[0]![1].body).toEqual({
      contents_verified: true,
      weight_g: 650,
      approved_price: 44_500,
    });
    await dispatchOrder(
      10248,
      { contentsVerified: true, weightG: 650, method: "express", approvedPrice: null },
      KEY,
      CSRF,
    );
    expect(apiFetch.mock.calls[1]![1].body).toEqual({
      contents_verified: true,
      weight_g: 650,
      method: "express",
    });
  });

  it("validates the checkbox and the weight before any call", async () => {
    const unchecked = await dispatchOrder(
      10248,
      { contentsVerified: false, weightG: 650 },
      KEY,
      CSRF,
    );
    expect(unchecked).toMatchObject({
      ok: false,
      fieldErrors: { contentsVerified: "Jo‘natma tarkibini tekshirganingizni tasdiqlang." },
    });
    const heavy = await dispatchOrder(
      10248,
      { contentsVerified: true, weightG: 20_001 },
      KEY,
      CSRF,
    );
    expect(heavy).toMatchObject({ ok: false, fieldErrors: { weightG: "20 000 g dan oshmasin." } });
    const fractional = await dispatchOrder(
      10248,
      { contentsVerified: true, weightG: 1.5 },
      KEY,
      CSRF,
    );
    expect(fractional).toMatchObject({ ok: false, fieldErrors: { weightG: expect.any(String) } });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("keeps every documented 409 code and the field errors of a 400, without a refresh", async () => {
    for (const code of [
      "invalid_transition",
      "conflict",
      "coordinates_required",
      "method_disabled",
      "too_heavy",
      "suspended",
      "closed",
      "after_cutoff",
      "returns_unavailable",
    ]) {
      apiFetch.mockRejectedValueOnce(refusal(409, code, `msg ${code}`));
      expect(
        await dispatchOrder(10248, { contentsVerified: true, weightG: 650 }, KEY, CSRF),
      ).toEqual({ ok: false, code, error: `msg ${code}` });
    }
    apiFetch.mockRejectedValueOnce(
      refusal(400, "validation_error", "Xato", [
        { field: "weight_g", code: "max_value", message: "20 000 dan oshmasin." },
      ]),
    );
    expect(
      await dispatchOrder(10248, { contentsVerified: true, weightG: 650 }, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { weightG: "20 000 dan oshmasin." } });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("confirmOrderReturn in api mode", () => {
  it("posts the trimmed note with the key", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, DETAIL));
    const result = await confirmOrderReturn(10248, "  qadoq butun  ", KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/orders/10248/confirm-return/", {
      method: "POST",
      body: { note: "qadoq butun" },
      token: "t",
      idempotencyKey: KEY,
      timeoutMs: 20_000,
    });
    expect(result.ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses a note above 1000 characters and keeps the API's codes", async () => {
    expect(await confirmOrderReturn(10248, "x".repeat(1001), KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { note: "1000 belgidan oshmasin." },
    });
    apiFetch.mockRejectedValueOnce(refusal(409, "invalid_transition", "Qaytayotgan posilka yo‘q"));
    expect(await confirmOrderReturn(10248, "", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
  });
});

describe("loadOpenIssue (the review amounts for the dialog)", () => {
  it("reads the order's open dispatch_review fresh, with its details", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, { count: 1, page: 1, page_size: 20, page_count: 1, results: [REVIEW] }),
    );
    const result = await loadOpenIssue(10248, "dispatch_review", CSRF);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/delivery/issues/", {
      query: { state: "open", kind: "dispatch_review", order: 10248, page: 1, page_size: 20 },
      token: "t",
    });
    expect(result.ok && result.data).toMatchObject({ id: 55, details: { offer_price: 44_500 } });
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("answers null when none is open, and refuses an unknown kind", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, { count: 0, page: 1, page_size: 20, page_count: 1, results: [] }),
    );
    expect(await loadOpenIssue(10248, "dispatch_review", CSRF)).toEqual({ ok: true, data: null });
    expect(await loadOpenIssue(10248, "nope" as never, CSRF)).toMatchObject({ ok: false });
  });
});

describe("the mock bodies (demo mode)", () => {
  beforeEach(() => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
    verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  });

  const seedWhere = (pick: (s: (typeof ORDER_SEEDS)[number]) => boolean) =>
    ORDER_SEEDS.find(pick)!.id;

  it("assigns a courier at once and resolves the price review", async () => {
    const id = seedWhere((s) => s.yandex?.claimStatus === "ready_for_approval");
    const loaded = await loadOpenIssue(id, "dispatch_review", CSRF);
    const offer = loaded.ok ? (loaded.data?.details.offer_price as number) : 0;
    expect(offer).toBeGreaterThan(0);
    const result = await dispatchOrder(
      id,
      { contentsVerified: true, weightG: 700, approvedPrice: offer },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.delivery).toMatchObject({
      stage: "courier_assigned",
      approvedPrice: offer,
      parcelWeightG: 700,
      claimNumber: 2,
    });
    expect(result.data.delivery?.openIssues.some((i) => i.kind === "dispatch_review")).toBe(false);
    expect(result.data.availableActions).toMatchObject({ dispatch: false, cancel: true });
    expect(result.data.history[0]).toMatchObject({ title: "Kuryer chaqirildi", source: "admin" });
    expect(JSON.stringify(result.data.delivery)).not.toMatch(/\+?998\d{9}/);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("answers the backend's refusals", async () => {
    const plain = seedWhere(
      (s) => s.yandex?.stage === "awaiting_dispatch" && s.yandex.claimNumber === null,
    );
    expect(
      await dispatchOrder(
        plain,
        { contentsVerified: true, weightG: 650, approvedPrice: 1 },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: false, code: "conflict" });
    const heavy = await dispatchOrder(
      plain,
      { contentsVerified: true, weightG: 10_001 },
      KEY,
      CSRF,
    );
    expect(heavy).toMatchObject({ ok: false, code: "too_heavy" });
    const busy = seedWhere((s) => s.yandex?.stage === "courier_assigned");
    expect(
      await dispatchOrder(busy, { contentsVerified: true, weightG: 650 }, KEY, CSRF),
    ).toMatchObject({ ok: false, code: "invalid_transition" });
  });

  it("confirms a returning parcel back and refuses one that is not returning", async () => {
    const returning = seedWhere((s) => s.yandex?.stage === "returning");
    const result = await confirmOrderReturn(returning, "qadoq butun", KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.delivery?.stage).toBe("returned");
    expect(result.data.delivery?.openIssues.some((i) => i.kind === "return_pending")).toBe(false);
    expect(result.data.availableActions).toMatchObject({ confirmReturn: false, dispatch: true });
    expect(result.data.history[0]).toMatchObject({
      title: "Jo‘natma omborga qaytdi",
      note: "Qaytish qo‘lda tasdiqlandi · qadoq butun",
    });
    const plain = seedWhere((s) => s.yandex?.stage === "courier_assigned");
    expect(await confirmOrderReturn(plain, "", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
  });

  it("cancels carrier-aware: a return first for a parcel with the courier", async () => {
    const inTransit = seedWhere((s) => s.yandex?.stage === "in_transit");
    expect(await cancelOrder(inTransit, "mijoz so‘rovi bilan", KEY, CSRF)).toEqual({
      ok: false,
      code: "return_requested",
      error: MESSAGE_YANDEX_RETURN_REQUESTED,
    });
    const assigned = seedWhere((s) => s.yandex?.stage === "courier_assigned");
    const cancelled = await cancelOrder(assigned, "mijoz so‘rovi bilan", KEY, CSRF);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.data.delivery?.stage).toBe("cancelled");
    expect(cancelled.data.history[0]!.note).toContain("Yandex buyurtmasi bekor qilindi");
    expect(cancelled.data.history[0]!.note).not.toContain("BTS");
  });
});
