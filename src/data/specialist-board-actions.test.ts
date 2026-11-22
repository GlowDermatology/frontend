import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Me } from "./api/auth";
import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The specialist's own appointments board (`specialist/appointments/…`): the callers it allows,
 * the exact routes, bodies and Idempotency-Key, and the field remaps of the booking dialog.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const getMe = vi.fn<() => Promise<Partial<Me> | null>>();
const refresh = vi.fn();
const apiFetch = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh(), updateTag: vi.fn() }));
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

import { ApiError } from "./api/errors";
import type { ErrorEnvelope } from "./api/types";
import {
  cancelMyAppointment,
  createMyAppointment,
  loadMyAppointmentDay,
  rescheduleMyAppointment,
  updateMyAppointment,
} from "./specialist-board.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

/** A `SpecialistAppointmentItem`: no customer e-mail, the customer's note and the allowed actions. */
const item = {
  id: 41,
  specialist_id: 2,
  location: { id: 1, name: "Glow Derma klinikasi", address: "Toshkent" },
  customer: { id: 7, name: "Malika", phone: "+998901234567" },
  customer_note: "Allergiyam bor",
  allowed_actions: ["reschedule", "cancel"],
  service_id: 3,
  service_name: "Dermatolog konsultatsiyasi",
  service_short_name: "Konsultatsiya",
  duration_min: 30,
  start: "2026-12-01T10:00:00+05:00",
  end: "2026-12-01T10:30:00+05:00",
  price: 120_000,
  status: "confirmed",
  requested_at: "2026-11-22T09:00:00+05:00",
  requested_via: "admin",
};

const errorOf = (status: number, body: Partial<ErrorEnvelope>) =>
  new ApiError(status, { message: "", errors: [], request_id: "r", ...body } as ErrorEnvelope);

beforeEach(() => {
  process.env.GLOWDERMA_DATA_SOURCE = "api";
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  getMe.mockReset();
  getMe.mockResolvedValue({ role: "specialist" } as Partial<Me>);
  refresh.mockClear();
  apiFetch.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("the specialist's own board", () => {
  const create = {
    specialistId: "2",
    serviceId: "3",
    locationId: "1",
    phone: "+998901234567",
    name: "Malika Karimova",
    date: "2026-12-01",
    time: "10:00",
    note: "never sent",
  };

  it("books a walk-in by phone and name, without a specialist or a note", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, item));
    expect(await createMyAppointment(create, KEY, CSRF)).toMatchObject({
      ok: true,
      data: {
        id: "41",
        customer: { id: "7", name: "Malika", phone: "+998901234567" },
        customerNote: "Allergiyam bor",
        allowedActions: ["reschedule", "cancel"],
      },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/appointments/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: {
          service_id: 3,
          location_id: 1,
          phone: "+998901234567",
          start: "2026-12-01T10:00:00+05:00",
          name: "Malika Karimova",
        },
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("puts the server's errors on the dialog's fields", async () => {
    apiFetch.mockRejectedValueOnce(
      errorOf(400, {
        code: "validation_error",
        errors: [{ field: "name", code: "required", message: "Mijoz ismini kiriting." }],
      }),
    );
    expect(await createMyAppointment({ ...create, name: "" }, KEY, CSRF)).toMatchObject({
      fieldErrors: { name: "Mijoz ismini kiriting." },
    });
    apiFetch.mockRejectedValueOnce(errorOf(409, { code: "conflict", message: "Bu vaqt band." }));
    expect(await createMyAppointment(create, KEY, CSRF)).toMatchObject({
      code: "conflict",
      fieldErrors: { time: "Bu vaqt band." },
    });
  });

  it("confirms, moves with the customer's agreement and cancels on the own routes", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, item));
    await updateMyAppointment("41", "confirm", KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/appointments/41/confirm/",
      expect.objectContaining({ method: "POST", idempotencyKey: KEY }),
    );
    apiFetch.mockRejectedValueOnce(
      errorOf(400, {
        code: "validation_error",
        errors: [{ field: "customer_agreed", code: "required", message: "Mijoz roziligi kerak." }],
      }),
    );
    expect(
      await rescheduleMyAppointment(
        "41",
        { specialistId: "9", serviceId: "8", locationId: "2", date: "2026-12-02", time: "11:00" },
        "2",
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { customerAgreed: "Mijoz roziligi kerak." } });
    // The specialist and the service never change on a specialist's move.
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/appointments/41/reschedule/",
      expect.objectContaining({
        body: { start: "2026-12-02T11:00:00+05:00", location_id: 2, customer_agreed: false },
      }),
    );
    apiFetch.mockResolvedValueOnce(respond(200, { ...item, status: "cancelled" }));
    expect(await cancelMyAppointment("41", { reason: " Kasal " }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { status: "cancelled" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/appointments/41/cancel/",
      expect.objectContaining({ body: { reason: "Kasal" }, idempotencyKey: KEY }),
    );
  });

  it("reads another day without a key", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, { date: "2026-12-02", specialists: [], appointments: [item] }),
    );
    expect(await loadMyAppointmentDay("2026-12-02", CSRF)).toMatchObject({
      ok: true,
      data: { date: "2026-12-02", appointments: [{ id: "41" }] },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/specialist/appointments/",
      expect.objectContaining({ query: { date: "2026-12-02" } }),
    );
  });

  it("refuses staff, mock mode, a bad key and a bad id without a call", async () => {
    getMe.mockResolvedValueOnce({ role: "admin" } as Partial<Me>);
    expect(await updateMyAppointment("41", "attend", KEY, CSRF)).toMatchObject({
      code: "permission_denied",
    });
    verifyStaff.mockResolvedValueOnce({ ok: true, mode: "mock" });
    expect(await loadMyAppointmentDay("2026-12-02", CSRF)).toMatchObject({
      code: "permission_denied",
    });
    expect(await updateMyAppointment("41", "attend", "nope", CSRF)).toMatchObject({ ok: false });
    expect(await cancelMyAppointment("s-1", { reason: "" }, KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
