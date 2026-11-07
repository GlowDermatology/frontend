import { dispatchEta } from "@/domain/campaign-actions";
import {
  TEMPLATE_PLACEHOLDER,
  unknownPlaceholders,
  type CampaignTest,
  type NotificationLink,
  type NotificationRecord,
  type StatusTemplate,
  type TemplateStatus,
  type TestDevice,
} from "@/domain/notification";
import { formatNumber, formatPhone } from "@/lib/format";

import { referenceNow } from "../config";
import type {
  NotificationInput,
  TemplateTextsInput,
  TestDeviceInput,
} from "../notifications.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import {
  APPROVAL_DELAY_MINUTES,
  campaignRecord,
  LINK_OPTIONS,
  NOTIFICATION_HISTORY,
  SEGMENTS,
  STATUS_TEMPLATES,
  TEST_DEVICES,
  TOTAL_DEVICES,
} from "./notifications";

/**
 * Mock implementation of `src/data/notifications.actions.ts`: every
 * operation of the approval workflow computed over the fixtures with the
 * backend's codes and Uzbek messages, nothing kept. The audience label
 * comes from the fixtures (segment name and size, device count), never from
 * the client. The role check (`permission_denied` for an ordinary admin on a
 * superuser operation) happens before these bodies, in `requireSuperuser`.
 */

/* The backend's messages (`notifications/services.py` module constants). */
export const SEND_STARTED_MESSAGE = "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.";
export const MESSAGE_STALE_REVISION =
  "Xabar o‘zgartirilgan: sahifani yangilab, qayta urinib ko‘ring.";
export const MESSAGE_NOT_TESTED = "Avval test yuboring va qurilmada ko‘rganingizni tasdiqlang.";
export const MESSAGE_NOT_EDITABLE =
  "Faqat qoralama yoki test tasdiqlangan xabarni o‘zgartirish mumkin.";
export const MESSAGE_CANCEL_DRAFT = "Qoralama bekor qilinmaydi: uni o‘chiring yoki tahrirlang.";
export const MESSAGE_NOT_SENDING = "Yuborish ketmayapti: to‘xtatadigan narsa yo‘q.";
export const MESSAGE_NOT_RETURNABLE =
  "Faqat yuborilishi kutilayotgan yoki bekor qilingan xabar qoralamaga qaytariladi.";
export const MESSAGE_TEST_STALE = "Test eski tahrir uchun yuborilgan: qayta test yuboring.";
export const MESSAGE_TEST_UNDELIVERED = "Bu test qurilmaga yetib bormagan: tasdiqlab bo‘lmaydi.";
export const MESSAGE_NO_TEST_DEVICE = "Avval test qurilmasini ro‘yxatga oling.";
export const MESSAGE_CUSTOMER_NOT_FOUND = "Bu raqam bilan mijoz topilmadi.";
export const MESSAGE_DEVICE_NOT_PUSHABLE = "Bu mijozning push yoqilgan qurilmasi yo‘q.";
export const MESSAGE_DEVICE_REGISTERED = "Bu qurilma allaqachon ro‘yxatda.";

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Topilmadi.", code: "not_found" };
const conflict = (error: string): ActionResult<never> => ({ ok: false, error, code: "conflict" });
const invalidTransition = (error: string): ActionResult<never> => ({
  ok: false,
  error,
  code: "invalid_transition",
});

const EDITABLE = new Set<NotificationRecord["state"]>(["draft", "tested"]);
const now = () => referenceNow().toISOString();
const find = (id: string) => NOTIFICATION_HISTORY.find((n) => n.id === id);

function audienceLabel(input: NotificationInput): { label: string; count: number } | null {
  if (input.audience === "all") {
    return { label: `Barcha · ${formatNumber(TOTAL_DEVICES)}`, count: TOTAL_DEVICES };
  }
  if (input.audience === "group") {
    const segment = SEGMENTS.find((s) => s.id === input.segmentId);
    return segment
      ? { label: `${segment.name} · ${formatNumber(segment.size)}`, count: segment.size }
      : null;
  }
  return { label: `Bitta mijoz · ${formatPhone(input.phone)}`, count: 1 };
}

const SEGMENT_MISSING: ActionResult<never> = {
  ok: false,
  error: "Guruh topilmadi.",
  fieldErrors: { segmentId: "Guruhni tanlang." },
};

