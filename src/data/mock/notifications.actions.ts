import {
  TEMPLATE_PLACEHOLDER,
  unknownPlaceholders,
  type NotificationRecord,
  type StatusTemplate,
  type TemplateStatus,
} from "@/domain/notification";
import { formatNumber, formatPhone } from "@/lib/format";

import { referenceNow } from "../config";
import type { NotificationInput, TemplateTextsInput } from "../notifications.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { LINK_OPTIONS, SEGMENTS, STATUS_TEMPLATES, TOTAL_DEVICES } from "./notifications";

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
      failed: null,
      delivered: null,
      state: input.scheduledAt ? "scheduled" : "queued",
      scheduledAt: input.scheduledAt,
      sentAt: null,
      author: "Administrator",
      ...(input.link.kind === "product" ? { linkLabel: linkLabel(input.link.productId) } : {}),
    },
  };
}

function linkLabel(productId: string): string {
  const option = LINK_OPTIONS.find((o) => o.kind === "product" && o.productId === productId);
  return option?.kind === "product" ? option.label : `Mahsulot #${productId}`;
}

const PLACEHOLDER_MESSAGE = `Faqat ${TEMPLATE_PLACEHOLDER} o‘rinbosari ishlatiladi.`;

/**
 * Template update with the backend's placeholder rule (`unknown_placeholder`
 * on the offending language); nothing is kept.
 */
export async function updateNotificationTemplate(
  status: TemplateStatus,
  texts: TemplateTextsInput,
): Promise<ActionResult<StatusTemplate>> {
  await delay(450);
  const fieldErrors: Record<string, string> = {};
  for (const language of ["uz", "ru", "en"] as const) {
    if (unknownPlaceholders(texts[language]).length > 0) {
      fieldErrors[`texts.${language}`] = PLACEHOLDER_MESSAGE;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Maydonlarni tekshiring.", code: "validation_error", fieldErrors };
  }
  const current = STATUS_TEMPLATES.find((t) => t.status === status);
  return {
    ok: true,
    data: {
      ...(current ?? { status }),
      status,
      text: texts.uz,
      translations: {
        uz: texts.uz.trim() !== "",
        ru: texts.ru.trim() !== "",
        en: texts.en.trim() !== "",
      },
      texts: { ...texts },
      updatedAt: referenceNow().toISOString(),
      updatedBy: "Administrator",
    },
  };
}
