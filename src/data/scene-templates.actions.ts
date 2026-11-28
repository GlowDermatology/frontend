"use server";

import { z } from "zod";

import { sceneDataCopy } from "@/domain/copy/scenes";
import {
  CUSTOM_PROMPT_MAX,
  TEMPLATE_NAME_MAX,
  type SceneJob,
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
import { mapSceneJob, mapSceneTemplate } from "./api/mappers/scenes";
import { toActionResult } from "./api/mappers";
import {
  apiCreateSceneTemplate,
  apiMakeTemplateReference,
  apiPatchSceneTemplate,
} from "./api/scenes";
import * as mock from "./mock/scenes";
import { imageFileSchemas } from "./products.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * The scene template editor (admin contract §2.20.9): create an AI template or edit one (names,
 * the scene in staff's words, a reference picture of the scene alone, hidden), and «Rasmini
 * yaratish» (a job making the reference from the text, polled with `pollSceneJob`). A save refreshes
 * the route: the dialogs' template lists are server-loaded. The form arrives as `FormData`: `name.uz`,
 * `name.ru`, `name.en`, `text`, the file `reference`, `removeReference`, `enabled`.
 */

const idSchema = z.string().trim().min(1).max(64);
const apiIdSchema = z.string().regex(/^\d{1,18}$/);

function formOf(form: FormData) {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const file = form.get("reference");
  return {
    name:
      text("name.uz") === undefined
        ? undefined
        : { uz: text("name.uz") ?? "", ru: text("name.ru") ?? "", en: text("name.en") ?? "" },
    text: text("text"),
    reference: file instanceof File && file.size > 0 ? file : undefined,
    removeReference: text("removeReference") === "true",
    enabled: text("enabled") === undefined ? undefined : text("enabled") === "true",
  };
}

const textOf = (value: string) => value.split(/\s+/).filter(Boolean).join(" ");

export async function saveSceneTemplateEdits(
  id: string | null,
  form: FormData,
  key: string,
  csrf: string,
): Promise<ActionResult<SceneTemplate>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const locale = await getAdminLocale();
  const m = sceneDataCopy[locale];
  const raw = formOf(form);
  const parsed = z
    .object({
      id: z.union([idSchema, z.null()]),
      name: z
        .object({
          uz: z
            .string()
            .transform(textOf)
            .pipe(z.string().min(1, m.templateName).max(TEMPLATE_NAME_MAX, m.templateName)),
          ru: z.string().transform(textOf).pipe(z.string().max(TEMPLATE_NAME_MAX, m.templateName)),
          en: z.string().transform(textOf).pipe(z.string().max(TEMPLATE_NAME_MAX, m.templateName)),
        })
        .optional(),
      text: z
        .string()
        .transform(textOf)
        .pipe(z.string().max(CUSTOM_PROMPT_MAX, m.customRequired))
        .optional(),
      reference: imageFileSchemas[locale].optional(),
      removeReference: z.boolean(),
      enabled: z.boolean().optional(),
      key: idempotencyKeySchemas[locale],
    })
    .refine((value) => value.id !== null || value.name !== undefined, {
      error: m.templateName,
      path: ["name", "uz"],
    })
    .refine((value) => value.id !== null || Boolean(value.text) || value.reference !== undefined, {
      error: m.templateScene,
      path: ["text"],
    })
    .safeParse({ id, ...raw, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.templateScene);
  const values = parsed.data;

  if ((await dataSource()) === "api") {
    if (values.id !== null && !apiIdSchema.safeParse(values.id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    const body = new FormData();
    if (values.name) {
      body.set("name.uz", values.name.uz);
      body.set("name.ru", values.name.ru);
      body.set("name.en", values.name.en);
    }
    if (values.text !== undefined) body.set("text", values.text);
    if (values.reference) body.set("reference", values.reference, values.reference.name);
    if (values.removeReference) body.set("remove_reference", "true");
    if (values.enabled !== undefined) body.set("enabled", values.enabled ? "true" : "false");
    return apiMutation("saveSceneTemplateEdits", async () => {
      try {
        const token = sessionToken(guard.session);
        const { data } =
          values.id === null
            ? await apiCreateSceneTemplate(token, body, values.key)
            : await apiPatchSceneTemplate(token, values.id, body, values.key);
        const template = mapSceneTemplate(data);
        return template
          ? { ok: true, data: template }
          : { ok: false, error: m.jobNotFound, code: "not_found" };
      } catch (error) {
        return toActionResult(error, { remove_reference: "reference" });
      }
    });
  }
  const edit: mock.MockTemplateEdit = {
    ...(values.name ? { name: values.name } : {}),
    ...(values.text !== undefined ? { text: values.text } : {}),
    reference: values.reference !== undefined,
    removeReference: values.removeReference,
    ...(values.enabled !== undefined ? { enabled: values.enabled } : {}),
  };
  return values.id === null
    ? mock.createSceneTemplate(edit)
    : mock.updateSceneTemplate(values.id, edit);
}

/** «Rasmini yaratish»: 202 the job making the template's reference from its text (no refresh). */
export async function makeTemplateReference(
  id: string,
  key: string,
  csrf: string,
): Promise<ActionResult<SceneJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const locale = await getAdminLocale();
  const m = sceneDataCopy[locale];
  const parsed = z
    .object({ id: idSchema, key: idempotencyKeySchemas[locale] })
    .safeParse({ id, key });
  if (!parsed.success) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if ((await dataSource()) === "api") {
    if (!apiIdSchema.safeParse(parsed.data.id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiMakeTemplateReference(
        sessionToken(guard.session),
        parsed.data.id,
        parsed.data.key,
      );
      return { ok: true, data: mapSceneJob(data) };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return mock.makeTemplateReference(parsed.data.id);
}
