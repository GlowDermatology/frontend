import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * Staff management (contract §2.16, gap FND-4) in both modes: the demo
 * answers the backend's refusals from the fixtures; the api branch sends the
 * documented request with the dialog's key and maps the one-time password.
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

import { ApiError } from "./api/errors";
import { mapStaffRow, staffListParams } from "./api/mappers/staff";
import type { ErrorEnvelope } from "./api/types";
import { MOCK_STAFF_ACCOUNTS } from "./mock/staff";
import { listStaffAccounts } from "./staff";
import { inviteStaff, resetStaffPassword, setStaffActive, updateStaff } from "./staff.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

const member = {
  id: 7,
  display_name: "Nodira Rahimova",
  email: "nodira@glowderma.uz",
  full_name: "Nodira Rahimova",
  is_active: true,
  is_manager: false,
  last_login_at: null,
  linked_providers: [],
  created_at: "2026-10-27T10:15:00+05:00",
};

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

describe("staff in mock mode", () => {
  it("lists active or inactive accounts, searched by name or email", async () => {
    const active = await listStaffAccounts({ status: "active", page: 1, pageSize: 20 });
    expect(active.items.map((row) => row.displayName)).toEqual([
      "Administrator",
      "Dilnoza Yusupova",
      "Sardor Qodirov",
    ]);
    const inactive = await listStaffAccounts({ status: "inactive", page: 1, pageSize: 20 });
    expect(inactive.items.map((row) => row.id)).toEqual(["4"]);
    const found = await listStaffAccounts({
      q: "SARDOR@",
      status: "active",
      page: 1,
      pageSize: 20,
    });
    expect(found.total).toBe(1);
  });

  it("invites with a one-time password and refuses a taken email", async () => {
    const invited = await inviteStaff(
      { email: " New@GlowDerma.uz ", fullName: "Yangi Xodim", isManager: false },
      KEY,
      CSRF,
    );
    expect(invited).toMatchObject({ ok: true, data: { staff: { email: "new@glowderma.uz" } } });
    if (invited.ok) {
      expect(invited.data.temporaryPassword).toMatch(
        /^[A-HJ-NP-Za-km-z2-9]{4}(-[A-HJ-NP-Za-km-z2-9]{4}){3}$/,
      );
    }
    expect(
      await inviteStaff(
        { email: "dilnoza@glowderma.uz", fullName: "Dilnoza", isManager: false },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        email: "Bu email bilan xodim allaqachon bor (nofaol bo‘lsa, uni qayta faollashtiring).",
      },
    });
    expect(
      await inviteStaff({ email: "x", fullName: "A", isManager: false }, KEY, CSRF),
    ).toMatchObject({
      ok: false,
      fieldErrors: { email: expect.any(String), fullName: "Kamida 2 ta belgi kiriting." },
    });
  });

  it("answers the backend's refusals: own account and the last active manager", async () => {
    expect(
      await updateStaff(
        "1",
        { fullName: "Administrator", isManager: false },
        { fullName: "Administrator", isManager: true },
        KEY,
        CSRF,
      ),
    ).toEqual({ ok: false, error: "O‘zingizni menejerlikdan chiqara olmaysiz.", code: "conflict" });
    expect(await setStaffActive("1", false, KEY, CSRF)).toMatchObject({
      ok: false,
      error: "O‘z hisobingizni faolsizlantira olmaysiz.",
    });
    expect(await resetStaffPassword("1", KEY, CSRF)).toMatchObject({
      ok: false,
      error: "O‘z parolingizni «Parolni o‘zgartirish» orqali almashtiring.",
    });
    expect(await setStaffActive("2", false, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "2", isActive: false },
    });
    expect(await resetStaffPassword("3", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { staff: { id: "3" }, temporaryPassword: expect.any(String) },
    });
    // A row invited in the demo is known by the screen's snapshot alone.
    const draft = { ...MOCK_STAFF_ACCOUNTS[2]!, id: "draft-6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f" };
    expect(await setStaffActive(draft.id, false, KEY, CSRF, draft)).toMatchObject({
      ok: true,
      data: { id: draft.id, isActive: false },
    });
    expect(await setStaffActive("x/../1", false, KEY, CSRF)).toMatchObject({ code: "not_found" });
  });
});

describe("staff in api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("reads the page with the manager columns and the renamed filters", async () => {
    expect(staffListParams({ q: "nod", status: "inactive", page: 2, pageSize: 50 })).toEqual({
      search: "nod",
      is_active: false,
      page: 2,
      page_size: 50,
    });
    cachedGet.mockResolvedValueOnce(
      respond(200, { count: 1, page: 1, page_size: 20, page_count: 1, results: [member] }),
    );
    const page = await listStaffAccounts({ status: "active", page: 1, pageSize: 20 });
    expect(page.items).toEqual([mapStaffRow(member)]);
    expect(cachedGet).toHaveBeenCalledWith(
      "/api/v1/admin/staff/",
      { is_active: true, page: 1, page_size: 20 },
      "t",
    );
    // A caller who is not a manager gets null manager columns: empty, never a crash.
    expect(
      mapStaffRow({
        ...member,
        full_name: null,
        is_manager: null,
        linked_providers: null,
        created_at: null,
      }),
    ).toMatchObject({ fullName: "", isManager: false, linkedProviders: [], createdAt: null });
  });

  it("posts the invitation with the key and keeps the password for the dialog", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(201, { staff: member, temporary_password: "Kp7m-Qx3r-Wt9z-Hn2v" }),
    );
    expect(
      await inviteStaff(
        { email: "Nodira@glowderma.uz", fullName: "Nodira Rahimova", isManager: false },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: true,
      data: { temporaryPassword: "Kp7m-Qx3r-Wt9z-Hn2v", staff: { id: "7" } },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: { email: "nodira@glowderma.uz", full_name: "Nodira Rahimova", is_manager: false },
      }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("patches only the changed fields, posts the actions and shows a 409 as it comes", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, { ...member, is_manager: true }));
    await updateStaff(
      "7",
      { fullName: "Nodira Rahimova", isManager: true },
      { fullName: "Nodira Rahimova", isManager: false },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/7/",
      expect.objectContaining({ method: "PATCH", body: { is_manager: true } }),
    );
    apiFetch.mockResolvedValueOnce(respond(200, { ...member, is_active: false }));
    expect(await setStaffActive("7", false, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { isActive: false },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/7/deactivate/",
      expect.objectContaining({ method: "POST", body: {}, idempotencyKey: KEY }),
    );
    apiFetch.mockResolvedValueOnce(
      respond(200, { staff: member, temporary_password: "Ab2c-De3f-Gh4j-Km5n" }),
    );
    expect(await resetStaffPassword("7", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { temporaryPassword: "Ab2c-De3f-Gh4j-Km5n" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/7/reset-password/",
      expect.objectContaining({ method: "POST", idempotencyKey: KEY }),
    );
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Kamida bitta faol menejer qolishi kerak. Avval boshqa xodimni menejer qiling.",
        errors: [],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(await setStaffActive("1", false, KEY, CSRF)).toEqual({
      ok: false,
      error: "Kamida bitta faol menejer qolishi kerak. Avval boshqa xodimni menejer qiling.",
      code: "conflict",
    });
    // A demo id never reaches the API.
    const calls = apiFetch.mock.calls.length;
    expect(
      await setStaffActive("draft-6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f", false, KEY, CSRF),
    ).toMatchObject({ code: "not_found" });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});
