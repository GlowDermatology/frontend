import { afterEach, describe, expect, it, vi } from "vitest";

import type { VerifyStaffOptions } from "./auth";

const verifyStaff = vi.fn();
const apiFetch = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
}));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import { ApiError } from "./api/errors";
import { lookupCustomers } from "./customer-lookup";

const row = (id: number, name: string, phone: string | null = `+99890000000${id}`) => ({
  id,
  name,
  phone,
  email: null,
  status: "active" as const,
  balance: 0,
  lifetime_total: 0,
  online_orders_count: 0,
  percent: null,
  registered_at: "2025-01-01T00:00:00+05:00",
});

const page = (rows: ReturnType<typeof row>[]) => ({
  status: 200,
  data: { count: rows.length, next: null, previous: null, results: rows },
});

afterEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockReset();
  apiFetch.mockReset();
});

describe("lookupCustomers (DESIGN §C)", () => {
  it("refuses without a session", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "no_session" });
    expect(await lookupCustomers("Malika", null)).toEqual({ ok: false, status: 401 });
  });

  it("answers no items for a term too short to search, without asking the API", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    expect(await lookupCustomers("90", "1")).toEqual({
      ok: true,
      result: { term: "", kind: "name", items: [] },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("mock: finds by phone digits and marks the group's members", async () => {
    verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
    const outcome = await lookupCustomers("+998 90 123 45 67", "1");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result).toMatchObject({ term: "901234567", kind: "phone" });
    // Malika (+998901234567) is a manual member of the seeded group 1.
    expect(outcome.result.items).toEqual([
      expect.objectContaining({ id: "5", phone: "+998901234567", member: true }),
    ]);
    const none = await lookupCustomers("Malika", null);
    expect(none.ok && none.result.items.every((item) => !("member" in item))).toBe(true);
  });

  it("api: national digits as `search`, page size 20 (the API's smallest), and the same search inside the group", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockImplementation(async (_path: string, request: { query: { segment?: string } }) =>
      request.query.segment ? page([row(2, "Aziza")]) : page([row(1, "Aziz"), row(2, "Aziza")]),
    );
    const outcome = await lookupCustomers("Aziz", "7");
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/customers/",
      expect.objectContaining({
        token: "t",
        query: { search: "Aziz", page_size: 20, segment: undefined },
      }),
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/customers/",
      expect.objectContaining({ query: { search: "Aziz", page_size: 20, segment: "7" } }),
    );
    expect(outcome).toEqual({
      ok: true,
      result: {
        term: "Aziz",
        kind: "name",
        items: [
          {
            id: "1",
            name: "Aziz",
            phone: "+998900000001",
            email: null,
            status: "active",
            member: false,
          },
          {
            id: "2",
            name: "Aziza",
            phone: "+998900000002",
            email: null,
            status: "active",
            member: true,
          },
        ],
      },
    });
  });

  it("api: one request without a group; 401 and other API errors map to 401 / 502", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValue(page([row(3, "Dilnoza", null)]));
    const outcome = await lookupCustomers("901", null);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(outcome.ok && outcome.result.items[0]).toEqual({
      id: "3",
      name: "Dilnoza",
      phone: null,
      email: null,
      status: "active",
    });

    const envelope = { code: "x", message: "x", errors: [], request_id: "r" };
    apiFetch.mockRejectedValueOnce(new ApiError(401, envelope));
    expect(await lookupCustomers("901", null)).toEqual({ ok: false, status: 401 });
    apiFetch.mockRejectedValueOnce(new ApiError(500, envelope));
    expect(await lookupCustomers("901", null)).toEqual({ ok: false, status: 502 });
  });
});
