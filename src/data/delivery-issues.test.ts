import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The delivery-issue seam (plan §3.9, INTERFACES-ops): the reads and the
 * Server Actions in api mode against a stubbed client, and the shell poll's
 * read in both modes. `connection()` and `refresh()` are stubbed.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const refresh = vi.fn();
const apiFetch = vi.fn();
const cachedGet = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
// The admin language comes from the `gd_admin_language` cookie (none here → Uzbek).
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
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

import { ApiError } from "./api/errors";
import type { ApiDeliveryIssue } from "./api/types";
import { getDispatchSuspension, getIssueAlerts, listDeliveryIssues } from "./delivery-issues";
import {
  openDeliveryIncident,
  resolveDeliveryIssue,
  updateDispatchSuspension,
} from "./delivery-issues.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const refusal = (status: number, code: string, message: string, errors: unknown[] = []) =>
  new ApiError(status, { code, message, errors, request_id: "r" } as never);

const ISSUE: ApiDeliveryIssue = {
  id: 41,
  order_id: 10240,
  kind: "incident",
  code: "staff_report",
  urgent: true,
  details: {},
  note: "Bitta krem yetishmaydi",
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

describe("reads in api mode", () => {
  it("lists the queue with the API's parameter names and maps the page", async () => {
    cachedGet.mockResolvedValueOnce(
      respond(200, { count: 1, page: 2, page_size: 50, page_count: 2, results: [ISSUE] }),
    );
    const page = await listDeliveryIssues({
      state: "open",
      urgent: true,
      kind: "incident",
      order: 10240,
      page: 2,
      pageSize: 50,
    });
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/delivery/issues/",
      { state: "open", urgent: true, kind: "incident", order: 10240, page: 2, page_size: 50 },
      "t",
    );
    expect(page).toMatchObject({ total: 1, page: 2, pageSize: 50, pageCount: 2 });
    expect(page.items[0]).toMatchObject({ id: 41, orderId: 10240, urgent: true });
  });

  it("reads the dispatch switch", async () => {
    cachedGet.mockResolvedValueOnce(
      respond(200, {
        suspended: false,
        until: null,
        note: "",
        updated_at: "2026-11-15T10:00:00+05:00",
      }),
    );
    expect(await getDispatchSuspension()).toEqual({
      suspended: false,
      until: null,
      note: "",
      updatedAt: "2026-11-15T10:00:00+05:00",
    });
    expect(cachedGet).toHaveBeenCalledWith("/api/v1/admin/delivery/suspension/", undefined, "t");
  });
});

