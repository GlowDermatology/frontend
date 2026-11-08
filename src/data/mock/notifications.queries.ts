import type {
  NotificationHistoryQuery,
  NotificationRecord,
  TestDevice,
} from "@/domain/notification";

import type { NotificationsOverview } from "../notifications";
import { paginate } from "../types";
import {
  APPROVAL_DELAY_MINUTES,
  DEFAULT_SCHEDULE,
  DRAFT,
  LINK_OPTIONS,
  NOTIFICATION_HISTORY,
  SEGMENTS,
  STATUS_TEMPLATES,
  TEST_DEVICES,
  TOTAL_DEVICES,
} from "./notifications";

function filtered(query: Pick<NotificationHistoryQuery, "state" | "kind">): NotificationRecord[] {
  return NOTIFICATION_HISTORY.filter(
    (record) =>
      (!query.state || record.state === query.state) && (!query.kind || record.kind === query.kind),
  );
}

/**
 * Mock implementation of `src/data/notifications.ts`: the history filtered
 * and paged like `notifications/`; the test devices only for a superuser,
 * as `notifications/test-devices/` is theirs alone.
 */
export async function getNotificationsOverview(
  query: NotificationHistoryQuery,
  me: NotificationsOverview["me"],
): Promise<NotificationsOverview> {
  return {
    history: paginate(filtered(query), query.page, query.pageSize),
    templates: STATUS_TEMPLATES,
    segments: SEGMENTS,
    totalDevices: TOTAL_DEVICES,
    linkOptions: LINK_OPTIONS,
    defaultSchedule: DEFAULT_SCHEDULE,
    draft: DRAFT,
    me,
    approvalDelayMinutes: APPROVAL_DELAY_MINUTES,
    testDevices: me.isSuperuser ? (TEST_DEVICES as ReadonlyArray<TestDevice>) : null,
  };
}

/** Every row of the history with the export's filters (`bildirishnomalar`, mock mode). */
export async function exportNotifications(
  query: Pick<NotificationHistoryQuery, "state" | "kind">,
): Promise<NotificationRecord[]> {
  return filtered(query);
}
