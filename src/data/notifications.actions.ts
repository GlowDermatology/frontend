"use server";

import { refresh } from "next/cache";
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
  type TestDevice,
} from "@/domain/notification";
import { isHttpsUrl, LINK_URL_MAX, LINK_URL_MESSAGE } from "@/lib/link-url";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  requireSuperuser,
  sessionToken,
  type Guarded,
} from "./action-guard";
import {
  apiApproveNotification,
  apiCancelNotification,
  apiConfirmCampaignTest,
  apiCreateNotification,
  apiDeleteNotification,
  apiRegisterTestDevice,
  apiRemoveTestDevice,
  apiReturnNotificationToDraft,
  apiSendCampaignTest,
  apiStopNotification,
  apiUpdateNotification,
  apiUpdateTemplate,
} from "./api/admin";
import { toActionResult, type ActionFailure } from "./api/mappers/errors";
import {
  mapNotificationRecord,
  mapStatusTemplate,
  mapTestDevice,
  NOTIFICATION_FIELD_REMAP,
  notificationFormData,
} from "./api/mappers/notifications";
import type { ApiNotificationRecord } from "./api/types";
import * as mock from "./mock/notifications.actions";
import { requestNow } from "./now";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Push campaign mutations (contract §2.8, campaign approval workflow). The
 * composer posts a `FormData` with `kind`, `title`, `body`, `link` (`none` |
 * `product:<id>` | `url`, gap ADM-10.1, with the address in `linkUrl`),
 * `audience` (`all` | `group` | `one`), `segmentId`, `phone` (`+998…`),
 * `scheduledAt` (ISO with offset, empty = no requested time) and an optional
 * `image` file; an update adds `expectedRevision` and `removeImage`.
 *
 * - `saveNotificationDraft` / `updateNotificationDraft` / `deleteNotificationDraft`:
 *   any active staff on their own draft, a superuser on any (the backend
 *   answers 403 otherwise). Nothing is sent: the campaign is a `draft`.
 * - `sendCampaignTest`, `confirmCampaignTest`, `approveNotification`,
 *   `returnNotificationToDraft`, `cancelNotification`, `stopNotification`,
 *   `registerTestDevice`, `removeTestDevice`: superusers (`requireSuperuser`
 *   answers `permission_denied` before any call; the backend enforces the
 *   role as well). A 409 (`conflict`: stale revision or started send;
 *   `invalid_transition`: wrong state) or 404 re-reads the route in api mode
 *   (`refresh()`), so the board shows the campaign as it now is; mock mode
 *   never refreshes (the fixtures do not change).
 *
 * The mock bodies live in `./mock/notifications.actions.ts`; the api
 * branches build the multipart body with dotted keys (`notificationFormData`)
 * or the small JSON bodies and post them with `Idempotency-Key`; field errors
 * are remapped per §7.1 (`audience.phone` → `phone`, `image` and
 * `expected_revision` → the top-level error).
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
  link: { kind: "none" } | { kind: "product"; productId: string } | { kind: "url"; url: string };
  audience: "all" | "group" | "one";
  segmentId: string;
  phone: string;
  /** ISO time the author asks the send for; `null` = as soon as approved. */
  scheduledAt: string | null;
  image: File | null;
  /** Update only: drop the stored image (ignored when a new `image` comes). */
  removeImage: boolean;
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
      link: z.string().regex(/^(none|url|product:[A-Za-z0-9_-]{1,64})$/, "Havolani tanlang."),
      linkUrl: z.string().trim().max(LINK_URL_MAX, `${LINK_URL_MAX} belgidan oshmasin.`),
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
      removeImage: z.boolean(),
      key: idempotencyKeySchema,
    })
    .superRefine((values, ctx) => {
      if (values.link === "url") {
        if (!values.linkUrl) {
          ctx.addIssue({ code: "custom", path: ["linkUrl"], message: "Havolani kiriting." });
        } else if (!isHttpsUrl(values.linkUrl)) {
          ctx.addIssue({ code: "custom", path: ["linkUrl"], message: LINK_URL_MESSAGE });
        }
      }
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

/** Re-validates the composer's `FormData`; an image problem is the top-level error (contract §7.1). */
async function parseComposer(
  formData: FormData,
  key: string,
): Promise<{ ok: true; input: NotificationInput } | ActionFailure> {
  const image = formData.get("image");
  // An empty file input serialises as a File with no name: treat it as absent.
  const file = image instanceof File && image.size > 0 && image.name ? image : null;
  const parsed = buildSchema(await requestNow()).safeParse({
    kind: text(formData.get("kind")),
    title: text(formData.get("title")),
    body: text(formData.get("body")),
    link: text(formData.get("link")) || "none",
    linkUrl: text(formData.get("linkUrl")),
    audience: text(formData.get("audience")),
    segmentId: text(formData.get("segmentId")),
    phone: text(formData.get("phone")).replace(/[\s()-]/g, ""),
    scheduledAt: text(formData.get("scheduledAt")),
    image: file,
    removeImage: text(formData.get("removeImage")) === "true",
    key,
  });
  if (!parsed.success) {
    const failure = fieldErrorsFrom(parsed.error);
    const imageError = failure.fieldErrors?.image;
    if (imageError) {
      delete failure.fieldErrors?.image;
      if (Object.keys(failure.fieldErrors ?? {}).length === 0) delete failure.fieldErrors;
      failure.error = imageError;
    }
    return failure;
  }
  const { data } = parsed;
  return {
    ok: true,
    input: {
      kind: data.kind,
      title: data.title,
      body: data.body,
      link:
        data.link === "none"
          ? { kind: "none" }
          : data.link === "url"
            ? { kind: "url", url: data.linkUrl }
            : { kind: "product", productId: data.link.slice(8) },
      audience: data.audience,
      segmentId: data.segmentId,
      phone: data.phone,
      scheduledAt: data.scheduledAt || null,
      image: data.image,
      removeImage: data.removeImage,
    },
  };
}

/** `POST notifications/`: the campaign is saved as a `draft`; nothing is sent. */
export async function saveNotificationDraft(
  formData: FormData,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = await parseComposer(formData, key);
  if (!parsed.ok) return parsed;
  const { input } = parsed;
  if ((await dataSource()) === "api") {
    return apiMutation("saveNotificationDraft", async () => {
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
  return mock.saveNotificationDraft(input);
}

// API ids are integers; the demo's fixtures use `n-<n>` / `t-<n>` / `td-<n>`.
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const revisionSchema = z.coerce.number().int().min(1);

/**
 * `PATCH notifications/{id}/` with `expected_revision` (the revision the
 * editor was opened on): the author or a superuser changes a `draft` or
 * `tested` campaign; a content change bumps the revision and drops the test
 * confirmation. 409 `conflict` when someone changed it meanwhile.
 */
export async function updateNotificationDraft(
  notificationId: string,
  formData: FormData,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const ids = z
    .object({ notificationId: idSchema, expectedRevision: revisionSchema })
    .safeParse({ notificationId, expectedRevision: text(formData.get("expectedRevision")) });
  if (!ids.success) return fieldErrorsFrom(ids.error);
  const parsed = await parseComposer(formData, key);
  if (!parsed.ok) return parsed;
  const { input } = parsed;
  const { expectedRevision } = ids.data;
  if ((await dataSource()) === "api") {
    return apiMutation("updateNotificationDraft", async () => {
      try {
        const { data } = await apiUpdateNotification(
          sessionToken(guard.session),
          ids.data.notificationId,
          notificationFormData(input, { expectedRevision }),
          key,
        );
        return { ok: true, data: mapNotificationRecord(data) };
      } catch (error) {
        return staleAware(toActionResult(error, NOTIFICATION_FIELD_REMAP));
      }
    });
  }
  return mock.updateNotificationDraft(ids.data.notificationId, input, expectedRevision);
}

/** `DELETE notifications/{id}/`: a `draft` or `tested` campaign of the author (or any, for a superuser). */
export async function deleteNotificationDraft(
  notificationId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z.object({ notificationId: idSchema, key: idempotencyKeySchema }).safeParse({
    notificationId,
    key,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const id = parsed.data.notificationId;
  if ((await dataSource()) === "api") {
    return apiMutation("deleteNotificationDraft", async () => {
      try {
        await apiDeleteNotification(sessionToken(guard.session), id);
        return { ok: true, data: { id } };
      } catch (error) {
        return staleAware(toActionResult(error));
      }
    });
  }
  return mock.deleteNotificationDraft(id);
}

/**
 * The campaign changed under the board (409 `conflict` /
 * `invalid_transition`, 404): re-read the history in this roundtrip (api
 * mode only; mock mode never refreshes, action-guard.ts).
 */
function staleAware(result: ActionFailure): ActionFailure {
  if (
    result.code === "conflict" ||
    result.code === "invalid_transition" ||
    result.code === "not_found"
  ) {
    refresh();
  }
  return result;
}

/** Shared prologue of the superuser transitions: guard, role, ids and key. */
async function superuserOperation(
  csrf: string,
  notificationId: string,
  key: string,
): Promise<{ ok: true; guard: Extract<Guarded, { ok: true }>; id: string } | ActionFailure> {
  const guard = await requireSuperuser(await guardAction(csrf));
  if (!guard.ok) return guard;
  const parsed = z.object({ notificationId: idSchema, key: idempotencyKeySchema }).safeParse({
    notificationId,
    key,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  return { ok: true, guard, id: parsed.data.notificationId };
}

/** The api branch of a transition: the mapped record, stale answers re-read. */
async function transition(
  name: string,
  call: () => Promise<{ data: ApiNotificationRecord }>,
): Promise<ActionResult<NotificationRecord>> {
  return apiMutation(name, async () => {
    try {
      const { data } = await call();
      return { ok: true, data: mapNotificationRecord(data) };
    } catch (error) {
      return staleAware(toActionResult(error));
    }
  });
}

const deviceIdsSchema = z
  .array(idSchema)
  .min(1, "Kamida bitta qurilmani tanlang.")
  .max(10, "Ko‘pi bilan 10 ta qurilma.");

/**
 * `POST notifications/{id}/test/` `{device_ids}`: a real push of the
 * current revision to the chosen registered devices (the tester's inbox
 * gets the message too, so the deep link can be checked); the answer lists
 * the tests with FCM's verdict.
 */
export async function sendCampaignTest(
  notificationId: string,
  deviceIds: ReadonlyArray<string>,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  const devices = deviceIdsSchema.safeParse(deviceIds);
  if (!devices.success) {
    return { ok: false, error: devices.error.issues[0]?.message ?? "Qurilmani tanlang." };
  }
  if ((await dataSource()) === "api") {
    return transition("sendCampaignTest", () =>
      apiSendCampaignTest(
        sessionToken(op.guard.session),
        op.id,
        { device_ids: devices.data.map(Number) },
        key,
      ),
    );
  }
  return mock.sendCampaignTest(op.id, devices.data);
}

/** `POST notifications/{id}/tests/{test_id}/confirm/`: the tester saw the push; the campaign is `tested`. */
export async function confirmCampaignTest(
  notificationId: string,
  testId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  const test = idSchema.safeParse(testId);
  if (!test.success) return { ok: false, error: "Noto‘g‘ri so‘rov." };
  if ((await dataSource()) === "api") {
    return transition("confirmCampaignTest", () =>
      apiConfirmCampaignTest(sessionToken(op.guard.session), op.id, test.data, key),
    );
  }
  return mock.confirmCampaignTest(op.id, test.data);
}

/**
 * `POST notifications/{id}/approve/` `{expected_revision}`: the tested
 * campaign waits for `dispatch_after` (the approval delay after now, or the
 * requested time when later). Nothing is sent by the approval itself.
 */
export async function approveNotification(
  notificationId: string,
  expectedRevision: number,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  const revision = revisionSchema.safeParse(expectedRevision);
  if (!revision.success) return { ok: false, error: "Noto‘g‘ri so‘rov." };
  if ((await dataSource()) === "api") {
    return transition("approveNotification", () =>
      apiApproveNotification(
        sessionToken(op.guard.session),
        op.id,
        { expected_revision: revision.data },
        key,
      ),
    );
  }
  return mock.approveNotification(op.id, revision.data);
}

/** `POST notifications/{id}/return-to-draft/`: a waiting or cancelled campaign that never started. */
export async function returnNotificationToDraft(
  notificationId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  if ((await dataSource()) === "api") {
    return transition("returnNotificationToDraft", () =>
      apiReturnNotificationToDraft(sessionToken(op.guard.session), op.id, key),
    );
  }
  return mock.returnNotificationToDraft(op.id);
}

/**
 * `POST notifications/{id}/cancel/` (M3; superusers since the approval
 * workflow): a waiting campaign becomes `cancelled` before its send starts
 * (a repeat answers the same record). Once the send started the backend
 * answers 409 `conflict` "Yuborish boshlangan: xabarni bekor qilib
 * bo‘lmaydi."; an unknown id 404.
 */
export async function cancelNotification(
  notificationId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  if ((await dataSource()) === "api") {
    return transition("cancelNotification", () =>
      apiCancelNotification(sessionToken(op.guard.session), op.id, key),
    );
  }
  return mock.cancelNotification(op.id);
}

/** `POST notifications/{id}/stop/`: the emergency stop of a `sending` campaign (`stopping`). */
export async function stopNotification(
  notificationId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<NotificationRecord>> {
  const op = await superuserOperation(csrf, notificationId, key);
  if (!op.ok) return op;
  if ((await dataSource()) === "api") {
    return transition("stopNotification", () =>
      apiStopNotification(sessionToken(op.guard.session), op.id, key),
    );
  }
  return mock.stopNotification(op.id);
}

export interface TestDeviceInput {
  phone: string;
  label: string;
}

export const TEST_DEVICE_LABEL_MAX = 60;

const testDeviceSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine((value) => /^\+998\d{9}$/.test(value), {
      error: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
    }),
  label: z
    .string()
    .trim()
    .min(2, "Qurilma nomini kiriting.")
    .max(TEST_DEVICE_LABEL_MAX, `${TEST_DEVICE_LABEL_MAX} belgidan oshmasin.`),
  key: idempotencyKeySchema,
});

/**
 * `POST notifications/test-devices/` `{phone, label}` (superusers): the
 * customer's latest pushable device becomes a test target. The backend's
 * field errors land on `phone` (`customer_not_found`, `device_not_pushable`,
 * `unique`).
 */
export async function registerTestDevice(
  input: TestDeviceInput,
  key: string,
  csrf: string,
): Promise<ActionResult<TestDevice>> {
  const guard = await requireSuperuser(await guardAction(csrf));
  if (!guard.ok) return guard;
  const parsed = testDeviceSchema.safeParse({ ...input, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const device = { phone: parsed.data.phone, label: parsed.data.label };
  if ((await dataSource()) === "api") {
    return apiMutation("registerTestDevice", async () => {
      try {
        const { data } = await apiRegisterTestDevice(sessionToken(guard.session), device, key);
        return { ok: true, data: mapTestDevice(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.registerTestDevice(device);
}

/** `DELETE notifications/test-devices/{id}/` (superusers): soft, idempotent. */
export async function removeTestDevice(
  deviceId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireSuperuser(await guardAction(csrf));
  if (!guard.ok) return guard;
  const parsed = z.object({ deviceId: idSchema, key: idempotencyKeySchema }).safeParse({
    deviceId,
    key,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const id = parsed.data.deviceId;
  if ((await dataSource()) === "api") {
    return apiMutation("removeTestDevice", async () => {
      try {
        await apiRemoveTestDevice(sessionToken(guard.session), id);
        return { ok: true, data: { id } };
      } catch (error) {
        return staleAware(toActionResult(error));
      }
    });
  }
  return mock.removeTestDevice(id);
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
