import type { NotificationRecord } from "@/domain/notification";
import { formatNumber, formatPhone } from "@/lib/format";

import { referenceNow } from "../config";
import type { NotificationInput } from "../notifications.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { SEGMENTS, TOTAL_DEVICES } from "./notifications";

/**
 * Mock implementation of `src/data/notifications.actions.ts`: builds the
 * history record the demo always produced. The audience label comes from the
 * fixtures (segment name and size, device count), never from the client.
 */

function audienceLabel(input: NotificationInput): string | null {
  if (input.audience === "all") return `Barcha · ${formatNumber(TOTAL_DEVICES)}`;
  if (input.audience === "group") {
    const segment = SEGMENTS.find((s) => s.id === input.segmentId);
    return segment ? `${segment.name} · ${formatNumber(segment.size)}` : null;
  }
  return `Bitta mijoz · ${formatPhone(input.phone)}`;
}

export async function sendNotification(
  input: NotificationInput,
): Promise<ActionResult<NotificationRecord>> {
  await delay(600);
  const label = audienceLabel(input);
  if (label === null) {
    return {
      ok: false,
      error: "Guruh topilmadi.",
      fieldErrors: { segmentId: "Guruhni tanlang." },
    };
  }
  return {
    ok: true,
    data: {
      id: `n-${crypto.randomUUID()}`,
      at: input.scheduledAt ?? referenceNow().toISOString(),
      kind: input.kind,
      title: input.title,
      audienceLabel: label,
      sent: null,
      delivered: null,
      state: input.scheduledAt ? "scheduled" : "queued",
    },
  };
}
