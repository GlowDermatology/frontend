import "server-only";

import type { AudienceOption, NotificationRecord, StatusTemplate } from "@/domain/notification";

import {
  AUDIENCES,
  DEFAULT_SCHEDULE,
  DRAFT_LINK,
  NOTIFICATION_HISTORY,
  STATUS_TEMPLATES,
} from "./mock/notifications";

export interface NotificationsOverview {
  history: ReadonlyArray<NotificationRecord>;
  templates: ReadonlyArray<StatusTemplate>;
  audiences: ReadonlyArray<AudienceOption>;
  defaultSchedule: string;
  draftLink: { kind: "product"; label: string };
}

/** `GET /api/v1/admin/notifications/` plus templates and audience sizes. */
export async function getNotificationsOverview(): Promise<NotificationsOverview> {
  return {
    history: NOTIFICATION_HISTORY,
    templates: STATUS_TEMPLATES,
    audiences: AUDIENCES,
    defaultSchedule: DEFAULT_SCHEDULE,
    draftLink: DRAFT_LINK,
  };
}
