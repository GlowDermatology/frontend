"use server";

import { z } from "zod";

import {
  ASSISTANT_MODES,
  IMPROVE_GOALS,
  type AssistantApplyItem,
  type AssistantApplyResult,
  type AssistantJob,
  type AssistantStart,
  type AssistantStartInput,
} from "@/domain/assistant";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { CONTENT_LANGUAGES } from "@/domain/product";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchemas,
  sessionToken,
} from "./action-guard";
import {
  apiApplyAssistantJob,
  apiDiscardAssistantJob,
  apiGetAssistantJob,
  apiStartAssistantJob,
} from "./api/assistant";
import { isApiError } from "./api/errors";
import { mapProduct, toActionResult } from "./api/mappers";
import { mapAssistantJob } from "./api/mappers/assistant";
import * as mock from "./mock/assistant";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * The AI assistant's Server Actions (contract §2.19): start a job for a product, poll it, apply
 * the reviewed suggestions, or discard them. Start and apply are idempotency-keyed (a lost answer
 * is replayed, never a second job or a second write); a poll is a plain read (no refresh). The
 * apply writes the product on the server, so it re-renders the route (`apiMutation`); the editor
 * re-bases only the applied fields and keeps the admin's other edits.
 */

const productIdSchema = z.string().regex(/^[\w-]{1,64}$/);
const jobIdSchema = z.string().regex(/^[\w-]{1,4096}$/);
const apiIdSchema = z.string().regex(/^\d{1,18}$/);
const keySchema = z.string().max(64);

const startSchema = z.object({
  mode: z.enum(ASSISTANT_MODES),
  languages: z.array(z.enum(CONTENT_LANGUAGES)).max(3),
  keys: z.array(keySchema).max(200),
  goal: z.enum(IMPROVE_GOALS),
  imageIds: z.array(z.string().max(64)).max(8),
});

async function messages() {
  const locale = await getAdminLocale();
  return { m: catalogDataCopy[locale], locale };
}

const isApi = async () => (await dataSource()) === "api";

export async function startAssistantJob(
  productId: string,
  input: AssistantStartInput,
  key: string,
  csrf: string,
): Promise<ActionResult<AssistantStart>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({ productId: productIdSchema, input: startSchema, key: idempotencyKeySchemas[locale] })
    .safeParse({ productId, input, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const { input: body } = parsed.data;
  if (await isApi()) {
    if (!apiIdSchema.safeParse(productId).success) {
      return { ok: false, error: m.productNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiStartAssistantJob(
        sessionToken(guard.session),
        productId,
        {
          mode: body.mode,
          languages: body.languages,
          keys: body.keys,
          goal: body.goal,
          image_ids: body.imageIds.filter((id) => apiIdSchema.safeParse(id).success).map(Number),
        },
        parsed.data.key,
      );
      return data.nothing_to_fill || !data.job
        ? { ok: true, data: { nothingToFill: true, job: null } }
        : { ok: true, data: { nothingToFill: false, job: mapAssistantJob(data.job) } };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return mock.startAssistantJob(productId, body);
}

/** `GET assistant/jobs/{id}/` for the poller (a read: no refresh, no key). */
export async function pollAssistantJob(
  id: string,
  csrf: string,
): Promise<ActionResult<AssistantJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m } = await messages();
  const parsedId = jobIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (await isApi()) {
    if (!apiIdSchema.safeParse(id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiGetAssistantJob(sessionToken(guard.session), id);
      return { ok: true, data: mapAssistantJob(data) };
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        return { ok: false, error: m.jobNotFound, code: "not_found" };
      }
      return toActionResult(error);
    }
  }
  const job = await mock.getAssistantJob(id);
  return job ? { ok: true, data: job } : { ok: false, error: m.jobNotFound, code: "not_found" };
}

/** Only the checked rows, with their (possibly edited) values. */
export async function applyAssistantJob(
  id: string,
  items: AssistantApplyItem[],
  key: string,
  csrf: string,
): Promise<ActionResult<AssistantApplyResult>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m, locale } = await messages();
  const parsed = z
    .object({
      id: jobIdSchema,
      key: idempotencyKeySchemas[locale],
      items: z
        .array(z.object({ key: keySchema, value: z.string().max(5000) }))
        .min(1)
        .max(120),
    })
    .safeParse({ id, key, items });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if (await isApi()) {
    if (!apiIdSchema.safeParse(id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    return apiMutation("applyAssistantJob", async () => {
      try {
        const { data } = await apiApplyAssistantJob(
          sessionToken(guard.session),
          id,
          { items: parsed.data.items },
          parsed.data.key,
        );
        return {
          ok: true,
          data: {
            job: mapAssistantJob(data.job),
            applied: [...data.applied],
            conflicts: [...data.conflicts],
            product: mapProduct(data.product),
          },
        };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.applyAssistantJob(id, parsed.data.items);
}

export async function discardAssistantJob(
  id: string,
  csrf: string,
): Promise<ActionResult<AssistantJob>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { m } = await messages();
  if (!jobIdSchema.safeParse(id).success) {
    return { ok: false, error: m.jobNotFound, code: "not_found" };
  }
  if (await isApi()) {
    if (!apiIdSchema.safeParse(id).success) {
      return { ok: false, error: m.jobNotFound, code: "not_found" };
    }
    try {
      const { data } = await apiDiscardAssistantJob(sessionToken(guard.session), id);
      return { ok: true, data: mapAssistantJob(data) };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return mock.discardAssistantJob(id);
}
