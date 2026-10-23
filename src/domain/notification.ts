import type { OrderStatus } from "./order";
import type { ContentLanguage } from "./product";

export type NotificationKind = "promo" | "general";

/** `queued` = accepted and being sent in batches; counts arrive later. */
export type NotificationState = "scheduled" | "queued" | "sent";

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

/** Customer segment that can receive a push (size = devices with push on). */
export interface AudienceSegment {
  id: string;
  name: string;
  size: number;
}

export type NotificationLink =
  { kind: "none" } | { kind: "product"; productId: string; label: string };

export type NotificationAudience =
  { type: "all" } | { type: "group"; segmentId: string } | { type: "one"; phone: string };

export interface NotificationDraft {
  kind: NotificationKind;
  title: string;
  body: string;
  link: NotificationLink;
}

export const TITLE_MAX = 60;
export const BODY_MAX = 180;
