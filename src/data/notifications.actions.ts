"use server";

import { z } from "zod";

import {
  BODY_MAX,
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_TYPE_MESSAGE,
  NOTIFICATION_IMAGE_MAX_BYTES,
  NOTIFICATION_IMAGE_TYPES,
  TEMPLATE_MAX,
  TEMPLATE_UZ_MIN,
  TITLE_MAX,
  type NotificationRecord,
  type StatusTemplate,
  type TemplateStatus,
} from "@/domain/notification";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiCreateNotification, apiUpdateTemplate } from "./api/admin";
import { toActionResult } from "./api/mappers/errors";
import {
  mapNotificationRecord,
  mapStatusTemplate,
  NOTIFICATION_FIELD_REMAP,
  notificationFormData,
} from "./api/mappers/notifications";
import * as mock from "./mock/notifications.actions";
import { requestNow } from "./now";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Push notification mutations (contract §2.8, §7.12). The view posts a
 * `FormData` with `kind`, `title`, `body`, `link` (`none` | `product:<id>`),
 * `audience` (`all` | `group` | `one`), `segmentId`, `phone` (`+998…`),
 * `scheduledAt` (ISO with offset, empty = send now) and an optional `image`
 * file. The mock body lives in `./mock/notifications.actions.ts`; the api
 * branch builds the multipart body with dotted keys from the validated input
 * (`notificationFormData`: audience `group` → `segment`, `one` → `customer`,
 * `scheduled_at` as an aware Tashkent time) and posts it to `notifications/`
 * with `Idempotency-Key`; field errors are remapped per §7.1 (`audience.phone`
 * → `phone`, `image` → the top-level error). A send without `scheduled_at`
 * runs inside the request (eager Celery in local settings), so the answer may
 * already be `sent`.
 *
 * `updateNotificationTemplate` PUTs `notification-templates/{status}/` with
 * all three languages; the backend is the authority on the placeholder rule
 * (`unknown_placeholder` "Faqat {raqam} o‘rinbosari ishlatiladi.").
 */

const IMAGE_TYPES: ReadonlyArray<string> = NOTIFICATION_IMAGE_TYPES;

/** The validated payload handed to the mock / api bodies. */
export interface NotificationInput {
  kind: "promo" | "general";
  title: string;
  body: string;
  link: { kind: "none" } | { kind: "product"; productId: string };
  audience: "all" | "group" | "one";
  segmentId: string;
  phone: string;
  /** ISO time for a scheduled send; `null` sends now. */
  scheduledAt: string | null;
  image: File | null;
}

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

function buildSchema(now: Date) {
  return z
    .object({
      kind: z.enum(["promo", "general"]),
      title: z
        .string()
        .trim()
        .min(3, "Sarlavhani kiriting (kamida 3 belgi).")
        .max(TITLE_MAX, `${TITLE_MAX} belgidan oshmasin.`),
      body: z
        .string()
        .trim()
        .min(5, "Xabar matnini kiriting.")
        .max(BODY_MAX, `${BODY_MAX} belgidan oshmasin.`),
      link: z.string().regex(/^(none|product:[A-Za-z0-9_-]{1,64})$/, "Havolani tanlang."),
      audience: z.enum(["all", "group", "one"]),
      segmentId: z.string().trim().max(64),
      phone: z.string().trim(),
      scheduledAt: z.string().trim(),
      image: z
        .instanceof(File)
        .refine((file) => IMAGE_TYPES.includes(file.type), { error: IMAGE_TYPE_MESSAGE })
        .refine((file) => file.size <= NOTIFICATION_IMAGE_MAX_BYTES, {
          error: IMAGE_TOO_LARGE_MESSAGE,
        })
        .nullable(),
      key: idempotencyKeySchema,
    })
    .superRefine((values, ctx) => {
      if (values.audience === "group" && !values.segmentId) {
        ctx.addIssue({ code: "custom", path: ["segmentId"], message: "Guruhni tanlang." });
      }
      if (values.audience === "one" && !/^\+998\d{9}$/.test(values.phone)) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
        });
      }
      if (values.scheduledAt) {
        const at = Date.parse(values.scheduledAt);
        if (Number.isNaN(at) || at <= now.getTime()) {
          ctx.addIssue({
            code: "custom",
            path: ["scheduledAt"],
            message: "Kelajakdagi vaqtni tanlang.",
          });
        }
      }
    });
}

