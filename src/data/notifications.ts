import "server-only";

import type {
  AudienceSegment,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";

import {
  DEFAULT_SCHEDULE,
  DRAFT,
  LINK_OPTIONS,
  NOTIFICATION_HISTORY,
  SEGMENTS,
  STATUS_TEMPLATES,
  TOTAL_DEVICES,
} from "./mock/notifications";

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
