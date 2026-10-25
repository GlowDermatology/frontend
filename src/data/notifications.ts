import "server-only";

import type {
  AudienceSegment,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";
import { addDays, toLocalIsoDate } from "@/lib/format";

import * as mock from "./mock/notifications.queries";
import { requestNow } from "./now";
import { dataSource, notWiredYet } from "./source";

/**
 * Notifications read seam. Dispatches on `dataSource()`: the mock body lives
 * in `./mock/notifications.queries.ts`; the api branch is not wired yet (F2)
 * and returns an empty overview via `notWiredYet`.
 */

export interface NotificationsOverview {
  history: ReadonlyArray<NotificationRecord>;
  templates: ReadonlyArray<StatusTemplate>;
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  /** Suggested slot when "Rejalashtirish" is chosen. */
  defaultSchedule: string;
  draft: NotificationDraft | null;
}

/** `GET /api/v1/admin/notifications/` plus templates, segments and the saved draft. */
export async function getNotificationsOverview(): Promise<NotificationsOverview> {
  if ((await dataSource()) === "api") {
    const now = await requestNow();
    return notWiredYet("notifications", {
      history: [],
      templates: [],
      segments: [],
      totalDevices: 0,
      linkOptions: [],
      // Tomorrow 10:00 Tashkent, the same rule the fixtures follow.
      defaultSchedule: `${addDays(toLocalIsoDate(now), 1)}T10:00:00+05:00`,
      draft: null,
    });
  }
  return mock.getNotificationsOverview();
}