function linkOf(input: NotificationInput): NotificationLink {
  const { link } = input;
  if (link.kind !== "product") return link;
  const option = LINK_OPTIONS.find((o) => o.kind === "product" && o.productId === link.productId);
  return option?.kind === "product"
    ? option
    : { kind: "product", productId: link.productId, label: `Mahsulot #${link.productId}` };
}

function linkFields(link: NotificationLink): Pick<NotificationRecord, "linkLabel" | "linkUrl"> {
  if (link.kind === "product") return { linkLabel: link.label };
  if (link.kind === "url") return { linkUrl: link.url };
  return {};
}

function audienceOf(input: NotificationInput): NotificationRecord["audience"] {
  if (input.audience === "group") return { type: "group", segmentId: input.segmentId };
  if (input.audience === "one") return { type: "one", phone: input.phone };
  return { type: "all" };
}

/** `POST notifications/`: the draft the demo's Administrator just saved. */
export async function saveNotificationDraft(
  input: NotificationInput,
): Promise<ActionResult<NotificationRecord>> {
  await delay(600);
  const audience = audienceLabel(input);
  if (audience === null) return SEGMENT_MISSING;
  const at = now();
  const link = linkOf(input);
  return {
    ok: true,
    data: campaignRecord({
      id: `n-${crypto.randomUUID()}`,
      at: input.scheduledAt ?? at,
      createdAt: at,
      kind: input.kind,
      title: input.title,
      body: input.body,
      audienceLabel: audience.label,
      recipientCount: audience.count,
      audience: audienceOf(input),
      link,
      imageUrl: input.image ? `/demo/${input.image.name}` : null,
      scheduledAt: input.scheduledAt,
      author: "Administrator",
      authorId: "1",
      ...linkFields(link),
    }),
  };
}

/**
 * `PATCH notifications/{id}/`: the draft with the change. A content or
 * audience change bumps the revision and drops the test confirmation (the
 * campaign is a `draft` again); a schedule-only change keeps both.
 */
export async function updateNotificationDraft(
  id: string,
  input: NotificationInput,
  expectedRevision: number,
): Promise<ActionResult<NotificationRecord>> {
  await delay(600);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (!EDITABLE.has(record.state)) return invalidTransition(MESSAGE_NOT_EDITABLE);
  if (record.revision !== expectedRevision) return conflict(MESSAGE_STALE_REVISION);
  const audience = audienceLabel(input);
  if (audience === null) return SEGMENT_MISSING;
  const link = linkOf(input);
  const nextAudience = audienceOf(input);
  const contentChanged =
    record.kind !== input.kind ||
    record.title !== input.title ||
    record.body !== input.body ||
    JSON.stringify(record.link) !== JSON.stringify(link) ||
    JSON.stringify(record.audience) !== JSON.stringify(nextAudience) ||
    input.image !== null ||
    input.removeImage;
  const at = now();
  const next: NotificationRecord = {
    ...record,
    at: input.scheduledAt ?? record.createdAt,
    kind: input.kind,
    title: input.title,
    body: input.body,
    audienceLabel: audience.label,
    recipientCount: audience.count,
    audience: nextAudience,
    link,
    imageUrl: input.image
      ? `/demo/${input.image.name}`
      : input.removeImage
        ? null
        : record.imageUrl,
    scheduledAt: input.scheduledAt,
    updatedAt: at,
    linkLabel: undefined,
    linkUrl: undefined,
    ...linkFields(link),
  };
  if (contentChanged) {
    next.revision = record.revision + 1;
    next.state = "draft";
    next.testedRevision = null;
    next.testConfirmedAt = null;
  }
  return { ok: true, data: next };
}

/** `DELETE notifications/{id}/`: a draft or tested campaign is gone (204). */
export async function deleteNotificationDraft(id: string): Promise<ActionResult<{ id: string }>> {
  await delay(450);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (!EDITABLE.has(record.state)) return invalidTransition(MESSAGE_NOT_EDITABLE);
  return { ok: true, data: { id } };
}

/**
 * `POST notifications/{id}/test/`: one `CampaignTest` per chosen device for
 * the current revision; the fake FCM accepts a pushable device and refuses
 * one that lost its token (`unregistered`).
 */
