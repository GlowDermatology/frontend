import type { OrderStatus } from "./order";
import type { ContentLanguage } from "./product";

export type NotificationKind = "promo" | "general";

/**
 * Campaign approval workflow (contract §2.8, campaign approval): a campaign
 * is a `draft` until a superuser sends a test push, confirms it on the
 * device (`tested`), approves it (`scheduled`: it waits for `dispatchAfter`,
 * the approval delay after the approval or the author's requested time,
 * whichever is later) and the beat starts the send (`sending`). A superuser
 * can cancel it while it waits, stop it while it sends (`stopping`, then
 * `partially_sent` or `cancelled`), or return a waiting or cancelled one to
 * `draft`. `sent` = every batch ran; `failed` = the send died.
 */
export type NotificationState =
  | "draft"
  | "tested"
  | "scheduled"
  | "sending"
  | "stopping"
  | "sent"
  | "partially_sent"
  | "cancelled"
  | "failed";

/** One test push of a campaign to a registered staff device (`CampaignTest`). */
export interface CampaignTest {
  id: string;
  /** The content revision the test was sent for; a confirmation counts for that revision only. */
  revision: number;
  deviceLabel: string;
  phone: string;
  sentAt: string;
  sentBy: string | null;
  /** `null` while FCM has not answered; `true` accepted; `false` refused (`fcmError` says why). */
  fcmOk: boolean | null;
  fcmError: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

/** A customer-app device a superuser registered by phone as a test target. */
export interface TestDevice {
  id: string;
  phone: string;
  label: string;
  /** Whether the device can still receive a push (active, push on, token). */
  isPushable: boolean;
  registeredBy: string | null;
  registeredAt: string | null;
}

export interface NotificationRecord {
  id: string;
  /** `dispatchAfter ?? scheduledAt ?? createdAt` (contract §5.5): the time shown in the history. */
  at: string;
  kind: NotificationKind;
  title: string;
  body: string;
  audienceLabel: string;
  /** Devices the audience resolves to when the record was read (estimate until the send). */
  recipientCount: number;
  audience: NotificationAudience;
  link: NotificationLink;
  imageUrl: string | null;
  /** FCM accepted / failed counts; `null` until the send ran (live tallies during it). */
  sent: number | null;
  failed: number | null;
  /** `sent + failed`, `null` until the send started. */
  attempted: number | null;
  /** App acknowledgements; `null` until M2. */
  delivered: number | null;
  state: NotificationState;
  /** Bumped on every content or audience change; tests and approvals name it. */
  revision: number;
  testedRevision: number | null;
  testConfirmedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedRevision: number | null;
  /** When the beat may start the send (approval delay, or the requested time). */
  dispatchAfter: string | null;
  /** The author's requested send time (optional). */
  scheduledAt: string | null;
  startedAt: string | null;
  sentAt: string | null;
  stopRequestedAt: string | null;
  stoppedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  /** Staff display name; absent for the system. */
  author?: string;
  /** The author's staff id (ownership of a draft); `null` for the system. */
  authorId: string | null;
  /** The product a tap opens ("Seramidli namlantiruvchi krem"); absent = the app's home. */
  linkLabel?: string;
  /** The `https` page a tap opens (gap ADM-10.1, link kind `url`). */
  linkUrl?: string;
  tests: CampaignTest[];
}

/** The history's filters and page (URL state of `/admin/notifications`, contract §2.8). */
export const NOTIFICATION_STATES: ReadonlyArray<NotificationState> = [
  "draft",
  "tested",
  "scheduled",
  "sending",
  "stopping",
  "sent",
  "partially_sent",
  "cancelled",
  "failed",
];
export const NOTIFICATION_KINDS: ReadonlyArray<NotificationKind> = ["promo", "general"];
export const NOTIFICATION_PAGE_SIZES = [20, 50] as const;
export type NotificationPageSize = (typeof NOTIFICATION_PAGE_SIZES)[number];

export interface NotificationHistoryQuery {
  state?: NotificationState;
  kind?: NotificationKind;
  page: number;
  pageSize: NotificationPageSize;
}

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  promo: "Aksiya",
  general: "Umumiy",
};

export const NOTIFICATION_STATE_LABEL: Record<NotificationState, string> = {
  draft: "Qoralama",
  tested: "Test tasdiqlangan",
  scheduled: "Rejalashtirilgan",
  sending: "Yuborilmoqda",
  stopping: "To‘xtatilmoqda",
  sent: "Yuborildi",
  partially_sent: "Qisman yuborildi",
  cancelled: "Bekor qilindi",
  failed: "Yuborilmadi",
};

export function isNotificationState(value: string): value is NotificationState {
  return (NOTIFICATION_STATES as ReadonlyArray<string>).includes(value);
}

/** The label of a state, or the raw value for one this build does not know (a newer backend). */
export function notificationStateLabel(state: string): string {
  return isNotificationState(state) ? NOTIFICATION_STATE_LABEL[state] : state;
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
  | { kind: "none" }
  | { kind: "product"; productId: string; label: string }
  | { kind: "url"; url: string };

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
