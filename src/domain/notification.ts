import type { OrderStatus } from "./order";
import type { ContentLanguage } from "./product";

export type NotificationKind = "promo" | "general";

/**
 * `queued` = accepted and being sent in batches; counts arrive later.
 * `cancelled` (M3) = a scheduled campaign staff cancelled before its send.
 */
export type NotificationState = "scheduled" | "queued" | "sent" | "cancelled";

export interface NotificationRecord {
  id: string;
  /** `scheduledAt ?? createdAt` (contract §5.5): the time shown in the history. */
  at: string;
  kind: NotificationKind;
  title: string;
  audienceLabel: string;
  /** FCM accepted / failed counts; `null` until the send ran. */
  sent: number | null;
  failed?: number | null;
  /** App acknowledgements; `null` until M2. */
  delivered: number | null;
  state: NotificationState;
  scheduledAt?: string | null;
  sentAt?: string | null;
  /** When staff cancelled the scheduled campaign (M3); `null` otherwise. */
  cancelledAt?: string | null;
  /** Staff display name; absent for the system. */
  author?: string;
  /** The product a tap opens ("Seramidli namlantiruvchi krem"); absent = the app's home. */
  linkLabel?: string;
}

export type TemplateStatus = Exclude<OrderStatus, "awaiting_payment">;

export interface StatusTemplate {
  status: TemplateStatus;
  /** The Uzbek text (shown on the card). */
  text: string;
  translations: Record<ContentLanguage, boolean>;
  /** Every language's text, for the editor (`""` = not filled). */
  texts?: Record<ContentLanguage, string>;
  updatedAt?: string;
  updatedBy?: string | null;
}

/** The only placeholder an order-status template may use (contract §2.8). */
export const TEMPLATE_PLACEHOLDER = "{raqam}";
export const TEMPLATE_UZ_MIN = 5;
export const TEMPLATE_MAX = 180;

/** Placeholders other than `{raqam}` in a template text, e.g. `["{ism}"]`. */
export function unknownPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{[^{}]*\}/g)]
    .map((match) => match[0])
    .filter((token) => token !== TEMPLATE_PLACEHOLDER);
}

/** Push image rules (contract §2.8 "product-image rules", §1.6 field codes). */
export const NOTIFICATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const NOTIFICATION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TOO_LARGE_MESSAGE = "Rasm 5 MB dan oshmasin.";
export const IMAGE_TYPE_MESSAGE = "Faqat JPEG, PNG yoki WebP rasm.";

/** The image problem of a picked file, or `null` when it can be sent. */
export function notificationImageProblem(file: { type: string; size: number }): string | null {
  if (!(NOTIFICATION_IMAGE_TYPES as ReadonlyArray<string>).includes(file.type)) {
    return IMAGE_TYPE_MESSAGE;
  }
  if (file.size > NOTIFICATION_IMAGE_MAX_BYTES) return IMAGE_TOO_LARGE_MESSAGE;
  return null;
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
