import type { NotificationHistoryQuery, NotificationRecord } from "@/domain/notification";

import type { NotificationsOverview } from "../notifications";
import { paginate } from "../types";
import {
  DEFAULT_SCHEDULE,
  DRAFT,
  LINK_OPTIONS,
  NOTIFICATION_HISTORY,
  SEGMENTS,
  STATUS_TEMPLATES,
  TOTAL_DEVICES,
} from "./notifications";

function filtered(query: Pick<NotificationHistoryQuery, "state" | "kind">): NotificationRecord[] {
  return NOTIFICATION_HISTORY.filter(
    (record) =>
      (!query.state || record.state === query.state) && (!query.kind || record.kind === query.kind),
  );
}

/** Mock implementation of `src/data/notifications.ts`: the history filtered and paged like `notifications/`. */
export async function getNotificationsOverview(
  query: NotificationHistoryQuery = { page: 1, pageSize: 20 },
): Promise<NotificationsOverview> {
  return {
    history: paginate(filtered(query), query.page, query.pageSize),
    templates: STATUS_TEMPLATES,
    segments: SEGMENTS,
    totalDevices: TOTAL_DEVICES,
    linkOptions: LINK_OPTIONS,
    defaultSchedule: DEFAULT_SCHEDULE,
    draft: DRAFT,
  };
}

/** Every row of the history with the export's filters (`bildirishnomalar`, mock mode). */
export async function exportNotifications(
  query: Pick<NotificationHistoryQuery, "state" | "kind">,
): Promise<NotificationRecord[]> {
  return filtered(query);
}
