import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * «Faol seanslar» of the customer card (contract §2.6, B-W1) in both modes:
 * the read (`listCustomerSessions`, `loadCustomerSessions`) and the keyed
 * sign-out (`revokeCustomerSession`), which re-reads the page it was on and
 * treats a session that already ended (404) as gone.
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

import sessionsFixture from "./api/__fixtures__/customer-sessions.json";
import { ApiError } from "./api/errors";
import { mapCustomerSession } from "./api/mappers/customers";
import type { ApiCustomerSession, ErrorEnvelope } from "./api/types";
import { listCustomerSessions } from "./customers";
import { loadCustomerSessions, revokeCustomerSession } from "./customers.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const SID = "6f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const notFound = () =>
  new ApiError(404, {
    code: "not_found",
    message: "Topilmadi.",
    errors: [],
    request_id: "",
  } as ErrorEnvelope);
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

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

describe("mapping", () => {
  it("maps a session; an empty or unknown location reads «—», no platform stays null", () => {
    const [web, app, unknown] = (sessionsFixture.results as ApiCustomerSession[]).map(
      mapCustomerSession,
    );
    expect(web).toEqual({
      id: SID,
      device: "Chrome (Windows)",
      platform: "web",
      location: "Tashkent, Tashkent, UZ",
      createdAt: "2026-10-20T10:00:00+05:00",
      updatedAt: "2026-10-26T21:05:00+05:00",
    });
    expect(app).toMatchObject({ platform: "ios", location: "—" });
    expect(unknown).toMatchObject({ platform: null, location: "—" });
  });
});

describe("mock mode", () => {
  it("lists the fixture's sessions, newest activity first, 20 per page", async () => {
    const malika = await listCustomerSessions("5");
    expect(malika?.items.map((s) => [s.device, s.platform])).toEqual([
      ["Glow Derma iOS (iPhone 14)", "ios"],
      ["Chrome (Windows)", "web"],
      ["Safari (macOS)", "web"],
    ]);
    const many = await listCustomerSessions("1", 2);
    expect(many).toMatchObject({ total: 23, page: 2, pageCount: 2, pageSize: 20 });
    expect(many?.items).toHaveLength(3);
    expect(await listCustomerSessions("nope")).toBeNull();
  });

  it("signs a known session out and hands back the page without it", async () => {
    const first = (await listCustomerSessions("5"))!.items[1]!;
    const result = await revokeCustomerSession("5", first.id, 1, KEY, CSRF);
    expect(result).toMatchObject({ ok: true, data: { revoked: true } });
    if (result.ok) expect(result.data.sessions.items.map((s) => s.id)).not.toContain(first.id);
    const other = "00000000-0000-4000-8000-000000999999";
    expect(await revokeCustomerSession("5", other, 1, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { revoked: false },
    });
    // Mock mode never refreshes the route.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a malformed session id or key before the data", async () => {
    expect(await revokeCustomerSession("5", "../5", 1, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "not_found",
    });
    expect(await revokeCustomerSession("5", SID, 1, "nope", CSRF)).toMatchObject({ ok: false });
    expect(await loadCustomerSessions("5", 0, CSRF)).toMatchObject({ ok: false });
  });
});

describe("api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("reads a page with the contract's page size", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, sessionsFixture));
    const result = await loadCustomerSessions("288", 2, CSRF);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/customers/288/sessions/", {
      token: "t",
      query: { page: 2, page_size: 20 },
    });
    expect(result).toMatchObject({ ok: true, data: { total: 21, page: 2, pageCount: 2 } });
    expect(refresh).not.toHaveBeenCalled();
    apiFetch.mockRejectedValueOnce(notFound());
    expect(await loadCustomerSessions("999", 1, CSRF)).toMatchObject({ code: "not_found" });
  });

  it("DELETEs with the key, re-reads the page and refreshes the card", async () => {
    apiFetch
      .mockResolvedValueOnce(respond(204, undefined))
      .mockResolvedValueOnce(respond(200, sessionsFixture));
    const result = await revokeCustomerSession("288", SID, 2, KEY, CSRF);
    expect(apiFetch).toHaveBeenNthCalledWith(1, `/api/v1/admin/customers/288/sessions/${SID}/`, {
      method: "DELETE",
      token: "t",
      idempotencyKey: KEY,
    });
    expect(result).toMatchObject({ ok: true, data: { revoked: true } });
    // The revoked row never shows again, even if the re-read raced it.
    if (result.ok) expect(result.data.sessions.items.map((s) => s.id)).not.toContain(SID);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("treats an already ended session (404) as gone, with the fresh page", async () => {
    apiFetch
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce(respond(200, { ...sessionsFixture, results: [] }));
    expect(await revokeCustomerSession("288", SID, 1, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { revoked: false, sessions: { items: [] } },
    });
  });
});
