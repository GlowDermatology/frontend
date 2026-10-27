import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * Specialists, services, schedules and the clinic (contract §2.17, gap
 * FND-1): mappers against a recorded specialist, the demo's refusals, and
 * the api branch's requests (only changed fields, `force`, keys, remaps).
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

import specialistFixture from "./api/__fixtures__/specialist-2.json";
import { ApiError } from "./api/errors";
import {
  mapClinicSpecialist,
  specialistFormValues,
  specialistListParams,
  specialistPatchBody,
  workingWeekBody,
} from "./api/mappers/clinic";
import type { ApiClinicSpecialist, ErrorEnvelope } from "./api/types";
import {
  createBlock,
  createOverride,
  saveOfferedServices,
  saveWorkingHours,
  updateSpecialist,
} from "./clinic.actions";
import { workingWeekSchema } from "./clinic.schema";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const jasur = mapClinicSpecialist(specialistFixture as unknown as ApiClinicSpecialist);

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

describe("clinic mappers", () => {
  it("maps the recorded specialist with its offers and week", () => {
    expect(jasur).toMatchObject({
      id: "2",
      name: "Jasur Aliyev",
      role: "dermatologist",
      slotStepMin: 30,
      isActive: true,
      staffUser: null,
      services: [
        { serviceId: "1", shortName: "Konsultatsiya", price: 120_000, durationMin: 30 },
        { serviceId: "2", price: 90_000, durationMin: 20 },
      ],
    });
    expect(jasur.workingHours[0]).toEqual({
      weekday: 0,
      start: "09:00",
      end: "18:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    });
  });

  it("renames the list filters and sends only changed profile fields", () => {
    expect(
      specialistListParams({
        q: "jas",
        status: "inactive",
        role: "dermatologist",
        sort: "position",
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({
      search: "jas",
      is_active: false,
      role: "dermatologist",
      ordering: undefined,
      page: 2,
      page_size: 50,
    });
    const base = specialistFormValues(jasur);
    expect(specialistPatchBody(base, base)).toEqual({});
    expect(
      specialistPatchBody(
        base,
        { ...base, qualifications: { ...base.qualifications, ru: "Врач" }, isActive: false },
        true,
      ),
    ).toEqual({ qualifications: { ru: "Врач" }, is_active: false, force: true });
    // `force` only travels with a deactivation.
    expect(specialistPatchBody(base, { ...base, name: "Jasur A." }, true)).toEqual({
      name: "Jasur A.",
    });
  });

  it("validates the week (grid, order, break inside) and sends it by weekday", () => {
    const day = { weekday: 2, start: "09:00", end: "18:00", breakStart: null, breakEnd: null };
    expect(workingWeekSchema.safeParse({ days: [{ ...day, start: "09:03" }] }).success).toBe(false);
    const late = workingWeekSchema.safeParse({
      days: [{ ...day, breakStart: "17:30", breakEnd: "18:30" }],
    });
    expect(late.success || late.error.issues[0]?.message).toBe(
      "Tanaffus ish vaqti ichida bo‘lsin.",
    );
    expect(
      workingWeekBody({ days: [day, { ...day, weekday: 0 }] }).days.map((d) => d.weekday),
    ).toEqual([0, 2]);
  });
});

describe("clinic actions in mock mode", () => {
  it("refuses a deactivation with appointments ahead unless forced", async () => {
    const base = specialistFormValues(jasur);
    const refused = await updateSpecialist(
      "2",
      { ...base, isActive: false },
      base,
      false,
      KEY,
      CSRF,
    );
    expect(refused).toMatchObject({ ok: false, code: "conflict" });
    if (!refused.ok) expect(refused.error).toMatch(/^Mutaxassisda 10 ta kelgusi qabul bor/);
    expect(
      await updateSpecialist("2", { ...base, isActive: false }, base, true, KEY, CSRF),
    ).toMatchObject({
      ok: true,
      data: { isActive: false },
    });
  });

  it("answers the schedule rules: past dates, a taken date, overlapping blocks", async () => {
    const override = { date: "2026-10-20", dayOff: true, start: "", end: "", note: "" };
    expect(await createOverride("2", override, KEY, CSRF)).toMatchObject({
      fieldErrors: { date: "O‘tgan sanani tanlab bo‘lmaydi." },
    });
    expect(await createOverride("2", { ...override, date: "2026-10-31" }, KEY, CSRF)).toMatchObject(
      {
        fieldErrors: { date: "Bu sana uchun alohida jadval allaqachon bor." },
      },
    );
    expect(
      await createOverride(
        "2",
        { ...override, date: "2026-11-02", dayOff: false, start: "10:00", end: "14:00" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: true,
      data: { date: "2026-11-02", start: "10:00", end: "14:00", dayOff: false },
    });
    const block = {
      startDate: "2026-10-26",
      startTime: "16:15",
      endDate: "2026-10-26",
      endTime: "17:00",
      kind: "busy" as const,
      label: "",
    };
    expect(await createBlock("1", block, KEY, CSRF)).toMatchObject({
      fieldErrors: { startTime: "Bu vaqt boshqa band vaqt bilan kesishadi." },
    });
    expect(await createBlock("1", { ...block, startTime: "16:30" }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { start: "2026-10-26T16:30:00+05:00", end: "2026-10-26T17:00:00+05:00", label: null },
    });
  });

  it("refuses a duplicate offer before the round trip", async () => {
    const row = { serviceId: "1", price: 100_000, durationMin: null, isActive: true };
    expect(await saveOfferedServices("1", { services: [row, row] }, KEY, CSRF)).toMatchObject({
      fieldErrors: { "services.1.serviceId": "Bu xizmat ro‘yxatda ikki marta berilgan." },
    });
  });
});

describe("clinic actions in api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("PATCHes with force after the 409 and maps the conflict message", async () => {
    const base = specialistFormValues(jasur);
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Mutaxassisda 10 ta kelgusi qabul bor.",
        errors: [],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(
      await updateSpecialist("2", { ...base, isActive: false }, base, false, KEY, CSRF),
    ).toMatchObject({
      ok: false,
      code: "conflict",
    });
    apiFetch.mockResolvedValueOnce(respond(200, { ...specialistFixture, is_active: false }));
    await updateSpecialist("2", { ...base, isActive: false }, base, true, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialists/2/",
      expect.objectContaining({
        method: "PATCH",
        body: { is_active: false, force: true },
        idempotencyKey: KEY,
      }),
    );
  });

  it("PUTs the week and the offers, and keeps the API's indexed field errors", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, specialistFixture));
    await saveWorkingHours(
      "2",
      { days: [{ weekday: 1, start: "10:00", end: "15:00", breakStart: null, breakEnd: null }] },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialists/2/working-hours/",
      expect.objectContaining({
        method: "PUT",
        body: {
          days: [{ weekday: 1, start: "10:00", end: "15:00", break_start: null, break_end: null }],
        },
      }),
    );
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "services.0.duration_min",
            code: "invalid",
            message: "Davomiylik 5 daqiqaga karrali bo‘lsin.",
          },
        ],
        request_id: "r",
      } as ErrorEnvelope),
    );
    expect(
      await saveOfferedServices(
        "2",
        { services: [{ serviceId: "1", price: 1, durationMin: 30, isActive: true }] },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      fieldErrors: { "services.0.durationMin": "Davomiylik 5 daqiqaga karrali bo‘lsin." },
    });
    // A demo draft id never reaches the API.
    const calls = apiFetch.mock.calls.length;
    expect(await saveWorkingHours(`draft-${KEY}`, { days: [] }, KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
    expect(apiFetch).toHaveBeenCalledTimes(calls);
  });
});
