import type { OrderStatus } from "./order";
import type { ContentLanguage } from "./product";

export type NotificationKind = "promo" | "general";
export type NotificationAudience = "all" | "group" | "one";
export type NotificationState = "scheduled" | "sent";

export interface NotificationRecord {
  id: string;
  at: string;
  kind: NotificationKind;
  title: string;
  audienceLabel: string;
  sent: number | null;
  delivered: number | null;
  state: NotificationState;
}

export interface StatusTemplate {
  status: Exclude<OrderStatus, "awaiting_payment">;
  text: string;
  translations: Record<ContentLanguage, boolean>;
}

export interface AudienceOption {
  id: NotificationAudience;
  label: string;
  detail: string;
}

export const TITLE_MAX = 60;
export const BODY_MAX = 180;
