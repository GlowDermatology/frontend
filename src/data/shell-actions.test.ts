import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The F2b Server Actions (appointment dialogs, notification templates,
 * groups, settings, password) in both modes: mock bodies answer the
 * backend's codes and messages from the fixtures; api branches send the
 * documented request (path, method, key, body with only the changed fields),
 * map the answer, remap field errors and refresh the route after a success.
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

import dayFixture from "./api/__fixtures__/appointments-day.json";
import slotErrorFixture from "./api/__fixtures__/err-appointment-slot.json";
import phoneErrorFixture from "./api/__fixtures__/err-notification-phone.json";
import segmentDeleteFixture from "./api/__fixtures__/err-segment-delete.json";
import placeholderErrorFixture from "./api/__fixtures__/err-template-placeholder.json";
import sendStartedFixture from "./api/__fixtures__/err-notification-send-started.json";
import cancelledFixture from "./api/__fixtures__/notification-cancelled.json";
import notificationsPageFixture from "./api/__fixtures__/notifications-page.json";
import segmentsFixture from "./api/__fixtures__/segments-page.json";
import settingsFixture from "./api/__fixtures__/settings.json";
import templateFixture from "./api/__fixtures__/template-processing.json";
import { ApiError } from "./api/errors";
import type { ErrorEnvelope } from "./api/types";
import {
  cancelAppointment,
  createAppointment,
  loadAppointmentDay,
  rescheduleAppointment,
  updateAppointment,
} from "./appointments.actions";
import {
  cancelNotification,
  sendNotification,
  updateNotificationTemplate,
} from "./notifications.actions";
import {
  addSegmentMembers,
  createSegment,
  deleteSegment,
  removeSegmentMember,
  updateSegment,
} from "./segments.actions";
import {
  changePassword,
  publishTerms,
  unlinkSocialAccount,
  updateContacts,
  updateLegalTexts,
  updateSettings,
} from "./settings.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const apiError = (status: number, body: unknown) => new ApiError(status, body as ErrorEnvelope);
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

