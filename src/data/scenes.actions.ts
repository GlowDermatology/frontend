"use server";

import { z } from "zod";

import { sceneDataCopy } from "@/domain/copy/scenes";
import type { ProductImage } from "@/domain/product";
import {
  CUSTOM_PROMPT_MAX,
  CUSTOM_PROMPT_MIN,
  normalizeCustomPrompt,
  TEMPLATE_NAME_MAX,
  type SceneJob,
  type SceneRequest,
  type SceneTemplate,
} from "@/domain/scene";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchemas,
  sessionToken,
} from "./action-guard";
import { isApiError } from "./api/errors";
import { mapProductImage, toActionResult, TOP_LEVEL_ERROR } from "./api/mappers";
import { mapSceneJob, mapSceneTemplate } from "./api/mappers/scenes";
import {
  apiAcceptSceneJob,
  apiDiscardSceneJob,
  apiGetSceneJob,
  apiSaveSceneTemplate,
  apiStartSceneJob,
} from "./api/scenes";
import * as mock from "./mock/scenes";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Product scene jobs (admin contract §2.20, backend f39170f): start one on a saved photo (a
 * studio or AI template, or `fit` for proposed crops), poll it, accept or discard its candidate.
 * Only accepting changes the product, so only it refreshes the route (`apiMutation`); a start,
 * a poll and a discard do not. Start, accept and discard carry the dialog's idempotency key.
 */

const idSchema = z.string().trim().min(1).max(64);
/** A demo job id carries its request (base64url): longer than an API id. */
const jobIdSchema = z.string().trim().min(1).max(600);
const apiIdSchema = z.string().regex(/^\d{1,18}$/);

async function messages() {
  const locale = await getAdminLocale();
  return { m: sceneDataCopy[locale], locale };
}

const isApi = async () => (await dataSource()) === "api";

const requestSchema = z
  .object({
    kind: z.enum(["studio", "ai_scene", "fit"]),
    templateId: idSchema.optional(),
    customPrompt: z
      .string()
      .transform(normalizeCustomPrompt)
      .pipe(z.string().min(CUSTOM_PROMPT_MIN).max(CUSTOM_PROMPT_MAX))
      .optional(),
  })
  .strict();

export async function startSceneJob(
  productId: string,
  imageId: string,
  request: SceneRequest,
  key: string,
  csrf: string,
): Promise<ActionResult<SceneJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({
      productId: idSchema,
      imageId: idSchema,
      request: requestSchema
        .refine((value) => value.customPrompt === undefined || value.kind === "ai_scene", {
          error: m.customRequired,
          path: ["customPrompt"],
        })
        .refine((value) => value.kind === "fit" || value.templateId || value.customPrompt, {
          error: m.templateRequired,
          path: ["templateId"],
        }),
      key: idempotencyKeySchemas[locale],
    })
    .safeParse({ productId, imageId, request, key });
  if (!parsed.success) {
    const custom = parsed.error.issues.some((issue) => issue.path.includes("customPrompt"));
    return fieldErrorsFrom(parsed.error, custom ? m.customRequired : m.templateRequired);
  }
  const { request: body } = parsed.data;
  if (await isApi()) {
    if (
      !apiIdSchema.safeParse(parsed.data.productId).success ||
      !apiIdSchema.safeParse(parsed.data.imageId).success ||
      (body.templateId !== undefined && !apiIdSchema.safeParse(body.templateId).success)
    ) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiStartSceneJob(
        sessionToken(guard.session),
        parsed.data.productId,
        parsed.data.imageId,
        body.kind === "fit"
          ? { kind: "fit" }
          : body.customPrompt !== undefined
            ? { kind: body.kind, custom_prompt: body.customPrompt }
            : { kind: body.kind, template_id: Number(body.templateId) },
        parsed.data.key,
      );
      return { ok: true, data: mapSceneJob(data) };
    } catch (error) {
      return toActionResult(error, { template_id: "templateId", custom_prompt: "customPrompt" });
    }
  }
  return mock.startSceneJob(parsed.data.productId, parsed.data.imageId, body);
}

