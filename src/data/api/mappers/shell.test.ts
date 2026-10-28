import { describe, expect, it } from "vitest";

import dayOffFixture from "../__fixtures__/appointments-day-off.json";
import dayFixture from "../__fixtures__/appointments-day.json";
import metaFixture from "../__fixtures__/appointments-meta.json";
import auditFixture from "../__fixtures__/audit-page.json";
import slotErrorFixture from "../__fixtures__/err-appointment-slot.json";
import phoneErrorFixture from "../__fixtures__/err-notification-phone.json";
import segmentDeleteFixture from "../__fixtures__/err-segment-delete.json";
import placeholderErrorFixture from "../__fixtures__/err-template-placeholder.json";
import notificationsMetaFixture from "../__fixtures__/notifications-meta.json";
import notificationsPageFixture from "../__fixtures__/notifications-page.json";
import pendingFixture from "../__fixtures__/pending-summary.json";
import membersFixture from "../__fixtures__/segment-1-members.json";
import segmentsFixture from "../__fixtures__/segments-page.json";
import settingsFixture from "../__fixtures__/settings.json";
import templateFixture from "../__fixtures__/template-processing.json";
import { ApiError } from "../errors";
import type {
  ApiAppointmentsMeta,
  ApiDaySchedule,
  ApiNotificationMeta,
  ApiPaginatedAuditLog,
  ApiPaginatedCustomers,
  ApiPaginatedNotifications,
  ApiPaginatedSegments,
  ApiPendingSummary,
  ApiSettings,
  ApiStatusTemplate,
  ErrorEnvelope,
} from "../types";
import {
  BOOKING_FIELD_REMAP,
  RESCHEDULE_FIELD_REMAP,
  bookingFailure,
  mapAppointmentDay,
  mapBookingMeta,
  mapDayAppointment,
  mapPendingSummary,
} from "./appointments";
import { auditFilterParams, mapAuditEntry } from "./audit";
import { tashkentIso } from "./common";
import { toActionResult } from "./errors";
import {
  defaultSchedule,
  mapNotificationMeta,
  mapNotificationRecord,
  mapStatusTemplate,
  NOTIFICATION_FIELD_REMAP,
  notificationFormData,
} from "./notifications";
import { mapPage } from "./page";
import { mapSegment, mapSegmentMember, segmentCreateBody, segmentPatchBody } from "./segments";
import {
  contactsFormValues,
  contactsPatchBody,
  legalTextsFormValues,
  legalTextsPatchBody,
  mapSettings,
  mapStaffAccount,
  settingsFormValues,
  settingsPatchBody,
} from "./settings";

/**
 * Recorded JSON from the M1d backend (`src/data/api/__fixtures__`, backend
 * 4e2e620, seeded demo data): `GET appointments/?date=2026-10-26` and
 * `?date=2026-10-25` (a Sunday: nobody works), `pending-summary/`,
 * `appointments/meta/`, `notifications/` (the four seeded campaigns),
 * `notifications/meta/` (link options trimmed to three),
 * `notification-templates/processing/`, `segments/`, `segments/1/members/`,
 * `settings/`, four `audit-log/` rows, and the error envelopes of a taken
 * slot, an unknown customer phone, an unknown template placeholder and a
 * segment delete refused by a scheduled campaign → the FE domain objects,
 * display strings included (contract §5.5–§5.7).
 */

const NBSP = " ";
const apiError = (status: number, body: unknown) => new ApiError(status, body as ErrorEnvelope);