const booking = {
  specialistId: "s-1",
  serviceId: "1",
  phone: "+998901234567",
  date: "2026-10-26",
  time: "09:30",
  note: "",
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

describe("appointment dialogs in mock mode", () => {
  it("creates a confirmed admin visit for a customer found by phone", async () => {
    const result = await createAppointment(booking, KEY, CSRF);
    expect(result).toMatchObject({
      ok: true,
      data: {
        specialistId: "s-1",
        customer: { id: "5", name: "Malika Karimova" },
        serviceId: "1",
        service: "Dermatolog konsultatsiyasi",
        durationMin: 30,
        start: "2026-10-26T09:30:00+05:00",
        end: "2026-10-26T10:00:00+05:00",
        price: 150_000,
        status: "confirmed",
        requestedVia: "administrator",
      },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("answers the backend's field codes: taken slot, outside hours, past, grid, phone, service", async () => {
    const field = async (patch: Partial<typeof booking>) =>
      (await createAppointment({ ...booking, ...patch }, KEY, CSRF)) as { fieldErrors?: object };
    // Kamola's requested visit holds 09:00–09:30 with Nodira.
    expect((await field({ time: "09:00" })).fieldErrors).toEqual({ time: "Bu vaqt band." });
    // Nodira's 16:00–16:30 "Band qilingan" block.
    expect((await field({ time: "16:15" })).fieldErrors).toEqual({ time: "Bu vaqt band." });
    expect((await field({ time: "17:45" })).fieldErrors).toEqual({
      time: "Mutaxassis bu vaqtda ishlamaydi.",
    });
    expect((await field({ date: "2026-10-23" })).fieldErrors).toEqual({
      time: "Kelajakdagi vaqtni tanlang.",
    });
    expect((await field({ time: "09:32" })).fieldErrors).toEqual({
      time: "Vaqt 5 daqiqalik qadamda bo‘lsin.",
    });
    expect((await field({ phone: "+998900000001" })).fieldErrors).toEqual({
      phone: "Bu raqam bilan mijoz topilmadi.",
    });
    expect((await field({ phone: "+99890" })).fieldErrors).toEqual({
      phone: "Telefon raqamini to‘g‘ri kiriting.",
    });
    expect((await field({ serviceId: "3" })).fieldErrors).toEqual({
      serviceId: "Mutaxassis bu xizmatni ko‘rsatmaydi.",
    });
    expect((await field({ note: "x".repeat(301) })).fieldErrors).toEqual({
      note: "300 belgidan oshmasin.",
    });
  });

  it("reschedules (re-snapshotting price with another specialist) and cancels", async () => {
    // a2: Aziza, Nodira, Qayta ko‘rik 11:00–11:20, 100 000.
    const moved = await rescheduleAppointment(
      "a2",
      { specialistId: "s-2", date: "2026-10-26", time: "11:30" },
      "s-1",
      KEY,
      CSRF,
    );
    expect(moved).toMatchObject({
      ok: true,
      data: {
        id: "a2",
        specialistId: "s-2",
        start: "2026-10-26T11:30:00+05:00",
        end: "2026-10-26T11:50:00+05:00",
        price: 90_000,
        status: "confirmed",
      },
    });
    // The visit's own slot is not an overlap.
    expect(
      await rescheduleAppointment(
        "a2",
        { specialistId: "s-1", date: "2026-10-26", time: "11:05" },
        "s-1",
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: true, data: { price: 100_000, end: "2026-10-26T11:25:00+05:00" } });
    // Dilnoza does not offer the dermatology follow-up.
    expect(
      await rescheduleAppointment(
        "a2",
        { specialistId: "s-3", date: "2026-10-26", time: "14:00" },
        "s-1",
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { specialistId: "Mutaxassis bu xizmatni ko‘rsatmaydi." } });

    expect(await cancelAppointment("a2", { reason: "Mijoz so‘radi" }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "a2", status: "cancelled" },
    });
    const attended = "g-2026-10-23-0-0";
    expect(await cancelAppointment(attended, { reason: "" }, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
    expect(await cancelAppointment("a2", { reason: "x".repeat(301) }, KEY, CSRF)).toMatchObject({
      fieldErrors: { reason: "300 belgidan oshmasin." },
    });
  });

  it("refuses a missing csrf token and a malformed key before doing anything", async () => {
    expect(await createAppointment(booking, KEY, "")).toMatchObject({ code: "csrf" });
    expect(await createAppointment(booking, "not-a-uuid", CSRF)).toMatchObject({ ok: false });
    expect(verifyStaff).toHaveBeenCalledTimes(1);
  });

  it("loads another day's schedule for the dialog", async () => {
    expect(await loadAppointmentDay("2026-10-27", CSRF)).toMatchObject({
      ok: true,
      data: { date: "2026-10-27" },
    });
    expect(await loadAppointmentDay("27.10.2026", CSRF)).toMatchObject({ ok: false });
  });
});

describe("appointment actions in api mode", () => {
  const item = dayFixture.appointments[0]!;

  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("confirms with the key and refreshes; 409 invalid_transition keeps its message", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, { ...item, status: "confirmed" }));
    expect(await updateAppointment("1", "confirm", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "1", status: "confirmed" },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/appointments/1/confirm/",
      expect.objectContaining({ method: "POST", idempotencyKey: KEY, token: "t" }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);

    apiFetch.mockRejectedValueOnce(
      apiError(409, {
        code: "invalid_transition",
        message: "Bu amal ushbu holatda mumkin emas.",
        errors: [],
        request_id: "r",
      }),
    );
    expect(await updateAppointment("1", "attend", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu amal ushbu holatda mumkin emas.",
      code: "invalid_transition",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await updateAppointment("a1", "confirm", KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
  });

  it("creates with an aware Tashkent start and the phone; slot errors and races land on the time", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(201, { ...item, id: 77, status: "confirmed", requested_via: "admin" }),
    );
    const result = await createAppointment(
      { ...booking, specialistId: "1", note: " Qo‘ng‘iroq qildi " },
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({ ok: true, data: { id: "77", requestedVia: "administrator" } });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/appointments/",
      expect.objectContaining({
        method: "POST",
        idempotencyKey: KEY,
        body: {
          specialist_id: 1,
          service_id: 1,
          phone: "+998901234567",
          start: "2026-10-26T09:30:00+05:00",
          note: "Qo‘ng‘iroq qildi",
        },
      }),
    );

    apiFetch.mockRejectedValueOnce(apiError(400, slotErrorFixture));
    expect(await createAppointment({ ...booking, specialistId: "1" }, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { time: "Bu vaqt band." },
    });
    apiFetch.mockRejectedValueOnce(
      apiError(409, { code: "conflict", message: "Bu vaqt band.", errors: [], request_id: "r" }),
    );
    expect(await createAppointment({ ...booking, specialistId: "1" }, KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu vaqt band.",
      code: "conflict",
      fieldErrors: { time: "Bu vaqt band." },
    });
  });

  it("reschedules with specialist_id only when it changed, and cancels with an optional reason", async () => {
    apiFetch.mockResolvedValue(respond(200, item));
    await rescheduleAppointment(
      "1",
      { specialistId: "1", date: "2026-10-27", time: "10:00" },
      "1",
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/appointments/1/reschedule/",
      expect.objectContaining({ body: { start: "2026-10-27T10:00:00+05:00" } }),
    );
    await rescheduleAppointment(
      "1",
      { specialistId: "2", date: "2026-10-27", time: "10:00" },
      "1",
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/appointments/1/reschedule/",
      expect.objectContaining({ body: { start: "2026-10-27T10:00:00+05:00", specialist_id: 2 } }),
    );
    await cancelAppointment("1", { reason: "" }, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/appointments/1/cancel/",
      expect.objectContaining({ body: {}, idempotencyKey: KEY }),
    );
    await cancelAppointment("1", { reason: " Kasal " }, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/appointments/1/cancel/",
      expect.objectContaining({ body: { reason: "Kasal" } }),
    );
    expect(refresh).toHaveBeenCalledTimes(4);
  });
});

describe("notifications in api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries({
      kind: "general",
      title: "Yangi xabar",
      body: "Xabar matni shu yerda.",
      link: "none",
      audience: "all",
      segmentId: "",
      phone: "",
      scheduledAt: "",
      ...fields,
    })) {
      data.set(name, value);
    }
    return data;
  };

  it("posts the multipart body with the key and maps the answer", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, notificationsPageFixture.results[0]));
    const result = await sendNotification(
      form({ audience: "group", segmentId: "1", scheduledAt: "2099-10-27T10:00:00+05:00" }),
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({ ok: true, data: { id: "4", state: "scheduled" } });
    const [path, request] = apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/notifications/");
    expect(request).toMatchObject({ method: "POST", idempotencyKey: KEY });
    const body = request.formData as FormData;
    expect(body.get("audience.type")).toBe("segment");
    expect(body.get("audience.segment_id")).toBe("1");
    expect(body.get("scheduled_at")).toBe("2099-10-27T10:00:00+05:00");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends a URL destination as link.url and maps its errors on linkUrl (gap ADM-10.1)", async () => {
    expect(
      await sendNotification(form({ link: "url", linkUrl: "http://x.uz" }), KEY, CSRF),
    ).toMatchObject({
      ok: false,
      fieldErrors: { linkUrl: "Havolani https:// bilan to‘liq kiriting." },
    });
    expect(apiFetch).not.toHaveBeenCalled();
    const record = {
      ...notificationsPageFixture.results[0],
      link: { kind: "url", product_id: null, label: null, url: "https://glowderma.uz/aksiya" },
    };
    apiFetch.mockResolvedValueOnce(respond(201, record));
    expect(
      await sendNotification(
        form({
          link: "url",
          linkUrl: " https://glowderma.uz/aksiya ",
          scheduledAt: "2099-10-27T10:00:00+05:00",
        }),
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: true, data: { linkUrl: "https://glowderma.uz/aksiya" } });
    const body = apiFetch.mock.calls[0]![1].formData as FormData;
    expect(body.get("link.kind")).toBe("url");
    expect(body.get("link.url")).toBe("https://glowderma.uz/aksiya");
    expect(body.has("link.product_id")).toBe(false);
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "link.url", code: "max_length", message: "500 belgidan oshmasin." }],
        request_id: "r",
      }),
    );
    expect(
      await sendNotification(form({ link: "url", linkUrl: "https://x.uz/a" }), KEY, CSRF),
    ).toMatchObject({ fieldErrors: { linkUrl: "500 belgidan oshmasin." } });
  });

  it("puts an unknown customer phone on the phone field", async () => {
    apiFetch.mockRejectedValueOnce(apiError(400, phoneErrorFixture));
    expect(
      await sendNotification(form({ audience: "one", phone: "+998900000001" }), KEY, CSRF),
    ).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { phone: "Bu raqam bilan mijoz topilmadi." },
    });
  });

  it("PUTs every language of a template; the backend's placeholder error lands on the language", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, templateFixture));
    const texts = { uz: "Buyurtma №{raqam} tayyorlanmoqda.", ru: "", en: "" };
    expect(await updateNotificationTemplate("processing", texts, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { status: "processing" },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/notification-templates/processing/",
      expect.objectContaining({ method: "PUT", body: { texts }, idempotencyKey: KEY }),
    );
    apiFetch.mockRejectedValueOnce(apiError(400, placeholderErrorFixture));
    expect(
      await updateNotificationTemplate("delivered", { ...texts, uz: "Buyurtma {foo}" }, KEY, CSRF),
    ).toMatchObject({ fieldErrors: { "texts.uz": "Faqat {raqam} o‘rinbosari ishlatiladi." } });
    expect(
      await updateNotificationTemplate("awaiting_payment" as never, texts, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { status: expect.any(String) } });
  });
});

