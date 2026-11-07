import type {
  AudienceSegment,
  CampaignTest,
  NotificationAudience,
  NotificationHistoryQuery,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
  TestDevice,
} from "@/domain/notification";
import { addDays, formatNumber, formatPhone, toLocalIsoDate } from "@/lib/format";

import type { NotificationInput } from "../../notifications.actions";
import type {
  ApiCampaignTest,
  ApiNotificationMeta,
  ApiNotificationRecord,
  ApiStatusTemplate,
  ApiTestDevice,
} from "../types";
import { actorName, idString, tashkentIso } from "./common";
import type { FieldRemap } from "./errors";
import { TOP_LEVEL_ERROR } from "./errors";

/**
 * Notifications (contract §2.8) → the FE domain types, display rules of §5.5,
 * and the multipart body of `POST notifications/` built from the validated
 * composer input (§7.12: audience `group` → `segment`, `one` → `customer`).
 */

/** "Barcha · 4 751", "Doimiy mijozlar · 612", "Bitta mijoz · +998 90 123 45 67". */
export function notificationAudienceLabel(api: ApiNotificationRecord): string {
  const { audience } = api;
  if (audience.type === "segment") {
    return `${audience.segment_name ?? "Guruh"} · ${formatNumber(api.recipient_count)}`;
  }
  if (audience.type === "customer") {
    return `Bitta mijoz · ${audience.phone ? formatPhone(audience.phone) : "—"}`;
  }
  return `Barcha · ${formatNumber(api.recipient_count)}`;
}

function audienceOf(api: ApiNotificationRecord): NotificationAudience {
  const { audience } = api;
  if (audience.type === "segment" && audience.segment_id !== null) {
    return { type: "group", segmentId: idString(audience.segment_id) };
  }
  if (audience.type === "customer" && audience.phone) return { type: "one", phone: audience.phone };
  return { type: "all" };
}

function linkOf(api: ApiNotificationRecord): NotificationLink {
  const { link } = api;
  if (link.kind === "product" && link.product_id !== null) {
    return { kind: "product", productId: idString(link.product_id), label: link.label ?? "" };
  }
  if (link.kind === "url" && link.url) return { kind: "url", url: link.url };
  return { kind: "none" };
}

export function mapCampaignTest(api: ApiCampaignTest): CampaignTest {
  return {
    id: idString(api.id),
    revision: api.revision,
    deviceLabel: api.device_label,
    sentAt: api.sent_at,
    sentBy: actorName(api.sent_by),
    fcmOk: api.fcm_ok,
    fcmError: api.fcm_error || null,
    confirmedAt: api.confirmed_at,
    confirmedBy: actorName(api.confirmed_by),
  };
}

/**
 * The record of the approval workflow. `at` is the requested `scheduled_at`,
 * else `created_at` — the key the backend orders the history by (§5.5), so
 * the dates read in the row order; the panel shows `dispatch_after` itself.
 * A state this build does not know (a newer backend) is kept as is: the
 * history shows it with a neutral badge and offers nothing.
 */
export function mapNotificationRecord(api: ApiNotificationRecord): NotificationRecord {
  const author = actorName(api.author);
  const link = linkOf(api);
  const record: NotificationRecord = {
    id: idString(api.id),
    at: api.scheduled_at ?? api.created_at,
    kind: api.kind,
    title: api.title,
    body: api.body,
    audienceLabel: notificationAudienceLabel(api),
    recipientCount: api.recipient_count,
    audience: audienceOf(api),
    link,
    imageUrl: api.image_url,
    sent: api.sent,
    failed: api.failed,
    attempted: api.attempted ?? null,
    delivered: api.delivered,
    // A state this build does not know is kept: `notificationStateLabel` shows it as is.
    state: api.state,
    revision: api.revision ?? 1,
    testedRevision: api.tested_revision ?? null,
    testConfirmedAt: api.test_confirmed_at ?? null,
    approvedAt: api.approved_at ?? null,
    approvedBy: actorName(api.approved_by),
    approvedRevision: api.approved_revision ?? null,
    dispatchAfter: api.dispatch_after ?? null,
    scheduledAt: api.scheduled_at,
    startedAt: api.started_at ?? null,
    sentAt: api.sent_at,
    stopRequestedAt: api.stop_requested_at ?? null,
    stoppedAt: api.stopped_at ?? null,
    failedAt: api.failed_at ?? null,
    cancelledAt: api.cancelled_at,
    lastError: api.last_error || null,
    createdAt: api.created_at,
    updatedAt: api.updated_at ?? api.created_at,
    authorId: api.author ? idString(api.author.id) : null,
    tests: (api.tests ?? []).map(mapCampaignTest),
  };
  if (author) record.author = author;
  if (link.kind === "product" && link.label) record.linkLabel = link.label;
  if (link.kind === "url") record.linkUrl = link.url;
  return record;
}