export async function sendCampaignTest(
  id: string,
  deviceIds: ReadonlyArray<string>,
): Promise<ActionResult<NotificationRecord>> {
  await delay(700);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (!EDITABLE.has(record.state)) return invalidTransition(MESSAGE_NOT_EDITABLE);
  const devices = deviceIds.map((deviceId) => TEST_DEVICES.find((d) => d.id === deviceId));
  if (devices.length === 0 || devices.some((d) => d === undefined)) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { deviceIds: MESSAGE_NO_TEST_DEVICE },
    };
  }
  const sentAt = now();
  const tests: CampaignTest[] = (devices as TestDevice[]).map((device, index) => ({
    id: `t-${crypto.randomUUID()}-${index}`,
    revision: record.revision,
    deviceLabel: device.label,
    phone: device.phone,
    sentAt,
    sentBy: "Administrator",
    fcmOk: device.isPushable,
    fcmError: device.isPushable ? null : "unregistered",
    confirmedAt: null,
    confirmedBy: null,
  }));
  return { ok: true, data: { ...record, updatedAt: sentAt, tests: [...record.tests, ...tests] } };
}

/** `POST notifications/{id}/tests/{test_id}/confirm/`: the campaign becomes `tested` for that revision. */
export async function confirmCampaignTest(
  id: string,
  testId: string,
): Promise<ActionResult<NotificationRecord>> {
  await delay(450);
  const record = find(id);
  if (!record) return NOT_FOUND;
  const test = record.tests.find((t) => t.id === testId);
  if (!test) return NOT_FOUND;
  if (test.confirmedAt) return { ok: true, data: record };
  if (!EDITABLE.has(record.state)) return invalidTransition(MESSAGE_NOT_EDITABLE);
  if (test.revision !== record.revision) return conflict(MESSAGE_TEST_STALE);
  if (test.fcmOk !== true) return conflict(MESSAGE_TEST_UNDELIVERED);
  const at = now();
  return {
    ok: true,
    data: {
      ...record,
      state: "tested",
      testedRevision: record.revision,
      testConfirmedAt: at,
      updatedAt: at,
      tests: record.tests.map((t) =>
        t.id === testId ? { ...t, confirmedAt: at, confirmedBy: "Administrator" } : t,
      ),
    },
  };
}

/**
 * `POST notifications/{id}/approve/`: a tested campaign of that revision
 * waits for `dispatch_after` (the approval delay, or the requested time when
 * later). Nothing is sent. A repeat on the waiting campaign answers it
 * unchanged.
 */
export async function approveNotification(
  id: string,
  expectedRevision: number,
): Promise<ActionResult<NotificationRecord>> {
  await delay(600);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (record.state === "scheduled" && record.approvedRevision === expectedRevision) {
    return { ok: true, data: record };
  }
  if (record.state !== "tested") {
    return record.state === "draft"
      ? invalidTransition(MESSAGE_NOT_TESTED)
      : invalidTransition(SEND_STARTED_MESSAGE);
  }
  if (record.revision !== expectedRevision || record.testedRevision !== record.revision) {
    return conflict(MESSAGE_STALE_REVISION);
  }
  const at = now();
  const dispatchAfter = dispatchEta(at, APPROVAL_DELAY_MINUTES, record.scheduledAt).toISOString();
  return {
    ok: true,
    data: {
      ...record,
      at: dispatchAfter,
      state: "scheduled",
      approvedAt: at,
      approvedBy: "Administrator",
      approvedRevision: record.revision,
      dispatchAfter,
      updatedAt: at,
    },
  };
}

/** `POST notifications/{id}/return-to-draft/`: a waiting or cancelled campaign that never started. */
export async function returnNotificationToDraft(
  id: string,
): Promise<ActionResult<NotificationRecord>> {
  await delay(450);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (record.state === "draft") return { ok: true, data: record };
  if (!(record.state === "scheduled" || record.state === "cancelled") || record.startedAt) {
    return invalidTransition(MESSAGE_NOT_RETURNABLE);
  }
  const at = now();
  return {
    ok: true,
    data: {
      ...record,
      at: record.scheduledAt ?? record.createdAt,
      state: "draft",
      revision: record.revision + 1,
      testedRevision: null,
      testConfirmedAt: null,
      approvedAt: null,
      approvedBy: null,
      approvedRevision: null,
      dispatchAfter: null,
      cancelledAt: null,
      updatedAt: at,
    },
  };
}