describe("appointments", () => {
  const day = mapAppointmentDay(dayFixture as ApiDaySchedule);

  it("maps the seeded Monday: three specialists by position, roles, Jasur's break", () => {
    expect(day.date).toBe("2026-10-26");
    expect(day.specialists.map((s) => [s.id, s.name, s.role])).toEqual([
      ["1", "Nodira Rahimova", "Dermatolog"],
      ["2", "Jasur Aliyev", "Dermatolog"],
      ["3", "Dilnoza Yusupova", "Kosmetolog"],
    ]);
    expect(day.specialists[0]).toMatchObject({
      workingHours: { start: "09:00", end: "18:00" },
      blocks: [{ start: "16:00", end: "16:30", kind: "busy", label: "Band qilingan" }],
      working: true,
    });
    // `label: null` on an `off` block → "Ish vaqti emas" (§5.6).
    expect(day.specialists[1]?.blocks).toEqual([
      { start: "13:00", end: "14:00", kind: "off", label: "Ish vaqti emas" },
    ]);
  });

  it("maps the eight visits of every status with customer, service, snapshot and source", () => {
    expect(day.appointments).toHaveLength(8);
    expect(day.appointments.filter((a) => a.status === "requested").map((a) => a.id)).toEqual([
      "1",
      "4",
      "7",
    ]);
    expect(day.appointments[0]).toEqual({
      id: "1",
      specialistId: "1",
      customer: { id: "8", name: "Kamola Nazarova", phone: "+998909741823" },
      serviceId: "1",
      service: "Dermatolog konsultatsiyasi",
      serviceShort: "Konsultatsiya",
      durationMin: 30,
      start: "2026-10-26T09:00:00+05:00",
      end: "2026-10-26T09:30:00+05:00",
      price: 150_000,
      status: "requested",
      requestedAt: "2026-10-24T08:41:00+05:00",
      requestedVia: "ilova",
    });
  });

  it("marks a deactivated specialist's column (FND-1: is_active false)", () => {
    const api = dayFixture as ApiDaySchedule;
    const inactive = mapAppointmentDay({
      ...api,
      specialists: api.specialists.map((s, i) => (i === 0 ? { ...s, is_active: false } : s)),
    });
    expect(inactive.specialists[0]?.isActive).toBe(false);
    expect(inactive.specialists[1]).not.toHaveProperty("isActive");
  });

  it("draws a day off (working_hours null) as one 'Ish kuni emas' block over 09–18", () => {
    const off = mapAppointmentDay(dayOffFixture as ApiDaySchedule);
    expect(off.appointments).toEqual([]);
    for (const specialist of off.specialists) {
      expect(specialist).toMatchObject({
        working: false,
        workingHours: { start: "09:00", end: "18:00" },
        blocks: [{ start: "09:00", end: "18:00", kind: "off", label: "Ish kuni emas" }],
      });
    }
  });

  it("maps admin bookings, cancelled visits and a scrubbed customer name", () => {
    const item = dayFixture.appointments[0]!;
    expect(
      mapDayAppointment({
        ...(item as ApiDaySchedule["appointments"][number]),
        status: "cancelled",
        requested_via: "admin",
        customer: { id: 8, name: "", phone: "+998909741823", email: null },
      }),
    ).toMatchObject({
      status: "cancelled",
      requestedVia: "administrator",
      customer: { name: "O‘chirilgan mijoz" },
    });
    // An e-mail-only customer (B-W2) shows the address where the phone would be.
    expect(
      mapDayAppointment({
        ...(item as ApiDaySchedule["appointments"][number]),
        customer: { id: 9, name: "Aziza", phone: null, email: "aziza@example.com" },
      }).customer.phone,
    ).toBe("aziza@example.com");
  });

  it("maps the pending summary and the booking meta (services per specialist with prices)", () => {
    expect(mapPendingSummary(pendingFixture as ApiPendingSummary)).toEqual({
      count: 3,
      nextAt: "2026-10-26T09:00:00+05:00",
    });
    const meta = mapBookingMeta(metaFixture as ApiAppointmentsMeta);
    expect(meta.slotStepMin).toBe(5);
    expect(meta.specialists.map((s) => [s.name, s.role, s.services.length])).toEqual([
      ["Nodira Rahimova", "Dermatolog", 2],
      ["Jasur Aliyev", "Dermatolog", 2],
      ["Dilnoza Yusupova", "Kosmetolog", 3],
    ]);
    expect(meta.specialists[1]?.services[0]).toEqual({
      id: "1",
      name: "Dermatolog konsultatsiyasi",
      shortName: "Konsultatsiya",
      durationMin: 30,
      price: 120_000,
    });
  });

  it("puts start errors and a 409 race on the dialog's time field", () => {
    expect(toActionResult(apiError(400, slotErrorFixture), BOOKING_FIELD_REMAP)).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { time: "Bu vaqt band." },
    });
    const notFound = {
      code: "validation_error",
      message: "Maydonlarni tekshiring.",
      errors: [
        { field: "phone", code: "customer_not_found", message: "Bu raqam bilan mijoz topilmadi." },
        { field: "service_id", code: "does_not_exist", message: "Xizmat topilmadi." },
      ],
      request_id: "r",
    };
    expect(toActionResult(apiError(400, notFound), BOOKING_FIELD_REMAP).fieldErrors).toEqual({
      phone: "Bu raqam bilan mijoz topilmadi.",
      serviceId: "Xizmat topilmadi.",
    });
  });

  it("puts a move's service_id error on the specialist, which the dialog renders", () => {
    const wrongSpecialist = {
      code: "validation_error",
      message: "Maydonlarni tekshiring.",
      errors: [
        {
          field: "service_id",
          code: "does_not_exist",
          message: "Mutaxassis bu xizmatni ko‘rsatmaydi.",
        },
      ],
      request_id: "r",
    };
    expect(
      bookingFailure(apiError(400, wrongSpecialist), RESCHEDULE_FIELD_REMAP).fieldErrors,
    ).toEqual({ specialistId: "Mutaxassis bu xizmatni ko‘rsatmaydi." });
    expect(bookingFailure(apiError(400, wrongSpecialist)).fieldErrors).toEqual({
      serviceId: "Mutaxassis bu xizmatni ko‘rsatmaydi.",
    });
  });

  it("shows a 409 race on the time field", () => {
    const race = { code: "conflict", message: "Bu vaqt band.", errors: [], request_id: "r" };
    expect(bookingFailure(apiError(409, race), RESCHEDULE_FIELD_REMAP)).toEqual({
      ok: false,
      error: "Bu vaqt band.",
      code: "conflict",
      fieldErrors: { time: "Bu vaqt band." },
    });
  });
});

