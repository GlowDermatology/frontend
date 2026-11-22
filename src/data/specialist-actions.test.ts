import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Me } from "./api/auth";
import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * Specialist accounts and profiles in api mode: Staff → Add employee → Specialist
 * (`specialists/invite/`), the confirmed Staff ↔ Specialist change (`staff/{id}/specialist-role/`)
 * and the specialist's own profile, schedule and services (`specialist/…`), with the callers each
 * one allows.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const getMe = vi.fn<() => Promise<Partial<Me> | null>>();
const refresh = vi.fn();
const apiFetch = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
const updateTag = vi.fn();
vi.mock("next/cache", () => ({
  refresh: () => refresh(),
  updateTag: (tag: string) => updateTag(tag),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  getMe: () => getMe(),
  requireApiToken: async () => "t",
}));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: vi.fn(),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import specialistFixture from "./api/__fixtures__/specialist-2.json";
import { ApiError } from "./api/errors";
import { mapClinicSpecialist, specialistFormValues } from "./api/mappers/clinic";
import type { ApiClinicSpecialist, ErrorEnvelope } from "./api/types";
import { EMPTY_SPECIALIST_SERVICE } from "./clinic.schema";
import {
  changeSpecialistRole,
  createMyBlock,
  deleteMyScheduleEntry,
  deleteMyService,
  inviteSpecialist,
  saveMyService,
  saveMyWorkingHours,
  setMyProfilePhoto,
  setMyServiceActive,
  updateMyProfile,
} from "./specialist.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

const account = {
  id: 12,
  display_name: "Jasur Aliyev",
  email: "jasur@glowderma.uz",
  full_name: "Jasur Aliyev",
  is_active: true,
  is_manager: false,
  is_superuser: false,
  has_ops_console_access: false,
  role: "specialist" as const,
  last_login_at: null,
  linked_providers: [],
  created_at: "2026-11-20T10:15:00+05:00",
  must_change_password: true,
  password_changed_at: null,
  mfa_enabled: false,
  invite: { state: "pending" as const, sent_at: null, expires_at: null },
};

const manager = {
  role: "admin" as const,
  is_manager: true,
  is_superuser: false,
  capabilities: { staff_email_invite: false },
} as unknown as Partial<Me>;

beforeEach(() => {
  process.env.GLOWDERMA_DATA_SOURCE = "api";
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  getMe.mockReset();
  getMe.mockResolvedValue(manager);
  refresh.mockClear();
  updateTag.mockClear();
  apiFetch.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("inviting a Specialist", () => {
  const values = {
    email: "Jasur@GlowDerma.uz",
    fullName: "Jasur Aliyev",
    isManager: false,
    delivery: "temporary_password" as const,
  };

  it("posts to specialists/invite/ and keeps the credentials and the draft profile id", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(201, {
        staff: account,
        temporary_password: "Kp7m-Qx3r-Wt9z-Hn2v",
        activation: null,
        specialist_id: 31,
      }),
    );
    expect(await inviteSpecialist(values, KEY, CSRF)).toMatchObject({
      ok: true,
      data: {
        temporaryPassword: "Kp7m-Qx3r-Wt9z-Hn2v",
        specialistId: "31",
        staff: { id: "12", isSpecialist: true },
      },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialists/invite/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        // No `is_manager` and no profile id: the endpoint creates both.
        body: {
          email: "jasur@glowderma.uz",
          full_name: "Jasur Aliyev",
          delivery: "temporary_password",
          language: "uz",
        },
      }),
    );
  });

  it("maps a duplicate email onto the field and refuses without the manager role", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "email", code: "unique", message: "Bu email band." }],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(await inviteSpecialist(values, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { email: "Bu email band." },
    });
    const calls = apiFetch.mock.calls.length;
    getMe.mockResolvedValueOnce({ ...manager, is_manager: false });
    expect(await inviteSpecialist(values, KEY, CSRF)).toMatchObject({
      code: "permission_denied",
    });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});

describe("Staff ↔ Specialist", () => {
  it("sends only the role and the confirmation, and returns the visits left", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        account: { ...account, role: "admin" },
        specialist_id: 31,
        upcoming_appointments: 3,
      }),
    );
    expect(await changeSpecialistRole("12", "staff", KEY, CSRF)).toEqual({
      ok: true,
      data: {
        staff: expect.objectContaining({ id: "12", isManager: false }),
        specialistId: "31",
        upcomingAppointments: 3,
      },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/staff/12/specialist-role/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: { role: "staff", confirmed: true },
      }),
    );
    const [, request] = apiFetch.mock.lastCall as [string, { body: Record<string, unknown> }];
    expect(request.body).not.toHaveProperty("specialist_id");
  });

  it("shows the server's 409 message and refuses a bad role or caller", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Kamida bitta faol menejer qolishi kerak.",
        errors: [],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(await changeSpecialistRole("12", "specialist", KEY, CSRF)).toEqual({
      ok: false,
      error: "Kamida bitta faol menejer qolishi kerak.",
      code: "conflict",
    });
    const calls = apiFetch.mock.calls.length;
    expect(
      await changeSpecialistRole("12", "manager" as unknown as "staff", KEY, CSRF),
    ).toMatchObject({ ok: false });
    getMe.mockResolvedValueOnce({ ...manager, is_manager: false });
    expect(await changeSpecialistRole("12", "staff", KEY, CSRF)).toMatchObject({
      code: "permission_denied",
    });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});

