import type {
  AudienceSegment,
  NotificationHistoryQuery,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";
import { addDays, formatNumber, formatPhone, toLocalIsoDate } from "@/lib/format";

import type { NotificationInput } from "../../notifications.actions";
import type { ApiNotificationMeta, ApiNotificationRecord, ApiStatusTemplate } from "../types";
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

export function mapNotificationRecord(api: ApiNotificationRecord): NotificationRecord {
  const author = actorName(api.author);
  const record: NotificationRecord = {
    id: idString(api.id),
    at: api.scheduled_at ?? api.created_at,
    kind: api.kind,
    title: api.title,
    audienceLabel: notificationAudienceLabel(api),
    sent: api.sent,
    failed: api.failed,
    delivered: api.delivered,
    state: api.state,
    scheduledAt: api.scheduled_at,
    sentAt: api.sent_at,
    // Absent before M3 (no cancel endpoint): `canCancelCampaign` offers nothing then.
    cancelledAt: "cancelled_at" in api ? api.cancelled_at : undefined,
  };
  if (author) record.author = author;
  if (api.link.kind === "product" && api.link.label) record.linkLabel = api.link.label;
  if (api.link.kind === "url" && api.link.url) record.linkUrl = api.link.url;
  return record;
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
}

export function mapNotificationMeta(api: ApiNotificationMeta): NotificationMeta {
  return {
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
 * Multipart body of `POST notifications/` (dotted keys, contract §2.8). Only
 * the keys the audience and link need are sent; `scheduled_at` is an aware
 * Tashkent ISO time, absent for "send now".
 */
export function notificationFormData(input: NotificationInput): FormData {
  const form = new FormData();
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
  image: TOP_LEVEL_ERROR,
};