describe("notifications", () => {
  const page = notificationsPageFixture as ApiPaginatedNotifications;
  const history = page.results.map(mapNotificationRecord);

  it("maps the four seeded campaigns with audience labels, counters, dates and authors", () => {
    expect(history.map((r) => [r.id, r.state, r.audienceLabel, r.sent, r.delivered])).toEqual([
      ["4", "scheduled", `Doimiy mijozlar · 612`, null, null],
      ["3", "sent", `Barcha · 4${NBSP}751`, 4751, 4388],
      ["2", "sent", `Barcha · 4${NBSP}740`, 4740, 4205],
      ["1", "sent", `10 mln+ xarid · 318`, 318, 301],
    ]);
    expect(history[0]).toMatchObject({
      at: "2026-10-26T10:00:00+05:00",
      scheduledAt: "2026-10-26T10:00:00+05:00",
      sentAt: null,
      failed: null,
      author: "Administrator",
    });
    expect(history[1]).toMatchObject({
      at: "2026-10-24T12:00:00+05:00",
      sentAt: "2026-10-24T12:02:00+05:00",
      failed: 0,
      linkLabel: "Seramidli namlantiruvchi krem",
    });
    expect(history[0]?.linkLabel).toBeUndefined();
    expect(history[0]?.cancelledAt).toBeNull();
  });

  it("keeps a missing cancelled_at (a backend before M3) apart from null", () => {
    const m2Record: Record<string, unknown> = { ...page.results[0]! };
    delete m2Record.cancelled_at;
    const mapped = mapNotificationRecord(m2Record as unknown as (typeof page.results)[number]);
    expect(mapped.cancelledAt).toBeUndefined();
    expect(mapped.state).toBe("scheduled");
  });

  it("labels a single-customer audience with the formatted phone and falls back to created_at", () => {
    const record = page.results[0]!;
    expect(
      mapNotificationRecord({
        ...record,
        scheduled_at: null,
        audience: {
          type: "customer",
          segment_id: null,
          segment_name: null,
          phone: "+998901234567",
        },
        author: null,
      }),
    ).toMatchObject({
      at: record.created_at,
      audienceLabel: "Bitta mijoz · +998 90 123 45 67",
    });
  });

  it("maps the composer meta: devices, segment sizes, link options with 'none' first, templates", () => {
    const meta = mapNotificationMeta(notificationsMetaFixture as ApiNotificationMeta);
    expect(meta.totalDevices).toBe(360);
    expect(meta.segments).toEqual([
      { id: "1", name: "Doimiy mijozlar", size: 1 },
      { id: "2", name: "10 mln+ xarid", size: 1 },
    ]);
    expect(meta.linkOptions[0]).toEqual({ kind: "none" });
    expect(meta.linkOptions[1]).toEqual({
      kind: "product",
      productId: "100",
      label: "Aloe verali balzam",
    });
    expect(meta.templates.map((t) => [t.status, t.translations.en])).toEqual([
      ["processing", true],
      ["handed_to_courier", true],
      ["delivered", false],
      ["cancelled", true],
    ]);
  });

  it("maps a status template with every language for the editor", () => {
    expect(mapStatusTemplate(templateFixture as ApiStatusTemplate)).toMatchObject({
      status: "processing",
      text: "To‘lov qabul qilindi. Buyurtma №{raqam} tayyorlanmoqda.",
      texts: { ru: "Оплата принята. Заказ №{raqam} готовится." },
      updatedBy: null,
    });
  });

  it("suggests tomorrow 10:00 Tashkent relative to the server's now", () => {
    expect(defaultSchedule(new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-27T10:00:00+05:00");
    expect(defaultSchedule(new Date("2026-10-26T12:00:00+05:00"))).toBe(
      "2026-10-27T10:00:00+05:00",
    );
  });

  it("builds the multipart body with dotted keys (group → segment, one → customer)", () => {
    const image = new File(["png"], "a.png", { type: "image/png" });
    const group = notificationFormData({
      kind: "general",
      title: "Sarlavha",
      body: "Matn matn",
      link: { kind: "product", productId: "4" },
      audience: "group",
      segmentId: "1",
      phone: "",
      scheduledAt: "2026-10-27T05:00:00.000Z",
      image,
    });
    expect([...group.keys()].sort()).toEqual([
      "audience.segment_id",
      "audience.type",
      "body",
      "image",
      "kind",
      "link.kind",
      "link.product_id",
      "scheduled_at",
      "title",
    ]);
    expect(group.get("audience.type")).toBe("segment");
    expect(group.get("link.product_id")).toBe("4");
    expect(group.get("scheduled_at")).toBe("2026-10-27T10:00:00+05:00");
    expect((group.get("image") as File).name).toBe("a.png");

    const one = notificationFormData({
      kind: "promo",
      title: "Sarlavha",
      body: "Matn matn",
      link: { kind: "none" },
      audience: "one",
      segmentId: "",
      phone: "+998901234567",
      scheduledAt: null,
      image: null,
    });
    expect(Object.fromEntries(one)).toEqual({
      kind: "promo",
      title: "Sarlavha",
      body: "Matn matn",
      "link.kind": "none",
      "audience.type": "customer",
      "audience.phone": "+998901234567",
    });
    const all = notificationFormData({
      kind: "promo",
      title: "Sarlavha",
      body: "Matn matn",
      link: { kind: "none" },
      audience: "all",
      segmentId: "1",
      phone: "+998901234567",
      scheduledAt: null,
      image: null,
    });
    expect(all.get("audience.type")).toBe("all");
    expect(all.has("audience.segment_id")).toBe(false);
    expect(all.has("audience.phone")).toBe(false);
  });

  it("remaps the composer's field errors per §7.1 (phone, link, schedule, image → top level)", () => {
    expect(toActionResult(apiError(400, phoneErrorFixture), NOTIFICATION_FIELD_REMAP)).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { phone: "Bu raqam bilan mijoz topilmadi." },
    });
    const mixed = {
      code: "validation_error",
      message: "Maydonlarni tekshiring.",
      errors: [
        { field: "image", code: "file_too_large", message: "Rasm 5 MB dan oshmasin." },
        {
          field: "link.product_id",
          code: "does_not_exist",
          message: "Mahsulot topilmadi yoki yashirin.",
        },
        { field: "scheduled_at", code: "in_past", message: "Kelajakdagi vaqtni tanlang." },
        { field: "audience.segment_id", code: "does_not_exist", message: "Topilmadi." },
      ],
      request_id: "r",
    };
    expect(toActionResult(apiError(400, mixed), NOTIFICATION_FIELD_REMAP)).toEqual({
      ok: false,
      error: "Rasm 5 MB dan oshmasin.",
      code: "validation_error",
      fieldErrors: {
        link: "Mahsulot topilmadi yoki yashirin.",
        scheduledAt: "Kelajakdagi vaqtni tanlang.",
        segmentId: "Topilmadi.",
      },
    });
  });

  it("maps the template placeholder error onto the language field", () => {
    expect(toActionResult(apiError(400, placeholderErrorFixture)).fieldErrors).toEqual({
      "texts.uz": "Faqat {raqam} o‘rinbosari ishlatiladi.",
    });
  });
});