describe("the specialist's own profile", () => {
  beforeEach(() => getMe.mockResolvedValue({ role: "specialist" } as Partial<Me>));
  const own = { ...specialistFixture, clinics: [] };
  const baseline = specialistFormValues(
    mapClinicSpecialist(specialistFixture as unknown as ApiClinicSpecialist),
  );

  it("patches only what changed, never the clinics, and publishes with force", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, { ...own, name: "Dr. Jasur", is_active: false }));
    const values = {
      ...baseline,
      name: " Dr. Jasur ",
      bio: { ...baseline.bio, ru: "Врач-дерматолог" },
      slotStepMin: 15 as const,
      // A specialist cannot assign clinics: a changed list is never sent.
      locationIds: ["1", "2"],
      isActive: false,
    };
    expect(await updateMyProfile(values, baseline, true, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "2", name: "Dr. Jasur", isActive: false },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/profile/",
      expect.objectContaining({
        method: "PATCH",
        idempotencyKey: KEY,
        body: {
          name: "Dr. Jasur",
          bio: { ru: "Врач-дерматолог" },
          slot_step_min: 15,
          is_active: false,
          force: true,
        },
      }),
    );
    expect(updateTag).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the server's 409 on publishing an incomplete profile", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Profilni e’lon qilish uchun to‘ldiring: rasm.",
        errors: [],
        request_id: "r",
      } as ErrorEnvelope),
    );
    const draft = { ...baseline, isActive: false };
    expect(
      await updateMyProfile({ ...draft, isActive: true }, draft, false, KEY, CSRF),
    ).toMatchObject({ ok: false, code: "conflict" });
  });

  it("uploads and removes the own photo, and refuses any other account", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, own));
    const form = new FormData();
    form.set("photo", new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" }));
    expect(await setMyProfilePhoto(form, KEY, CSRF)).toMatchObject({ ok: true });
    const [path, request] = apiFetch.mock.lastCall as [
      string,
      { method: string; formData: FormData },
    ];
    expect(path).toBe("/api/v1/admin/specialist/profile/photo/");
    expect(request.method).toBe("PUT");
    expect(request.formData.get("file")).toBeInstanceOf(File);
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await setMyProfilePhoto(null, KEY, CSRF)).toEqual({ ok: true, data: null });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/profile/photo/",
      expect.objectContaining({ method: "DELETE", idempotencyKey: KEY }),
    );
    const calls = apiFetch.mock.calls.length;
    getMe.mockResolvedValueOnce(manager);
    expect(await updateMyProfile(baseline, baseline, false, KEY, CSRF)).toMatchObject({
      code: "permission_denied",
    });
    // Mock mode is always an administrator: no specialist write there either.
    verifyStaff.mockResolvedValueOnce({ ok: true, mode: "mock" });
    expect(await deleteMyService("3", KEY, CSRF)).toMatchObject({ code: "permission_denied" });
    // A bad key never reaches the API.
    expect(await saveMyWorkingHours({ days: [] }, "nope", CSRF)).toMatchObject({ ok: false });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});

describe("the specialist's own schedule and services", () => {
  beforeEach(() => getMe.mockResolvedValue({ role: "specialist" } as Partial<Me>));
  const own = { ...specialistFixture, clinics: [] };

  it("writes the week, a block and deletes an entry with the key", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, own));
    expect(await saveMyWorkingHours({ days: [] }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "2" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/weekly-hours/",
      expect.objectContaining({ method: "PUT", idempotencyKey: KEY, body: { days: [] } }),
    );
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "start", code: "invalid", message: "Kesishadi." }],
        request_id: "r",
      } as ErrorEnvelope),
    );
    const block = {
      startDate: "2026-12-01",
      startTime: "10:00",
      endDate: "2026-12-01",
      endTime: "11:00",
      kind: "busy" as const,
      label: "",
    };
    expect(await createMyBlock(block, KEY, CSRF)).toMatchObject({
      fieldErrors: { startTime: "Kesishadi." },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/blocks/",
      expect.objectContaining({
        method: "POST",
        body: {
          start: "2026-12-01T10:00:00+05:00",
          end: "2026-12-01T11:00:00+05:00",
          kind: "busy",
          label: null,
        },
      }),
    );
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await deleteMyScheduleEntry("override", "7", KEY, CSRF)).toEqual({
      ok: true,
      data: { id: "7" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/overrides/7/",
      expect.objectContaining({ method: "DELETE", idempotencyKey: KEY }),
    );
  });

  it("creates, toggles and deletes an own service", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, own));
    const values = {
      ...EMPTY_SPECIALIST_SERVICE,
      name: { uz: "Lazer terapiya", ru: "", en: "" },
      price: 200_000,
      durationMin: 45,
    };
    expect(await saveMyService(null, values, null, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { services: [{ id: "3" }, { id: "4" }] },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/services/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: expect.objectContaining({ price: 200_000, duration_min: 45 }),
      }),
    );
    apiFetch.mockResolvedValueOnce(respond(200, own));
    await setMyServiceActive("4", false, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/services/4/",
      expect.objectContaining({ method: "PATCH", body: { is_active: false } }),
    );
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Bu xizmatga qabullar bor.",
        errors: [],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(await deleteMyService("4", KEY, CSRF)).toMatchObject({ code: "conflict" });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/services/4/",
      expect.objectContaining({ method: "DELETE", idempotencyKey: KEY }),
    );
    const calls = apiFetch.mock.calls.length;
    expect(await deleteMyService("draft-1", KEY, CSRF)).toMatchObject({ code: "not_found" });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});
