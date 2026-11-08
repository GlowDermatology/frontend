import "server-only";

import type {
  AudienceSegment,
  NotificationDraft,
  NotificationHistoryQuery,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
  TestDevice,
} from "@/domain/notification";

import { apiListNotifications, apiListTestDevices, apiNotificationMeta } from "./api/admin";
import {
  defaultSchedule,
  mapNotificationMeta,
  mapNotificationRecord,
  mapTestDevice,
  notificationListParams,
} from "./api/mappers/notifications";
import { mapPage } from "./api/mappers/page";
import { getMe, requireApiToken } from "./auth";
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
 * newest schedule first; gap X-NOTIF-HISTORY). The approval workflow adds
 * the signed-in staff member (`auth/me/`: ownership of drafts and the
 * superuser controls), the approval delay and, for a superuser, the test
 * devices (`notifications/test-devices/`).
 */

export interface NotificationsMe {
  id: string;
  isSuperuser: boolean;
}

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
  me: NotificationsMe;
  /** How long an approved campaign waits before the beat may start it. */
  approvalDelayMinutes: number;
  /** The registered test devices; `null` for an ordinary admin (the list is a superuser's). */
  testDevices: ReadonlyArray<TestDevice> | null;
}

/** The signed-in staff member as the page needs it; a lost `auth/me/` counts as an ordinary admin. */
async function currentMe(): Promise<NotificationsMe> {
  const me = await getMe();
  return { id: me ? String(me.id) : "", isSuperuser: Boolean(me?.is_superuser) };
}

/** `GET /api/v1/admin/notifications/meta/` + `GET /api/v1/admin/notifications/?…` (the history page). */
export async function getNotificationsOverview(
  query: NotificationHistoryQuery = { page: 1, pageSize: 20 },
): Promise<NotificationsOverview> {
  const me = await currentMe();
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const [meta, page, now, devices] = await Promise.all([
      apiNotificationMeta(token),
      apiListNotifications(token, notificationListParams(query)),
      requestNow(),
      me.isSuperuser ? apiListTestDevices(token) : null,
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
      me,
      approvalDelayMinutes: mapped.approvalDelayMinutes,
      testDevices: devices ? devices.data.map(mapTestDevice) : null,
    };
  }
  return mock.getNotificationsOverview(query, me);
}
