"use server";

import { z } from "zod";

import { BODY_MAX, TITLE_MAX, type NotificationRecord } from "@/domain/notification";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
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
 * branch (F2) posts multipart to `notifications/` with `Idempotency-Key`
 * (audience `group` → `segment`, `one` → `customer`; `image` errors map to the
 * top-level error).
 */

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

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
        .refine((file) => IMAGE_TYPES.includes(file.type), { error: "Faqat JPG yoki PNG." })
        .refine((file) => file.size <= IMAGE_MAX_BYTES, { error: "Rasm 2 MB dan katta." })
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
  if ((await dataSource()) === "api") return apiMutation("sendNotification");
  return mock.sendNotification(input);
}