describe("segments", () => {
  it("maps the two seeded groups and Malika's member row", () => {
    const page = mapPage(segmentsFixture as ApiPaginatedSegments, mapSegment);
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 20, pageCount: 1 });
    expect(page.items.map((s) => [s.id, s.name, s.rules])).toEqual([
      ["1", "Doimiy mijozlar", { minOnlineOrders: 3, minLifetimeAmount: null }],
      ["2", "10 mln+ xarid", { minOnlineOrders: null, minLifetimeAmount: 10_000_000 }],
    ]);
    expect(page.items[0]).toMatchObject({ manualMemberCount: 1, memberCount: 1, size: 1 });
    const members = mapPage(membersFixture as ApiPaginatedCustomers, mapSegmentMember);
    expect(members.items).toEqual([
      {
        id: "5",
        name: "Malika Karimova",
        phone: "+998901234567",
        status: "active",
        registeredAt: "2025-03-12T10:20:00+05:00",
        lifetimeTotal: 0,
        percent: null,
        balance: 0,
        onlineOrdersCount: 0,
      },
    ]);
  });

  it("creates with both rules and patches only what changed (per rule)", () => {
    const baseline = {
      name: "Doimiy mijozlar",
      rules: { minOnlineOrders: 3, minLifetimeAmount: null },
    };
    expect(segmentCreateBody(baseline)).toEqual({
      name: "Doimiy mijozlar",
      rules: { min_online_orders: 3, min_lifetime_amount: null },
    });
    expect(segmentPatchBody(baseline, baseline)).toEqual({});
    expect(
      segmentPatchBody(baseline, {
        ...baseline,
        rules: { minOnlineOrders: 3, minLifetimeAmount: 5_000_000 },
      }),
    ).toEqual({ rules: { min_lifetime_amount: 5_000_000 } });
    expect(
      segmentPatchBody(baseline, {
        name: "Sodiq",
        rules: { minOnlineOrders: null, minLifetimeAmount: null },
      }),
    ).toEqual({ name: "Sodiq", rules: { min_online_orders: null } });
  });

  it("keeps the 409 message of a refused delete", () => {
    expect(toActionResult(apiError(409, segmentDeleteFixture))).toEqual({
      ok: false,
      error: "Rejalashtirilgan xabar bu guruhga yuboriladi.",
      code: "conflict",
    });
  });
});