describe("the shell poll's read (route handler)", () => {
  it("reads nav-counts and the open urgent issues fresh, in parallel", async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === "/api/v1/admin/nav-counts/"
        ? respond(200, { orders_processing: 3, appointments_pending: 1, delivery_issues_open: 4 })
        : respond(200, { count: 1, page: 1, page_size: 50, page_count: 1, results: [ISSUE] }),
    );
    expect(await getIssueAlerts()).toEqual({
      ok: true,
      alerts: {
        open: 4,
        urgent: [
          {
            id: 41,
            orderId: 10240,
            kind: "incident",
            code: "staff_report",
            openedAt: "2026-11-15T19:10:00+05:00",
          },
        ],
      },
    });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/delivery/issues/", {
      query: { state: "open", urgent: true, page_size: 50 },
      token: "t",
    });
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("answers 401 without a session or on the API's 401, 502 on any other API failure", async () => {
    verifyStaff.mockResolvedValueOnce({ ok: false, reason: "expired" });
    expect(await getIssueAlerts()).toEqual({ ok: false, status: 401 });
    expect(apiFetch).not.toHaveBeenCalled();
    apiFetch.mockRejectedValue(refusal(401, "not_authenticated", "x"));
    expect(await getIssueAlerts()).toEqual({ ok: false, status: 401 });
    apiFetch.mockRejectedValue(refusal(503, "http_503", "x"));
    expect(await getIssueAlerts()).toEqual({ ok: false, status: 502 });
  });

  it("serves the demo queue in mock mode", async () => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
    verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
    const result = await getIssueAlerts();
    expect(result.ok && result.alerts.open).toBe(6);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("actions in api mode", () => {
  it("resolves with the trimmed note and the dialog's key, then refreshes", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, { ...ISSUE, state: "resolved", resolution_note: "Qayta yetkazildi" }),
    );
    const result = await resolveDeliveryIssue(41, "  Qayta yetkazildi ", KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/delivery/issues/41/resolve/",
      expect.objectContaining({
        method: "POST",
        body: { note: "Qayta yetkazildi" },
        token: "t",
        idempotencyKey: KEY,
      }),
    );
    expect(result).toMatchObject({ ok: true, data: { state: "resolved" } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("returns the documented refusals with their codes, without a refresh", async () => {
    apiFetch.mockRejectedValueOnce(refusal(409, "conflict", "Bu muammo allaqachon hal qilingan."));
    expect(await resolveDeliveryIssue(41, "Hal qilindi", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu muammo allaqachon hal qilingan.",
      code: "conflict",
    });
    apiFetch.mockRejectedValueOnce(refusal(404, "not_found", "Topilmadi."));
    expect(await resolveDeliveryIssue(41, "Hal qilindi", KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
    apiFetch.mockRejectedValueOnce(
      refusal(400, "validation_error", "Maydonlarni tekshiring.", [
        { field: "note", code: "min_length", message: "Kamida 3 ta belgi kiriting." },
      ]),
    );
    expect(await resolveDeliveryIssue(41, "Hal qilindi", KEY, CSRF)).toMatchObject({
      fieldErrors: { note: "Kamida 3 ta belgi kiriting." },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("checks the note before calling (3..1000) and refuses a bad key", async () => {
    expect(await resolveDeliveryIssue(41, " ab ", KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { note: "Kamida 3 ta belgi kiriting." },
    });
    expect(await resolveDeliveryIssue(41, "", KEY, CSRF)).toMatchObject({
      fieldErrors: { note: "Majburiy maydon." },
    });
    expect(await openDeliveryIncident(10240, "x".repeat(1001), false, KEY, CSRF)).toMatchObject({
      fieldErrors: { note: "1000 belgidan oshmasin." },
    });
    expect(await resolveDeliveryIssue(41, "Hal qilindi", "nope", CSRF)).toMatchObject({
      fieldErrors: { key: "Noto‘g‘ri so‘rov kaliti." },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("opens an incident: 201 created, 200 refreshed; a pickup order's 409 comes back", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, ISSUE));
    const created = await openDeliveryIncident(10240, "Bitta krem yetishmaydi", true, KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/orders/10240/issues/",
      expect.objectContaining({
        method: "POST",
        body: { kind: "incident", note: "Bitta krem yetishmaydi", urgent: true },
        idempotencyKey: KEY,
      }),
    );
    expect(created).toMatchObject({ ok: true, data: { created: true, issue: { id: 41 } } });
    apiFetch.mockResolvedValueOnce(respond(200, ISSUE));
    expect(await openDeliveryIncident(10240, "Yana", false, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { created: false },
    });
    apiFetch.mockRejectedValueOnce(
      refusal(409, "conflict", "Olib ketiladigan buyurtma uchun yetkazish muammosi ochilmaydi."),
    );
    expect(await openDeliveryIncident(10251, "Hodisa", false, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "conflict",
    });
  });

  it("suspends until an aware instant, resumes without one; in_past lands on until", async () => {
    const answer = {
      suspended: true,
      until: "2026-11-16T09:00:00+05:00",
      note: "Inventarizatsiya",
      updated_at: "2026-11-15T18:00:00+05:00",
    };
    apiFetch.mockResolvedValueOnce(respond(200, answer));
    const on = await updateDispatchSuspension(
      { suspended: true, until: "2026-11-16T09:00:00+05:00", note: " Inventarizatsiya " },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/delivery/suspension/",
      expect.objectContaining({
        method: "POST",
        body: { suspended: true, until: "2026-11-16T09:00:00+05:00", note: "Inventarizatsiya" },
        idempotencyKey: KEY,
      }),
    );
    expect(on).toMatchObject({ ok: true, data: { suspended: true } });
    apiFetch.mockResolvedValueOnce(
      respond(200, { ...answer, suspended: false, until: null, note: "" }),
    );
    await updateDispatchSuspension(
      { suspended: false, until: "2026-11-16T09:00:00+05:00", note: "" },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/delivery/suspension/",
      expect.objectContaining({ body: { suspended: false, note: "" } }),
    );
    apiFetch.mockRejectedValueOnce(
      refusal(400, "validation_error", "Maydonlarni tekshiring.", [
        { field: "until", code: "in_past", message: "Kelajakdagi vaqtni tanlang." },
      ]),
    );
    expect(
      await updateDispatchSuspension(
        { suspended: true, until: "2026-11-14T09:00:00+05:00", note: "" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { until: "Kelajakdagi vaqtni tanlang." } });
  });

  it("refuses a naive time or a long note before calling", async () => {
    expect(
      await updateDispatchSuspension(
        { suspended: true, until: "2026-11-16T09:00", note: "" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { until: "Noto‘g‘ri qiymat." } });
    expect(
      await updateDispatchSuspension(
        { suspended: true, until: null, note: "x".repeat(301) },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { note: "300 belgidan oshmasin." } });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("is guarded by the session and the csrf token like every action", async () => {
    expect(await resolveDeliveryIssue(41, "Hal qilindi", KEY, "")).toMatchObject({ code: "csrf" });
    verifyStaff.mockResolvedValueOnce({ ok: false, reason: "expired" });
    expect(await openDeliveryIncident(10240, "Hodisa", false, KEY, CSRF)).toMatchObject({
      code: "session_expired",
    });
  });
});