describe("cancelling a scheduled campaign (M3)", () => {
  it("api: posts cancel/ with the key and maps the cancelled record", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(200, cancelledFixture));
    const result = await cancelNotification("4", KEY, CSRF);
    expect(result).toMatchObject({
      ok: true,
      data: {
        id: "4",
        state: "cancelled",
        cancelledAt: "2026-10-27T01:03:19+05:00",
        scheduledAt: "2026-10-26T10:00:00+05:00",
        audienceLabel: "Doimiy mijozlar · 612",
      },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/notifications/4/cancel/",
      expect.objectContaining({ method: "POST", body: {}, idempotencyKey: KEY }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("api: a send that started is the backend's 409 conflict, an unknown id its 404", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockRejectedValueOnce(apiError(409, sendStartedFixture));
    expect(await cancelNotification("3", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "conflict",
      error: "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.",
    });
    apiFetch.mockRejectedValueOnce(
      apiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "r" }),
    );
    expect(await cancelNotification("999", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "not_found",
    });
    // Both re-read the history in the same roundtrip: the board shows what changed.
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("api: an answer that changed nothing does not re-read the history", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockRejectedValueOnce(
      apiError(503, {
        code: "provider_unavailable",
        message: "Xizmat vaqtincha ishlamayapti.",
        errors: [],
        request_id: "r",
      }),
    );
    expect(await cancelNotification("4", KEY, CSRF)).toMatchObject({ ok: false });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a malformed id or key before any call", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    expect(await cancelNotification("4/../../x", KEY, CSRF)).toMatchObject({ ok: false });
    expect(await cancelNotification("4", "not-a-uuid", CSRF)).toMatchObject({ ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("mock: the scheduled fixture is cancelled, a sent one is the 409, an unknown id 404", async () => {
    expect(await cancelNotification("n-4", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "n-4", state: "cancelled", cancelledAt: expect.any(String) },
    });
    expect(await cancelNotification("n-3", KEY, CSRF)).toEqual({
      ok: false,
      code: "conflict",
      error: "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.",
    });
    expect(await cancelNotification("n-missing", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "not_found",
    });
    // The fixtures never change: a re-render would only discard the page's own history.
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("templates in mock mode", () => {
  it("applies the {raqam}-only rule per language", async () => {
    expect(
      await updateNotificationTemplate(
        "delivered",
        { uz: "Buyurtma {foo} yetkazildi.", ru: "Заказ {raqam}", en: "{name}" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        "texts.uz": "Faqat {raqam} o‘rinbosari ishlatiladi.",
        "texts.en": "Faqat {raqam} o‘rinbosari ishlatiladi.",
      },
    });
    expect(
      await updateNotificationTemplate(
        "delivered",
        { uz: "Buyurtma №{raqam} yetkazildi.", ru: "", en: "Order {raqam} delivered." },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: true,
      data: { text: "Buyurtma №{raqam} yetkazildi.", translations: { ru: false, en: true } },
    });
  });
});

describe("groups", () => {
  it("mock: unique names, the scheduled-campaign and rule-member 409s, members by id or phone", async () => {
    expect(
      await createSegment(
        { name: "doimiy mijozlar", rules: { minOnlineOrders: null, minLifetimeAmount: null } },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { name: "Bu qiymat band." } });
    expect(
      await createSegment(
        { name: "x", rules: { minOnlineOrders: 0, minLifetimeAmount: null } },
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      fieldErrors: {
        name: "Kamida 2 ta belgi kiriting.",
        "rules.minOnlineOrders": expect.any(String),
      },
    });
    expect(await deleteSegment("1", CSRF)).toEqual({
      ok: false,
      error: "Rejalashtirilgan xabar bu guruhga yuboriladi.",
      code: "conflict",
    });
    expect(await deleteSegment("2", CSRF)).toEqual({ ok: true, data: { id: "2" } });
    expect(await removeSegmentMember("1", "2", CSRF)).toEqual({
      ok: false,
      error: "Mijoz guruhga qoida orqali kiradi.",
      code: "conflict",
    });
    expect(await removeSegmentMember("1", "5", CSRF)).toMatchObject({ ok: true });
    expect(await addSegmentMembers("1", ["7", "", "+998 93 555 12 09"], KEY, CSRF)).toMatchObject({
      ok: true,
      // Aziza (+998935551209) is already a rule member; customer 7 is new.
      data: { memberCount: 5, manualMemberCount: 2 },
    });
    expect(await addSegmentMembers("1", ["5", "abc"], KEY, CSRF)).toMatchObject({
      fieldErrors: { "entries.1": "ID yoki telefon raqamini to‘g‘ri kiriting." },
    });
    // "90 123 45 67" is Malika's phone (customer 5, already a manual member):
    // the counts stay those of the fixture — customers 90, 123, 45, 67 are not added.
    expect(await addSegmentMembers("1", ["90 123 45 67"], KEY, CSRF)).toMatchObject({
      ok: true,
      data: { memberCount: 4, manualMemberCount: 1 },
    });
    // A phone nobody active has, and an unknown id, land on their own lines.
    expect(
      await addSegmentMembers("1", ["5", "+998 90 000 00 00", "999999"], KEY, CSRF),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        "entries.1": "Bu raqam bilan mijoz topilmadi.",
        "entries.2": "Topilmadi.",
      },
    });
    expect(await addSegmentMembers("1", ["", " "], KEY, CSRF)).toMatchObject({
      fieldErrors: { members: "Mijoz ID yoki telefon raqamini kiriting." },
    });
    const many = Array.from({ length: 501 }, (_, i) => String(i + 1));
    expect(await addSegmentMembers("1", many, KEY, CSRF)).toMatchObject({
      fieldErrors: { members: "Ko‘pi bilan 500 ta." },
    });
    expect(await addSegmentMembers("1", "5, 7" as never, KEY, CSRF)).toMatchObject({
      fieldErrors: { members: "Mijoz ID yoki telefon raqamini kiriting." },
    });
  });

  it("api: create, patch only the changed rule, add ids, map the 409s", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    const seg = segmentsFixture.results[0]!;
    apiFetch.mockResolvedValue(respond(200, seg));
    const baseline = {
      name: "Doimiy mijozlar",
      rules: { minOnlineOrders: 3, minLifetimeAmount: null },
    };
    await updateSegment(
      "1",
      { ...baseline, rules: { minOnlineOrders: 3, minLifetimeAmount: 10_000_000 } },
      baseline,
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/segments/1/",
      expect.objectContaining({
        method: "PATCH",
        body: { rules: { min_lifetime_amount: 10_000_000 } },
      }),
    );
    await createSegment(baseline, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/segments/",
      expect.objectContaining({
        method: "POST",
        body: {
          name: "Doimiy mijozlar",
          rules: { min_online_orders: 3, min_lifetime_amount: null },
        },
      }),
    );
    await addSegmentMembers("1", ["5", "12", "5"], KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/segments/1/members/",
      expect.objectContaining({ body: { customer_ids: [5, 12] } }),
    );
    // A spaced national phone is one E.164 phone, never customers 90, 123, 45 and 67.
    await addSegmentMembers("1", ["90 123 45 67"], KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/segments/1/members/",
      expect.objectContaining({ body: { phones: ["+998901234567"] } }),
    );
    await addSegmentMembers("1", ["+998 90 123 45 67", "7", "", "998935551209"], KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/segments/1/members/",
      expect.objectContaining({
        body: { customer_ids: [7], phones: ["+998901234567", "+998935551209"] },
      }),
    );
    apiFetch.mockClear();
    expect(await addSegmentMembers("1", ["5", "90 123 45"], KEY, CSRF)).toMatchObject({
      fieldErrors: { "entries.1": "Telefonni to‘liq kiriting." },
    });
    expect(apiFetch).not.toHaveBeenCalled();
    // `phones.{i}` / `customer_ids.{i}` are indexes into the lists sent; they
    // come back on the input line that named the element.
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "phones.1",
            code: "customer_not_found",
            message: "Bu raqam bilan mijoz topilmadi.",
          },
          { field: "customer_ids.0", code: "invalid", message: "Noto‘g‘ri qiymat." },
        ],
        request_id: "r",
      }),
    );
    expect(
      await addSegmentMembers("1", ["90 123 45 67", "", "12", "+998 90 000 00 00"], KEY, CSRF),
    ).toMatchObject({
      fieldErrors: {
        "entries.3": "Bu raqam bilan mijoz topilmadi.",
        "entries.2": "Noto‘g‘ri qiymat.",
      },
    });
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "customer_ids", code: "does_not_exist", message: "Topilmadi." }],
        request_id: "r",
      }),
    );
    expect(await addSegmentMembers("1", ["999999"], KEY, CSRF)).toMatchObject({
      fieldErrors: { members: "Topilmadi." },
    });
    apiFetch.mockRejectedValueOnce(apiError(409, segmentDeleteFixture));
    expect(await deleteSegment("1", CSRF)).toMatchObject({
      error: "Rejalashtirilgan xabar bu guruhga yuboriladi.",
      code: "conflict",
    });
    apiFetch.mockRejectedValueOnce(
      apiError(409, {
        code: "conflict",
        message: "Mijoz guruhga qoida orqali kiradi.",
        errors: [],
        request_id: "r",
      }),
    );
    expect(await removeSegmentMember("1", "8", CSRF)).toMatchObject({
      error: "Mijoz guruhga qoida orqali kiradi.",
    });
  });
});

