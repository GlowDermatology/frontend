import "server-only";

import type {
  AudienceSegment,
  NotificationDraft,
  NotificationHistoryQuery,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";

import { apiListNotifications, apiNotificationMeta } from "./api/admin";
import {
  defaultSchedule,
  mapNotificationMeta,
  mapNotificationRecord,
  notificationListParams,
} from "./api/mappers/notifications";
import { mapPage } from "./api/mappers/page";
import { requireApiToken } from "./auth";
import * as mock from "./mock/notifications.queries";
import { requestNow } from "./now";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Notifications read seam (contract §2.8, §5.5). Dispatches on
 * `dataSource()`: the mock body lives in `./mock/notifications.queries.ts`;
 * the api branch reads `notifications/meta/` (devices, segments, link
 * options, the four status templates) and the history page the URL names
 * (`notifications/?state=&kind=&page=&page_size=`, ordered by the backend,
 * newest schedule first; gap X-NOTIF-HISTORY).
 */

export interface NotificationsOverview {
  /** The requested page of the history. */
  history: Page<NotificationRecord>;
  templates: ReadonlyArray<StatusTemplate>;
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  /** Suggested slot when "Rejalashtirish" is chosen. */
  defaultSchedule: string;
  draft: NotificationDraft | null;
}

/** `GET /api/v1/admin/notifications/meta/` + `GET /api/v1/admin/notifications/?…` (the history page). */
export async function getNotificationsOverview(
  query: NotificationHistoryQuery = { page: 1, pageSize: 20 },
): Promise<NotificationsOverview> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const [meta, page, now] = await Promise.all([
      apiNotificationMeta(token),
      apiListNotifications(token, notificationListParams(query)),
      requestNow(),
    ]);
    const mapped = mapNotificationMeta(meta.data);
    return {
      history: mapPage(page.data, mapNotificationRecord),
      templates: mapped.templates,
      segments: mapped.segments,
      totalDevices: mapped.totalDevices,
      linkOptions: mapped.linkOptions,
      defaultSchedule: defaultSchedule(now),
      // No draft persistence in M1 (contract §5.5).
      draft: null,
    };
  }
  return mock.getNotificationsOverview(query);
}