export function mapTestDevice(api: ApiTestDevice): TestDevice {
  return {
    id: idString(api.id),
    phone: api.phone,
    label: api.label,
    isPushable: api.is_pushable,
    registeredBy: actorName(api.registered_by),
    registeredAt: api.created_at,
  };
}

/** The history's URL query → `GET notifications/` parameters (contract §2.8; no search). */
export function notificationListParams(
  query: Omit<NotificationHistoryQuery, "page" | "pageSize"> &
    Partial<Pick<NotificationHistoryQuery, "page" | "pageSize">>,
): Record<string, string | number | undefined> {
  return {
    state: query.state,
    kind: query.kind,
    page: query.page,
    page_size: query.pageSize,
  };
}

export function mapStatusTemplate(api: ApiStatusTemplate): StatusTemplate {
  return {
    status: api.status,
    text: api.texts.uz,
    translations: {
      uz: api.texts.uz.trim() !== "",
      ru: api.texts.ru.trim() !== "",
      en: api.texts.en.trim() !== "",
    },
    texts: { uz: api.texts.uz, ru: api.texts.ru, en: api.texts.en },
    updatedAt: api.updated_at,
    updatedBy: actorName(api.updated_by),
  };
}

export interface NotificationMeta {
  totalDevices: number;
  segments: AudienceSegment[];
  linkOptions: NotificationLink[];
  templates: StatusTemplate[];
  /** `CAMPAIGN_APPROVAL_DELAY_MINUTES`: how long an approved campaign waits before the beat may start it. */
  approvalDelayMinutes: number;
}

export function mapNotificationMeta(api: ApiNotificationMeta): NotificationMeta {
  return {
    approvalDelayMinutes: api.approval_delay_minutes,
    totalDevices: api.total_devices,
    segments: api.segments.map((s) => ({ id: idString(s.id), name: s.name, size: s.size })),
    linkOptions: [
      { kind: "none" },
      ...api.link_options.map((o) => ({
        kind: "product" as const,
        productId: idString(o.product_id),
        label: o.label,
      })),
    ],
    templates: api.templates.map(mapStatusTemplate),
  };
}

/** The suggested "Rejalashtirish" slot: the next Tashkent day at 10:00 relative to the server's now. */
export function defaultSchedule(now: Date): string {
  return `${addDays(toLocalIsoDate(now), 1)}T10:00:00+05:00`;
}

/**
 * Multipart body of `POST notifications/` and `PATCH notifications/{id}/`
 * (dotted keys, contract §2.8). Only the keys the audience and link need are
 * sent; `scheduled_at` is an aware Tashkent ISO time, absent when no time
 * was requested (the PATCH sends it empty, so a requested time can be
 * cleared). An update carries `expected_revision` and, when the image is to
 * go, `remove_image`.
 */
export function notificationFormData(
  input: NotificationInput,
  update?: { expectedRevision: number },
): FormData {
  const form = new FormData();
  if (update) {
    form.set("expected_revision", String(update.expectedRevision));
    if (input.removeImage) form.set("remove_image", "true");
  }
  form.set("kind", input.kind);
  form.set("title", input.title);
  form.set("body", input.body);
  if (input.image) form.set("image", input.image, input.image.name);
  form.set("link.kind", input.link.kind);
  if (input.link.kind === "product") form.set("link.product_id", input.link.productId);
  if (input.link.kind === "url") form.set("link.url", input.link.url);
  if (input.audience === "group") {
    form.set("audience.type", "segment");
    form.set("audience.segment_id", input.segmentId);
  } else if (input.audience === "one") {
    form.set("audience.type", "customer");
    form.set("audience.phone", input.phone);
  } else {
    form.set("audience.type", "all");
  }
  if (input.scheduledAt) form.set("scheduled_at", tashkentIso(input.scheduledAt));
  else if (update) form.set("scheduled_at", "");
  return form;
}

/** Contract §7.1 `sendNotification` remap; an image problem is the top-level error. */
export const NOTIFICATION_FIELD_REMAP: FieldRemap = {
  "audience.phone": "phone",
  "audience.segment_id": "segmentId",
  "audience.type": "audience",
  "link.url": "linkUrl",
  "link.*": "link",
  scheduled_at: "scheduledAt",
  expected_revision: TOP_LEVEL_ERROR,
  image: TOP_LEVEL_ERROR,
};