describe("settings and account", () => {
  const settings = mapSettings(settingsFixture as ApiSettings);

  it("maps the singleton with the integrations mode, contacts and legal texts (gap closure)", () => {
    expect(settings).toEqual({
      reservationMinutes: 15,
      supportPhone: "+998712000000",
      pickupAddress: {
        uz: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12",
        ru: "",
        en: "",
      },
      storePhone: "+998712000001",
      cosmetologistPhone: "+998712000002",
      telegramUrl: "https://t.me/glowderma",
      instagramUrl: "https://instagram.com/glowderma",
      websiteUrl: "https://glowderma.uz",
      terms: settingsFixture.terms,
      privacyPolicy: settingsFixture.privacy_policy,
      bookingPolicy: settingsFixture.booking_policy,
      termsVersion: "20241220-1",
      termsUpdatedAt: "2024-12-20T10:00:00+05:00",
      termsUnpublishedChanges: false,
      integrationsMode: "fake",
      updatedAt: settingsFixture.updated_at,
      updatedBy: null,
    });
  });

  it("patches only the changed contacts, an emptied one as null", () => {
    const baseline = contactsFormValues(settings);
    expect(contactsPatchBody(baseline, baseline)).toEqual({});
    expect(
      contactsPatchBody(baseline, {
        ...baseline,
        storePhone: "",
        telegramUrl: "https://t.me/glow_derma",
      }),
    ).toEqual({ store_phone: null, telegram_url: "https://t.me/glow_derma" });
  });

  it("patches only the changed languages of each legal text", () => {
    const baseline = legalTextsFormValues(settings);
    expect(legalTextsPatchBody(baseline, baseline)).toEqual({});
    expect(
      legalTextsPatchBody(baseline, {
        ...baseline,
        terms: { ...baseline.terms, ru: "Новые условия" },
        bookingPolicy: { ...baseline.bookingPolicy, en: "" },
      }),
    ).toEqual({ terms: { ru: "Новые условия" }, booking_policy: { en: "" } });
  });

  it("patches only changed fields, address leaves, and an emptied phone as null", () => {
    const baseline = settingsFormValues(settings);
    expect(settingsPatchBody(baseline, baseline)).toEqual({});
    expect(
      settingsPatchBody(baseline, {
        reservationMinutes: 20,
        supportPhone: "",
        pickupAddress: { ...baseline.pickupAddress, ru: "Ташкент" },
      }),
    ).toEqual({ reservation_minutes: 20, support_phone: null, pickup_address: { ru: "Ташкент" } });
  });

  it("maps auth/me for the account card and keeps password errors on the form names", () => {
    expect(
      mapStaffAccount({
        id: 1,
        email: "admin@glowderma.uz",
        display_name: "Administrator",
        is_superuser: false,
        is_manager: true,
        linked_providers: ["google"],
        session_expires_at: "2026-10-26T15:33:54+05:00",
        auth_method: "password",
      }),
    ).toEqual({
      id: "1",
      email: "admin@glowderma.uz",
      displayName: "Administrator",
      isManager: true,
      linkedProviders: ["google"],
      sessionExpiresAt: "2026-10-26T15:33:54+05:00",
      authMethod: "password",
    });
    const base = {
      id: 1,
      email: "admin@glowderma.uz",
      display_name: "Administrator",
      is_superuser: false,
      is_manager: false,
      linked_providers: [],
      session_expires_at: "2026-10-26T15:33:54+05:00",
    };
    expect(mapStaffAccount({ ...base, auth_method: "google" }).authMethod).toBe("google");
    // §2.16: a staff member who is not a manager; a superuser always is one.
    expect(mapStaffAccount({ ...base, auth_method: "google" }).isManager).toBe(false);
    expect(
      mapStaffAccount({ ...base, is_superuser: true, auth_method: "password" }).isManager,
    ).toBe(true);
    // A session opened before the backend recorded how it signed in (M3).
    expect(mapStaffAccount({ ...base, auth_method: null }).authMethod).toBeNull();
    // A backend before M3 (the M2 `Me` has no `auth_method` key): not reported, not `null`.
    const m2Me = base as unknown as Parameters<typeof mapStaffAccount>[0];
    expect("auth_method" in m2Me).toBe(false);
    expect(mapStaffAccount(m2Me).authMethod).toBeUndefined();
    const envelope = {
      code: "validation_error",
      message: "Maydonlarni tekshiring.",
      errors: [
        {
          field: "current_password",
          code: "password_incorrect",
          message: "Joriy parol noto‘g‘ri.",
        },
        { field: "new_password", code: "password_too_short", message: "Kamida 12 ta belgi." },
      ],
      request_id: "r",
    };
    expect(toActionResult(apiError(400, envelope)).fieldErrors).toEqual({
      currentPassword: "Joriy parol noto‘g‘ri.",
      newPassword: "Kamida 12 ta belgi.",
    });
  });
});

