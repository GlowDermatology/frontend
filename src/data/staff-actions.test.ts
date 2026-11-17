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

const cookieLocale = vi.hoisted(() => ({ value: undefined as string | undefined }));
const env = vi.hoisted(() => ({ emailInvite: true }));

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
// The admin language comes from `gd_admin_language` (Uzbek without it).
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "gd_admin_language" && cookieLocale.value
        ? { value: cookieLocale.value }
        : undefined,
  }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/env.server", async (original) => {
  const actual = await original<typeof import("@/lib/env.server")>();
  return {
    ...actual,
    serverEnv: { ...actual.serverEnv, mockEmailInvite: () => env.emailInvite },
  };
});
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
import {
  inviteStaff,
  resetStaffPassword,
  sendStaffPasswordLink,
  setStaffActive,
  updateStaff,
} from "./staff.actions";

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
  must_change_password: true,
  password_changed_at: null,
  mfa_enabled: false,
  invite: { state: "none" as const, sent_at: null, expires_at: null },
};

const TEMP = { delivery: "temporary_password" as const };

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  cookieLocale.value = undefined;
  env.emailInvite = true;
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
      "Malika Rahimova",
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
      { email: " New@GlowDerma.uz ", fullName: "Yangi Xodim", isManager: false, ...TEMP },
      KEY,
      CSRF,
    );
    expect(invited).toMatchObject({
      ok: true,
      data: { staff: { email: "new@glowderma.uz", mustChangePassword: true }, activation: null },
    });
    if (invited.ok) {
      expect(invited.data.temporaryPassword).toMatch(
        /^[A-HJ-NP-Za-km-z2-9]{4}(-[A-HJ-NP-Za-km-z2-9]{4}){3}$/,
      );
    }
    expect(
      await inviteStaff(
        { email: "dilnoza@glowderma.uz", fullName: "Dilnoza", isManager: false, ...TEMP },
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
      await inviteStaff({ email: "x", fullName: "A", isManager: false, ...TEMP }, KEY, CSRF),
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
    expect(await resetStaffPassword("1", TEMP, KEY, CSRF)).toMatchObject({
      ok: false,
      error: "O‘z parolingizni «Parolni o‘zgartirish» orqali almashtiring.",
    });
    expect(await setStaffActive("2", false, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "2", isActive: false },
    });
    expect(await resetStaffPassword("3", TEMP, KEY, CSRF)).toMatchObject({
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
        must_change_password: null,
        invite: null,
      }),
    ).toMatchObject({
      fullName: "",
      isManager: false,
      linkedProviders: [],
      createdAt: null,
      mustChangePassword: false,
      invite: null,
    });
  });

  it("posts the invitation with the key and keeps the password for the dialog", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(201, { staff: member, temporary_password: "Kp7m-Qx3r-Wt9z-Hn2v", activation: null }),
    );
    expect(
      await inviteStaff(
        { email: "Nodira@glowderma.uz", fullName: "Nodira Rahimova", isManager: false, ...TEMP },
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
        body: {
          email: "nodira@glowderma.uz",
          full_name: "Nodira Rahimova",
          is_manager: false,
          delivery: "temporary_password",
          language: "uz",
        },
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
      respond(200, { staff: member, temporary_password: "Ab2c-De3f-Gh4j-Km5n", activation: null }),
    );
    expect(await resetStaffPassword("7", TEMP, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { temporaryPassword: "Ab2c-De3f-Gh4j-Km5n" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/7/reset-password/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: { delivery: "temporary_password" },
      }),
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

describe("password delivery (DESIGN §E)", () => {
  it("e-mails a demo link, both, or refuses e-mail without the capability", async () => {
    const linked = await inviteStaff(
      {
        email: "link@glowderma.uz",
        fullName: "Havola Xodim",
        isManager: false,
        delivery: "email_link",
      },
      KEY,
      CSRF,
    );
    expect(linked).toMatchObject({
      ok: true,
      data: {
        temporaryPassword: null,
        activation: { sent: true, demo: true, expiresAt: expect.any(String) },
        staff: { mustChangePassword: true, invite: { state: "pending" } },
      },
    });
    const both = await resetStaffPassword("3", { delivery: "both" }, KEY, CSRF);
    expect(both).toMatchObject({
      ok: true,
      data: { temporaryPassword: expect.any(String), activation: { sent: true } },
    });
    env.emailInvite = false;
    expect(await resetStaffPassword("3", { delivery: "email_link" }, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "validation_error",
      fieldErrors: {
        delivery: "E-pochta orqali yuborish sozlanmagan: vaqtinchalik parolni tanlang.",
      },
    });
    expect(await resetStaffPassword("3", { delivery: "sms" } as never, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { delivery: "Kirish usulini tanlang." },
    });
  });

  it("resends a link, refusing oneself, an inactive account and no e-mail", async () => {
    expect(await sendStaffPasswordLink("3", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { temporaryPassword: null, staff: { id: "3", invite: { state: "pending" } } },
    });
    expect(await sendStaffPasswordLink("1", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "conflict",
      error: "O‘zingizga havola «Parolni o‘zgartirish» sahifasidan so‘raladi.",
    });
    expect(await sendStaffPasswordLink("4", KEY, CSRF)).toMatchObject({
      ok: false,
      error: "Nofaol hisobga havola yuborilmaydi. Avval uni qayta faollashtiring.",
    });
    env.emailInvite = false;
    expect(await sendStaffPasswordLink("3", KEY, CSRF)).toMatchObject({
      ok: false,
      error: "E-pochta orqali yuborish sozlanmagan.",
    });
    expect(await sendStaffPasswordLink("3", "not-a-key", CSRF)).toMatchObject({
      ok: false,
      error: "Noto‘g‘ri so‘rov kaliti.",
    });
  });

  it("speaks the admin language: schema messages and the demo's refusals", async () => {
    cookieLocale.value = "ru";
    expect(
      await inviteStaff({ email: "x", fullName: "A", isManager: false, ...TEMP }, KEY, CSRF),
    ).toMatchObject({
      ok: false,
      error: "Проверьте поля.",
      fieldErrors: { fullName: "Введите не менее 2 символов." },
    });
    cookieLocale.value = "en";
    expect(await setStaffActive("1", false, KEY, CSRF)).toMatchObject({
      error: "You cannot deactivate your own account.",
    });
  });

  it("posts the delivery and the inviter's language, and maps the link answers", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    cookieLocale.value = "ru";
    const activation = { sent: true, expires_at: "2026-10-30T10:00:00+05:00" };
    apiFetch.mockResolvedValueOnce(
      respond(201, {
        staff: {
          ...member,
          invite: { state: "pending", sent_at: null, expires_at: activation.expires_at },
        },
        temporary_password: null,
        activation,
      }),
    );
    expect(
      await inviteStaff(
        { email: "n@glowderma.uz", fullName: "Nodira", isManager: true, delivery: "email_link" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: true,
      data: {
        temporaryPassword: null,
        activation: { sent: true, expiresAt: activation.expires_at },
        staff: { invite: { state: "pending", expiresAt: activation.expires_at } },
      },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/",
      expect.objectContaining({
        body: expect.objectContaining({ delivery: "email_link", language: "ru" }),
      }),
    );
    apiFetch.mockResolvedValueOnce(respond(200, { staff: member, activation }));
    expect(await sendStaffPasswordLink("7", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { temporaryPassword: null, activation: { expiresAt: activation.expires_at } },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/7/send-password-link/",
      expect.objectContaining({ method: "POST", idempotencyKey: KEY }),
    );
    // An unknown invite state from a newer backend reads as none.
    expect(
      mapStaffRow({
        ...member,
        invite: { state: "later" as never, sent_at: null, expires_at: null },
      }).invite,
    ).toEqual({ state: "none", sentAt: null, expiresAt: null });
    expect(mapStaffRow({ ...member, mfa_enabled: true }).mfaEnabled).toBe(true);
  });
});