export async function sendNotification(
  formData: FormData,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const image = formData.get("image");
  // An empty file input serialises as a File with no name: treat it as absent.
  const file = image instanceof File && image.size > 0 && image.name ? image : null;
  const parsed = buildSchema(await requestNow()).safeParse({
    kind: text(formData.get("kind")),
    title: text(formData.get("title")),
    body: text(formData.get("body")),
    link: text(formData.get("link")) || "none",
    audience: text(formData.get("audience")),
    segmentId: text(formData.get("segmentId")),
    phone: text(formData.get("phone")).replace(/[\s()-]/g, ""),
    scheduledAt: text(formData.get("scheduledAt")),
    image: file,
    key,
  });
  if (!parsed.success) {
    const failure = fieldErrorsFrom(parsed.error);
    // Contract §7.1: image problems are a top-level error, not a field.
    const imageError = failure.fieldErrors?.image;
    if (imageError) {
      delete failure.fieldErrors?.image;
      if (Object.keys(failure.fieldErrors ?? {}).length === 0) delete failure.fieldErrors;
      failure.error = imageError;
    }
    return failure;
  }
  const { data } = parsed;
  const input: NotificationInput = {
    kind: data.kind,
    title: data.title,
    body: data.body,
    link:
      data.link === "none" ? { kind: "none" } : { kind: "product", productId: data.link.slice(8) },
    audience: data.audience,
    segmentId: data.segmentId,
    phone: data.phone,
    scheduledAt: data.scheduledAt || null,
    image: data.image,
  };
  if ((await dataSource()) === "api") {
    return apiMutation("sendNotification", async () => {
      try {
        const { data } = await apiCreateNotification(
          sessionToken(guard.session),
          notificationFormData(input),
          key,
        );
        return { ok: true, data: mapNotificationRecord(data) };
      } catch (error) {
        return toActionResult(error, NOTIFICATION_FIELD_REMAP);
      }
    });
  }
  return mock.sendNotification(input);
}

const TEMPLATE_STATUSES = ["processing", "handed_to_courier", "delivered", "cancelled"] as const;

export interface TemplateTextsInput {
  uz: string;
  ru: string;
  en: string;
}

const templateSchema = z.object({
  status: z.enum(TEMPLATE_STATUSES),
  texts: z.object({
    uz: z
      .string()
      .trim()
      .min(TEMPLATE_UZ_MIN, `Kamida ${TEMPLATE_UZ_MIN} ta belgi kiriting.`)
      .max(TEMPLATE_MAX, `${TEMPLATE_MAX} belgidan oshmasin.`),
    ru: z.string().trim().max(TEMPLATE_MAX, `${TEMPLATE_MAX} belgidan oshmasin.`),
    en: z.string().trim().max(TEMPLATE_MAX, `${TEMPLATE_MAX} belgidan oshmasin.`),
  }),
  key: idempotencyKeySchema,
});

/** `PUT notification-templates/{status}/` (contract §2.8): the whole `texts` object. */
export async function updateNotificationTemplate(
  status: TemplateStatus,
  texts: TemplateTextsInput,
  key: string,
  csrf: string,
): Promise<ActionResult<StatusTemplate>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = templateSchema.safeParse({ status, texts, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("updateNotificationTemplate", async () => {
      try {
        const { data } = await apiUpdateTemplate(
          sessionToken(guard.session),
          input.status,
          { texts: input.texts },
          input.key,
        );
        return { ok: true, data: mapStatusTemplate(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateNotificationTemplate(input.status, input.texts);
}