/** `GET scenes/jobs/{id}/` for the poller (a read: no refresh, no key). */
export async function pollSceneJob(id: string, csrf: string): Promise<ActionResult<SceneJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m } = await messages();
  const parsed = jobIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (await isApi()) {
    if (!apiIdSchema.safeParse(parsed.data).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiGetSceneJob(sessionToken(guard.session), parsed.data);
      return { ok: true, data: mapSceneJob(data) };
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        return { ok: false, error: m.jobNotFound, code: "not_found" };
      }
      return toActionResult(error);
    }
  }
  const job = await mock.getSceneJob(parsed.data);
  return job ? { ok: true, data: job } : { ok: false, error: m.jobNotFound, code: "not_found" };
}

/**
 * Accepts a candidate: a scene becomes a new gallery image (first with `makeMain`), a `fit`
 * writes its crops on the source photo. `images` `max_items` is the whole answer's message (the
 * product is full); `acknowledge_generated` stays a field error for the dialog's checkbox.
 */
export async function acceptSceneJob(
  id: string,
  options: { makeMain: boolean; acknowledgeGenerated: boolean },
  key: string,
  csrf: string,
): Promise<ActionResult<{ job: SceneJob; image: ProductImage }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({
      id: jobIdSchema,
      options: z.object({ makeMain: z.boolean(), acknowledgeGenerated: z.boolean() }).strict(),
      key: idempotencyKeySchemas[locale],
    })
    .safeParse({ id, options, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.jobNotFound);
  if (await isApi()) {
    if (!apiIdSchema.safeParse(parsed.data.id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    return apiMutation("acceptSceneJob", async () => {
      try {
        const { data } = await apiAcceptSceneJob(
          sessionToken(guard.session),
          parsed.data.id,
          {
            make_main: parsed.data.options.makeMain,
            acknowledge_generated: parsed.data.options.acknowledgeGenerated,
          },
          parsed.data.key,
        );
        return {
          ok: true,
          data: { job: mapSceneJob(data.job), image: mapProductImage(data.image) },
        };
      } catch (error) {
        return toActionResult(error, { images: TOP_LEVEL_ERROR });
      }
    });
  }
  return mock.acceptSceneJob(parsed.data.id, parsed.data.options);
}

/** Discards a reviewable candidate (`scene_job_not_ready` for one that is running or closed). */
export async function discardSceneJob(
  id: string,
  key: string,
  csrf: string,
): Promise<ActionResult<SceneJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({ id: jobIdSchema, key: idempotencyKeySchemas[locale] })
    .safeParse({ id, key });
  if (!parsed.success) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (await isApi()) {
    if (!apiIdSchema.safeParse(parsed.data.id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiDiscardSceneJob(
        sessionToken(guard.session),
        parsed.data.id,
        parsed.data.key,
      );
      return { ok: true, data: mapSceneJob(data) };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return mock.discardSceneJob(parsed.data.id);
}

/**
 * «Shablon sifatida saqlash»: a finished scene staff typed becomes an AI template for everyone
 * (`POST scenes/jobs/{id}/template/`). Refreshes the route, so the editor's template list
 * (server-loaded) shows the new card; unsaved form edits stay, as after accepting.
 */
export async function saveSceneTemplate(
  id: string,
  name: string,
  key: string,
  csrf: string,
): Promise<ActionResult<SceneTemplate>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({
      id: jobIdSchema,
      name: z
        .string()
        .transform(normalizeCustomPrompt)
        .pipe(
          z
            .string()
            .min(1, { error: m.templateName })
            .max(TEMPLATE_NAME_MAX, { error: m.templateName }),
        ),
      key: idempotencyKeySchemas[locale],
    })
    .safeParse({ id, name, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.templateName);
  if (await isApi()) {
    if (!apiIdSchema.safeParse(parsed.data.id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    return apiMutation("saveSceneTemplate", async () => {
      try {
        const { data } = await apiSaveSceneTemplate(
          sessionToken(guard.session),
          parsed.data.id,
          { name: parsed.data.name },
          parsed.data.key,
        );
        const template = mapSceneTemplate(data);
        return template
          ? { ok: true, data: template }
          : { ok: false, error: m.notCustom, code: "scene_not_custom" };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveSceneTemplate(parsed.data.id, parsed.data.name);
}