describe("settings and password", () => {
  const baseline = {
    reservationMinutes: 15,
    supportPhone: "+998712000000",
    pickupAddress: { uz: "Toshkent", ru: "", en: "" },
  };

  it("validates in both modes and patches only the changed fields in api mode", async () => {
    expect(
      await updateSettings(
        { ...baseline, reservationMinutes: 61, supportPhone: "123" },
        baseline,
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      fieldErrors: {
        reservationMinutes: "Qiymat 60 dan oshmasin.",
        supportPhone: "Telefon raqamini to‘g‘ri kiriting.",
      },
    });
    expect(
      await updateSettings({ ...baseline, supportPhone: "" }, baseline, KEY, CSRF),
    ).toMatchObject({
      ok: true,
      data: { supportPhone: null },
    });

    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(200, { ...settingsFixture, reservation_minutes: 20 }));
    expect(
      await updateSettings({ ...baseline, reservationMinutes: 20 }, baseline, KEY, CSRF),
    ).toMatchObject({ ok: true, data: { reservationMinutes: 20 } });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/settings/",
      expect.objectContaining({ method: "PATCH", body: { reservation_minutes: 20 } }),
    );
  });

  const contacts = {
    storePhone: "+998712000001",
    cosmetologistPhone: "",
    telegramUrl: "https://t.me/glowderma",
    instagramUrl: "",
    websiteUrl: "https://glowderma.uz",
  };

  it("validates the contacts and patches only the changed ones (gap X-SET-CONTACTS)", async () => {
    expect(
      await updateContacts(
        {
          ...contacts,
          telegramUrl: "https://example.uz/glowderma",
          websiteUrl: "http://glowderma.uz",
          cosmetologistPhone: "12",
        },
        contacts,
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        telegramUrl: "Telegram havolasi https://t.me/… ko‘rinishida bo‘lsin.",
        websiteUrl: "Havolani https:// bilan to‘liq kiriting.",
        cosmetologistPhone: "Telefon raqamini to‘g‘ri kiriting.",
      },
    });
    expect(
      await updateContacts({ ...contacts, storePhone: "" }, contacts, KEY, CSRF),
    ).toMatchObject({
      ok: true,
      data: { storePhone: null, telegramUrl: "https://t.me/glowderma" },
    });

    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(200, { ...settingsFixture, store_phone: null }));
    expect(
      await updateContacts({ ...contacts, storePhone: "" }, contacts, KEY, CSRF),
    ).toMatchObject({ ok: true, data: { storePhone: null } });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/settings/",
      expect.objectContaining({
        method: "PATCH",
        body: { store_phone: null },
        idempotencyKey: KEY,
      }),
    );
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "instagram_url",
            code: "invalid",
            message: "Instagram havolasi https://instagram.com/… ko‘rinishida bo‘lsin.",
          },
        ],
        request_id: "r",
      }),
    );
    expect(
      await updateContacts(
        { ...contacts, instagramUrl: "https://instagram.com/a/b" },
        contacts,
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: false });
  });

  const texts = {
    terms: { uz: "Shartlar", ru: "", en: "" },
    privacyPolicy: { uz: "Siyosat", ru: "", en: "" },
    bookingPolicy: { uz: "Qoidalar", ru: "", en: "" },
  };

  it("saves only the changed languages of the legal texts and maps their field errors", async () => {
    expect(
      await updateLegalTexts(
        { ...texts, bookingPolicy: { ...texts.bookingPolicy, en: "x".repeat(5001) } },
        texts,
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: false, fieldErrors: { "bookingPolicy.en": "5000 belgidan oshmasin." } });
    expect(
      await updateLegalTexts(
        { ...texts, terms: { ...texts.terms, ru: "  Условия \r\n" } },
        texts,
        KEY,
        CSRF,
      ),
    ).toMatchObject({
      ok: true,
      data: { terms: { ru: "Условия" }, termsUnpublishedChanges: true },
    });

    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(
      respond(200, { ...settingsFixture, terms_unpublished_changes: true }),
    );
    expect(
      await updateLegalTexts(
        { ...texts, privacyPolicy: { ...texts.privacyPolicy, en: "Policy" } },
        texts,
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: true, data: { termsUnpublishedChanges: true } });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/settings/",
      expect.objectContaining({ method: "PATCH", body: { privacy_policy: { en: "Policy" } } }),
    );
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "terms.uz", code: "max_length", message: "50000 belgidan oshmasin." }],
        request_id: "r",
      }),
    );
    expect(
      await updateLegalTexts({ ...texts, terms: { ...texts.terms, uz: "y" } }, texts, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { "terms.uz": "50000 belgidan oshmasin." } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("publishes with the dialog's key; 409 without the Uzbek texts (contract §2.11)", async () => {
    const empty = { ...texts, terms: { uz: " \u200b ", ru: "Условия", en: "" } };
    expect(await publishTerms({ ...empty, termsVersion: null }, KEY, CSRF)).toEqual({
      ok: false,
      error:
        "Foydalanish shartlari va maxfiylik siyosatining o‘zbekcha matnini kiriting, so‘ng e’lon qiling.",
      code: "conflict",
    });
    // The demo's reference day is 2026-10-24 (Tashkent).
    expect(await publishTerms({ ...texts, termsVersion: "20261024-1" }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { termsVersion: "20261024-2", termsUnpublishedChanges: false },
    });
    expect(await publishTerms({ ...texts, termsVersion: null }, "nope", CSRF)).toMatchObject({
      ok: false,
    });

    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(
      respond(200, { ...settingsFixture, terms_version: "20261027-1" }),
    );
    expect(await publishTerms({ ...texts, termsVersion: null }, KEY, CSRF)).toMatchObject({
      ok: true,
      data: { termsVersion: "20261027-1" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/settings/terms/publish/",
      expect.objectContaining({ method: "POST", body: {}, idempotencyKey: KEY }),
    );
    apiFetch.mockRejectedValueOnce(
      apiError(409, {
        code: "conflict",
        message:
          "Foydalanish shartlari va maxfiylik siyosatining o‘zbekcha matnini kiriting, so‘ng e’lon qiling.",
        errors: [],
        request_id: "r",
      }),
    );
    expect(await publishTerms({ ...texts, termsVersion: null }, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "conflict",
    });
  });

  it("changes the password without a key or refresh; maps the backend's field errors", async () => {
    const values = {
      currentPassword: "Saffron!Harbor-Long72",
      newPassword: "Another!Long-Pass99",
      confirmPassword: "Another!Long-Pass99",
    };
    expect(await changePassword({ ...values, confirmPassword: "x" }, CSRF)).toMatchObject({
      fieldErrors: { confirmPassword: "Parollar mos emas." },
    });
    expect(await changePassword(values, CSRF)).toEqual({ ok: true, data: { changed: true } });

    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await changePassword(values, CSRF)).toEqual({ ok: true, data: { changed: true } });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/auth/change-password/",
      expect.objectContaining({
        method: "POST",
        body: { current_password: values.currentPassword, new_password: values.newPassword },
      }),
    );
    expect(apiFetch.mock.calls[0]![1]).not.toHaveProperty("idempotencyKey");
    apiFetch.mockRejectedValueOnce(
      apiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "current_password",
            code: "password_incorrect",
            message: "Joriy parol noto‘g‘ri.",
          },
        ],
        request_id: "r",
      }),
    );
    expect(await changePassword(values, CSRF)).toMatchObject({
      fieldErrors: { currentPassword: "Joriy parol noto‘g‘ri." },
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("unlinking a social sign-in provider", () => {
  it("refuses an unknown provider and a missing csrf token before any call", async () => {
    expect(await unlinkSocialAccount("github", CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { "": "Ruxsat etilmagan qiymat." },
    });
    expect(await unlinkSocialAccount("google", "")).toMatchObject({ ok: false, code: "csrf" });
    expect(verifyStaff).toHaveBeenCalledTimes(1);
  });

  it("answers 404 in demo mode (the demo account links nothing)", async () => {
    expect(await unlinkSocialAccount("google", CSRF)).toEqual({
      ok: false,
      error: "Topilmadi.",
      code: "not_found",
    });
  });

  it("sends DELETE auth/oauth/{provider}/ without a key and refreshes the route", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await unlinkSocialAccount("facebook", CSRF)).toEqual({
      ok: true,
      data: { unlinked: "facebook" },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/auth/oauth/facebook/",
      expect.objectContaining({ method: "DELETE", token: "t" }),
    );
    expect(apiFetch.mock.calls[0]![1]).not.toHaveProperty("idempotencyKey");
    expect(refresh).toHaveBeenCalledTimes(1);
    apiFetch.mockRejectedValueOnce(
      apiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "r" }),
    );
    expect(await unlinkSocialAccount("google", CSRF)).toEqual({
      ok: false,
      error: "Topilmadi.",
      code: "not_found",
    });
  });
});
