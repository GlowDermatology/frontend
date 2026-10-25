import type { NotificationsOverview } from "../notifications";
import {
  DEFAULT_SCHEDULE,
  DRAFT,
  LINK_OPTIONS,
  NOTIFICATION_HISTORY,
  SEGMENTS,
  STATUS_TEMPLATES,
  TOTAL_DEVICES,
} from "./notifications";

/** Mock implementation of `src/data/notifications.ts`. */
export async function getNotificationsOverview(): Promise<NotificationsOverview> {
  return {
    history: NOTIFICATION_HISTORY,
    templates: STATUS_TEMPLATES,
    segments: SEGMENTS,
    totalDevices: TOTAL_DEVICES,
    linkOptions: LINK_OPTIONS,
    defaultSchedule: DEFAULT_SCHEDULE,
    draft: DRAFT,
  };
}