/**
 * Cancel with the backend's answers over the fixtures: a waiting campaign
 * comes back cancelled (an already cancelled one unchanged), a draft is a
 * 409 (delete or edit it instead), a started one the 409 `conflict`, an
 * unknown id — including a draft saved in this demo, which lives only in
 * the page's state — a 404. Nothing is kept.
 */
export async function cancelNotification(id: string): Promise<ActionResult<NotificationRecord>> {
  await delay(450);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (record.state === "cancelled") return { ok: true, data: record };
  if (EDITABLE.has(record.state)) return conflict(MESSAGE_CANCEL_DRAFT);
  if (record.state !== "scheduled") return conflict(SEND_STARTED_MESSAGE);
  return {
    ok: true,
    data: { ...record, state: "cancelled", cancelledAt: now(), updatedAt: now() },
  };
}

/** `POST notifications/{id}/stop/`: a sending campaign is `stopping` (a repeat answers it unchanged). */
export async function stopNotification(id: string): Promise<ActionResult<NotificationRecord>> {
  await delay(450);
  const record = find(id);
  if (!record) return NOT_FOUND;
  if (record.state === "stopping") return { ok: true, data: record };
  if (record.state !== "sending") return conflict(MESSAGE_NOT_SENDING);
  const at = now();
  return {
    ok: true,
    data: { ...record, state: "stopping", stopRequestedAt: at, updatedAt: at },
  };
}

/**
 * `POST notifications/test-devices/`: the customer's latest pushable device
 * by phone. The demo answers the backend's field errors for a phone ending
 * in `0000` (no customer) or `9999` (no pushable device) and for a phone
 * already registered.
 */
export async function registerTestDevice(
  input: TestDeviceInput,
): Promise<ActionResult<TestDevice>> {
  await delay(600);
  const refuse = (message: string): ActionResult<never> => ({
    ok: false,
    error: "Maydonlarni tekshiring.",
    code: "validation_error",
    fieldErrors: { phone: message },
  });
  if (input.phone.endsWith("0000")) return refuse(MESSAGE_CUSTOMER_NOT_FOUND);
  if (input.phone.endsWith("9999")) return refuse(MESSAGE_DEVICE_NOT_PUSHABLE);
  if (TEST_DEVICES.some((d) => d.phone === input.phone)) return refuse(MESSAGE_DEVICE_REGISTERED);
  return {
    ok: true,
    data: {
      id: `td-${crypto.randomUUID()}`,
      phone: input.phone,
      label: input.label,
      isPushable: true,
      registeredBy: "Administrator",
      registeredAt: now(),
    },
  };
}

/** `DELETE notifications/test-devices/{id}/`: soft and idempotent (204 either way). */
export async function removeTestDevice(id: string): Promise<ActionResult<{ id: string }>> {
  await delay(400);
  return { ok: true, data: { id } };
}

const PLACEHOLDER_MESSAGE = `Faqat ${TEMPLATE_PLACEHOLDER} o‘rinbosari ishlatiladi.`;

/**
 * Template update with the backend's placeholder rule (`unknown_placeholder`
 * on the offending language); nothing is kept.
 */
export async function updateNotificationTemplate(
  status: TemplateStatus,
  texts: TemplateTextsInput,
): Promise<ActionResult<StatusTemplate>> {
  await delay(450);
  const fieldErrors: Record<string, string> = {};
  for (const language of ["uz", "ru", "en"] as const) {
    if (unknownPlaceholders(texts[language]).length > 0) {
      fieldErrors[`texts.${language}`] = PLACEHOLDER_MESSAGE;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Maydonlarni tekshiring.", code: "validation_error", fieldErrors };
  }
  const current = STATUS_TEMPLATES.find((t) => t.status === status);
  return {
    ok: true,
    data: {
      ...(current ?? { status }),
      status,
      text: texts.uz,
      translations: {
        uz: texts.uz.trim() !== "",
        ru: texts.ru.trim() !== "",
        en: texts.en.trim() !== "",
      },
      texts: { ...texts },
      updatedAt: referenceNow().toISOString(),
      updatedBy: "Administrator",
    },
  };
}
