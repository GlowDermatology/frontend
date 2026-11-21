"use server";

import { z } from "zod";

import { copyFor, getAdminLocale, getLocalized } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  invalidFormMessage,
} from "./action-guard";
import { apiFetch } from "./api/client";
import { toActionResult } from "./api/mappers/errors";
import { mapStaffCredentials } from "./api/mappers/staff";
import type { components } from "./api/schema";
import { getMe } from "./auth";
import { dataCopy } from "./copy";
import { staffIdSchema, staffSchemas, type InviteStaffValues } from "./staff.schema";
import type { ActionResult } from "./types";

const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("weekly"), body: z.unknown() }),
  z.object({
    kind: z.enum(["overrides", "blocks"]),
    id: staffIdSchema.optional(),
    body: z.unknown(),
  }),
  z.object({
    kind: z.literal("remove"),
    id: staffIdSchema,
    section: z.enum(["overrides", "blocks"]),
  }),
  z.object({
    kind: z.literal("booking"),
    id: staffIdSchema,
    action: z.enum(["confirm", "reject", "attend", "cancel", "reschedule"]),
    body: z.unknown().optional(),
  }),
]);

type SpecialistMutation = z.input<typeof mutationSchema>;
const API = "/api/v1/admin/specialist";

async function permissionDenied() {
  return {
    ok: false as const,
    code: "permission_denied",
    error: (await copyFor(dataCopy)).permissionDenied,
  };
}

export async function updateMySchedule(
  input: SpecialistMutation,
  key: string,
  csrf: string,
): Promise<ActionResult<void>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (guard.session.mode !== "api" || (await getMe())?.role !== "specialist")
    return permissionDenied();
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success || !idempotencyKeySchema.safeParse(key).success) {
    return { ok: false, error: await invalidFormMessage() };
  }
  const mutation = parsed.data;
  const token = guard.session.token;
  return apiMutation("updateMySchedule", async () => {
    const request = { token, idempotencyKey: key };
    try {
      switch (mutation.kind) {
        case "weekly":
          await apiFetch(API + "/weekly-hours/", {
            ...request,
            method: "PUT",
            body: mutation.body,
          });
          break;
        case "booking":
          await apiFetch(API + "/bookings/" + mutation.id + "/" + mutation.action + "/", {
            ...request,
            method: "POST",
            body: mutation.body,
          });
          break;
        case "remove":
          await apiFetch(API + "/" + mutation.section + "/" + mutation.id + "/", {
            ...request,
            method: "DELETE",
          });
          break;
        default:
          await apiFetch(API + "/" + mutation.kind + "/" + (mutation.id ? mutation.id + "/" : ""), {
            ...request,
            method: mutation.id ? "PUT" : "POST",
            body: mutation.body,
          });
      }
      return { ok: true, data: undefined };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

export async function inviteSpecialist(
  id: string,
  values: InviteStaffValues,
  key: string,
  csrf: string,
) {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const me = await getMe();
  if (guard.session.mode !== "api" || !(me?.is_manager || me?.is_superuser))
    return permissionDenied();
  if (!staffIdSchema.safeParse(id).success || !idempotencyKeySchema.safeParse(key).success) {
    return { ok: false as const, error: await invalidFormMessage() };
  }
  const body = (await getLocalized(staffSchemas)).invite.safeParse(values);
  if (!body.success) {
    return fieldErrorsFrom(body.error, await invalidFormMessage());
  }
  const token = guard.session.token;
  const locale = await getAdminLocale();
  return apiMutation("inviteSpecialist", async () => {
    try {
      const { data } = await apiFetch<components["schemas"]["StaffCredentials"]>(
        "/api/v1/admin/specialists/" + id + "/access/invite/",
        {
          token,
          method: "POST",
          idempotencyKey: key,
          body: {
            email: body.data.email,
            full_name: body.data.fullName,
            delivery: body.data.delivery,
            language: locale,
          },
        },
      );
      return { ok: true, data: mapStaffCredentials(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

export async function convertSpecialist(
  id: string,
  accountId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<void>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const me = await getMe();
  if (guard.session.mode !== "api" || !(me?.is_manager || me?.is_superuser))
    return permissionDenied();
  if (
    !staffIdSchema.safeParse(id).success ||
    !staffIdSchema.safeParse(accountId).success ||
    !idempotencyKeySchema.safeParse(key).success
  ) {
    return { ok: false, error: await invalidFormMessage() };
  }
  const token = guard.session.token;
  return apiMutation("convertSpecialist", async () => {
    try {
      await apiFetch("/api/v1/admin/specialists/" + id + "/access/convert/", {
        token,
        method: "POST",
        idempotencyKey: key,
        body: { staff_user_id: Number(accountId) },
      });
      return { ok: true, data: undefined };
    } catch (error) {
      return toActionResult(error);
    }
  });
}