describe("audit log", () => {
  it("maps rows (system actor = null) and the filters to the API's parameters", () => {
    const page = mapPage(auditFixture as ApiPaginatedAuditLog, mapAuditEntry);
    expect(page.pageSize).toBe(20);
    expect(page.items.map((e) => [e.action, e.actor, e.objectType])).toEqual([
      ["settings.updated", "Administrator", "settings"],
      ["segment.created", "Administrator", "segment"],
      ["export.downloaded", "Administrator", "banners"],
      ["auth.login_failed", null, "staff"],
    ]);
    expect(page.items[3]).toMatchObject({ actorId: null, objectId: "", ip: "127.0.0.1" });
    expect(page.items[1]?.data).toEqual({
      name: "Probe F2b",
      min_online_orders: 2,
      min_lifetime_amount: 5_000_000,
    });
    expect(
      auditFilterParams({
        actor: "1",
        action: "appointment.created",
        objectType: "appointment",
        objectId: "12",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-26",
        ordering: "at",
        page: 3,
      }),
    ).toEqual({
      actor: "1",
      action: "appointment.created",
      object_type: "appointment",
      object_id: "12",
      date_from: "2026-10-01",
      date_to: "2026-10-26",
      ordering: "at",
    });
    expect(auditFilterParams({ ordering: "-at", page: 1 }).ordering).toBeUndefined();
  });
});

describe("tashkentIso", () => {
  it("spells an instant with seconds and the +05:00 offset", () => {
    expect(tashkentIso("2026-10-27T05:00:00Z")).toBe("2026-10-27T10:00:00+05:00");
    expect(tashkentIso("2026-10-27T10:00+05:00")).toBe("2026-10-27T10:00:00+05:00");
  });
});
