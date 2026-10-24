/**
 * Push notification mutations.
 *
 * Demo mode: validates and returns the history record after a short delay;
 * nothing is sent. With the API this becomes a Server Action posting to
 * `POST /api/v1/admin/notifications/`; the backend queues the Firebase sends
 * in batches and later fills in sent/delivered counts.
 */
import {
  BODY_MAX,
  TITLE_MAX,
  type NotificationDraft,
  type NotificationRecord,
} from "@/domain/notification";

import { referenceNow } from "./config";
import type { ActionResult } from "./types";

export interface SendNotificationInput extends NotificationDraft {
  audienceLabel: string;
  /** ISO time for a scheduled send; `null` sends now. */
  scheduledAt: string | null;
}

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendNotification(
  input: SendNotificationInput,
): Promise<ActionResult<NotificationRecord>> {
  await delay();
  const fieldErrors: Record<string, string> = {};
  if (input.title.trim().length < 3) fieldErrors.title = "Sarlavhani kiriting.";
  if (input.title.length > TITLE_MAX) fieldErrors.title = `${TITLE_MAX} belgidan oshmasin.`;
  if (input.body.trim().length < 5) fieldErrors.body = "Matnni kiriting.";
  if (input.body.length > BODY_MAX) fieldErrors.body = `${BODY_MAX} belgidan oshmasin.`;
  if (input.scheduledAt && new Date(input.scheduledAt) <= referenceNow()) {
    fieldErrors.scheduledAt = "Kelajakdagi vaqtni tanlang.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Maydonlarni tekshiring.", fieldErrors };
  }
  return {
    ok: true,
    data: {
      id: `n-${crypto.randomUUID()}`,
      at: input.scheduledAt ?? referenceNow().toISOString(),
      kind: input.kind,
      title: input.title.trim(),
      audienceLabel: input.audienceLabel,
      sent: null,
      delivered: null,
      state: input.scheduledAt ? "scheduled" : "queued",
    },
  };
}
