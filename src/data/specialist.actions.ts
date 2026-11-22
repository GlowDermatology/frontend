"use server";

import { z } from "zod";

import type { ClinicSpecialist } from "@/domain/clinic";
import type { SpecialistRoleChange, StaffCredentials } from "@/domain/staff";
import { copyFor, getAdminLocale, getLocalized } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  invalidFormMessage,
} from "./action-guard";
import { apiChangeSpecialistRole, apiInviteSpecialist } from "./api/admin";
import { apiDeleteOwnProfilePhoto, apiPatchOwnProfile, apiPutOwnProfilePhoto } from "./api/clinic";
import { apiFetch } from "./api/client";
import { mapClinicSpecialist } from "./api/mappers/clinic";
import { toActionResult } from "./api/mappers/errors";
import { mapSpecialistInviteCredentials, mapSpecialistRoleChange } from "./api/mappers/staff";
import type { ApiOwnProfilePatch } from "./api/types";
import { getMe } from "./auth";
import { dataCopy } from "./copy";
import { imageFileSchemas } from "./products.schema";
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

/**
 * Staff → Add employee → Specialist (`POST specialists/invite/`, manager only): the Specialist account and its draft profile are
 * created together, and the answer is shown in the usual credentials dialog. A duplicate email is
 * the `unique` field error on `email`; nothing is created then. Resending the invitation uses the
 * account's own `send-password-link/` / `reset-password/` routes.
 */
export async function inviteSpecialist(
  values: InviteStaffValues,
  key: string,
  csrf: string,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const me = await getMe();
  if (guard.session.mode !== "api" || !(me?.is_manager || me?.is_superuser))
    return permissionDenied();
  if (!idempotencyKeySchema.safeParse(key).success) {
    return { ok: false, error: await invalidFormMessage() };
  }
  const body = (await getLocalized(staffSchemas)).invite.safeParse(values);
  if (!body.success) {
    return fieldErrorsFrom(body.error, await invalidFormMessage());
  }
  const token = guard.session.token;
  const language = body.data.language ?? (await getAdminLocale());
  return apiMutation("inviteSpecialist", async () => {
    try {
      const { data } = await apiInviteSpecialist(
        token,
        {
          email: body.data.email,
          full_name: body.data.fullName,
          delivery: body.data.delivery,
          language,
        },
        key,
      );
      return { ok: true, data: mapSpecialistInviteCredentials(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/**
 * Staff → Edit: the confirmed Staff ↔ Specialist change of one account
 * (`POST staff/{id}/specialist-role/` with `{role, confirmed: true}`, manager only). The account's
 * sessions end; → Staff pauses the profile (its appointments stay and their count comes back for
 * staff to handle), → Specialist reuses the profile the account already owns or creates a draft.
 * The 409 refusals (own account, inactive, superuser, operations console, last active manager)
 * come back with the server's message.
 */
export async function changeSpecialistRole(
  accountId: string,
  role: "staff" | "specialist",
  key: string,
  csrf: string,
): Promise<ActionResult<SpecialistRoleChange>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const me = await getMe();
  if (guard.session.mode !== "api" || !(me?.is_manager || me?.is_superuser))
    return permissionDenied();
  if (
    !z.enum(["staff", "specialist"]).safeParse(role).success ||
    !staffIdSchema.safeParse(accountId).success ||
    !idempotencyKeySchema.safeParse(key).success
  )
    return { ok: false, error: await invalidFormMessage() };
  const token = guard.session.token;
  return apiMutation("changeSpecialistRole", async () => {
    try {
      const { data } = await apiChangeSpecialistRole(
        token,
        accountId,
        { role, confirmed: true },
        key,
      );
      return { ok: true, data: mapSpecialistRoleChange(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/* --- The signed-in specialist's own profile (My Schedule → My profile) --- */

const OWN_NAME_MIN = 2;
const OWN_NAME_MAX = 150;
const OWN_BIO_MAX = 2000;

const bioText = z.string().trim().max(OWN_BIO_MAX).optional();
const ownProfileSchema = z.object({
  name: z.string().trim().min(OWN_NAME_MIN).max(OWN_NAME_MAX).optional(),
  bio: z.object({ uz: bioText, ru: bioText, en: bioText }).optional(),
});

export type OwnProfileValues = z.input<typeof ownProfileSchema>;

async function specialistGuard(csrf: string) {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (guard.session.mode !== "api" || (await getMe())?.role !== "specialist")
    return permissionDenied();
  return { ...guard, token: guard.session.token };
}

/**
 * `PATCH specialist/profile/`: the public name and/or the bio (only the languages sent change).
 * Clinics, services, discipline and publication stay with staff.
 */
export async function updateMyProfile(
  values: OwnProfileValues,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const guard = await specialistGuard(csrf);
  if (!guard.ok) return guard;
  const parsed = ownProfileSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, await invalidFormMessage());
  if (!idempotencyKeySchema.safeParse(key).success) {
    return { ok: false, error: await invalidFormMessage() };
  }
  const body: ApiOwnProfilePatch = {};
  if (parsed.data.name !== undefined) body.name = parsed.data.name;
  if (parsed.data.bio) {
    const bio: NonNullable<ApiOwnProfilePatch["bio"]> = {};
    for (const language of ["uz", "ru", "en"] as const) {
      const text = parsed.data.bio[language];
      if (text !== undefined) bio[language] = text;
    }
    if (Object.keys(bio).length > 0) body.bio = bio;
  }
  const token = guard.token;
  return apiMutation("updateMyProfile", async () => {
    try {
      const { data } = await apiPatchOwnProfile(token, body, key);
      return { ok: true, data: mapClinicSpecialist(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/**
 * `PUT specialist/profile/photo/` with the `photo` part of `form` (JPEG, PNG or WebP up to
 * 5 MiB), or `DELETE …/photo/` (204 → `null`) when `form` is `null`; mirrors the staff route
 * `specialists/{id}/photo/`.
 */
export async function setMyProfilePhoto(
  form: FormData | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist | null>> {
  const guard = await specialistGuard(csrf);
  if (!guard.ok) return guard;
  if (!idempotencyKeySchema.safeParse(key).success) {
    return { ok: false, error: await invalidFormMessage() };
  }
  let photo: File | null = null;
  if (form !== null) {
    const picked = form instanceof FormData ? form.get("photo") : null;
    const parsed = (await getLocalized(imageFileSchemas)).safeParse(picked);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? (await invalidFormMessage());
      return { ok: false, error: message, fieldErrors: { photo: message } };
    }
    photo = parsed.data;
  }
  const token = guard.token;
  return apiMutation("setMyProfilePhoto", async () => {
    try {
      if (!photo) {
        await apiDeleteOwnProfilePhoto(token);
        return { ok: true, data: null };
      }
      const body = new FormData();
      body.set("file", photo, photo.name);
      const { data } = await apiPutOwnProfilePhoto(token, body, key);
      return { ok: true, data: mapClinicSpecialist(data) };
    } catch (error) {
      return toActionResult(error, { file: "photo" });
    }
  });
}
