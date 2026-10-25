import "server-only";

import type {
  AudienceSegment,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";

import { apiListNotifications, apiNotificationMeta } from "./api/admin";
import {
  defaultSchedule,
  mapNotificationMeta,
  mapNotificationRecord,
} from "./api/mappers/notifications";
import { requireApiToken } from "./auth";
import * as mock from "./mock/notifications.queries";
import { requestNow } from "./now";
import { dataSource } from "./source";

/**
 * Notifications read seam (contract §2.8, §5.5). Dispatches on
 * `dataSource()`: the mock body lives in `./mock/notifications.queries.ts`;
 * the api branch reads `notifications/meta/` (devices, segments, link
 * options, the four status templates) and the first page of
 * `notifications/` (ordered by the backend, newest schedule first).
 */

export interface NotificationsOverview {
  /** The first page of the history (20 rows). */
  history: ReadonlyArray<NotificationRecord>;
  /** All campaigns; more than `history.length` means older ones are not shown. */
  historyTotal: number;
  templates: ReadonlyArray<StatusTemplate>;
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  /** Suggested slot when "Rejalashtirish" is chosen. */
  defaultSchedule: string;
  draft: NotificationDraft | null;
}

export const HISTORY_PAGE_SIZE = 20;

/** `GET /api/v1/admin/notifications/meta/` + `GET /api/v1/admin/notifications/?page_size=20`. */
export async function getNotificationsOverview(): Promise<NotificationsOverview> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const [meta, page, now] = await Promise.all([
      apiNotificationMeta(token),
      apiListNotifications(token, { page_size: HISTORY_PAGE_SIZE }),
      requestNow(),
    ]);
    const mapped = mapNotificationMeta(meta.data);
    return {
      history: page.data.results.map(mapNotificationRecord),
      historyTotal: page.data.count,
      templates: mapped.templates,
      segments: mapped.segments,
      totalDevices: mapped.totalDevices,
      linkOptions: mapped.linkOptions,
      defaultSchedule: defaultSchedule(now),
      // No draft persistence in M1 (contract §5.5).
      draft: null,
    };
  }
  return mock.getNotificationsOverview();
}
