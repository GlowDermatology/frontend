"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import type { BlockedPeriod, ClinicSpecialist, HoursOverride } from "@/domain/clinic";
import { clinicDataCopy, type ClinicDataCopy } from "@/domain/copy/clinic";
import type { SpecialistRoleChange, StaffCredentials } from "@/domain/staff";
import { copyFor, getAdminLocale, getLocalized } from "@/lib/i18n/admin-locale";
import type { Locale } from "@/lib/i18n/locales";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  invalidFormMessage,
} from "./action-guard";
import { apiChangeSpecialistRole, apiInviteSpecialist } from "./api/admin";
import {
  blockBody,
  mapBlock,
  mapClinicSpecialist,
  mapOverride,
  overrideBody,
  ownProfilePatchBody,
  serviceCreateBody,
  servicePatchBody,
  workingWeekBody,
} from "./api/mappers/clinic";
import { TOP_LEVEL_ERROR, toActionResult, type FieldRemap } from "./api/mappers/errors";
import { mapSpecialistInviteCredentials, mapSpecialistRoleChange } from "./api/mappers/staff";
import {
  apiCreateOwnBlock,
  apiCreateOwnOverride,
  apiCreateOwnService,
  apiDeleteOwnProfilePhoto,
  apiDeleteOwnScheduleEntry,
  apiDeleteOwnService,
  apiPatchOwnProfile,
  apiPatchOwnService,
  apiPutOwnProfilePhoto,
  apiPutOwnWeeklyHours,
} from "./api/specialist";
import type { ApiSpecialistOwnProfile } from "./api/types";
import { getMe } from "./auth";
import {
  clinicSchemas,
  type BlockFormValues,
  type OverrideFormValues,
  type SpecialistFormValues,
  type SpecialistServiceFormValues,
  type WorkingWeekValues,
} from "./clinic.schema";
import { dataCopy } from "./copy";
import { imageFileSchemas } from "./products.schema";
import { tagsForEntity } from "./shop/tags";
import { staffIdSchema, staffSchemas, type InviteStaffValues } from "./staff.schema";
import type { ActionFailure, ActionResult } from "./types";

async function permissionDenied(): Promise<ActionFailure> {
  return {
    ok: false as const,
    code: "permission_denied",
    error: (await copyFor(dataCopy)).permissionDenied,
  };
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

/* --- The signed-in specialist's own profile, schedule and services (`specialist/…`) --- */

/*
 * Each action re-checks the caller: an api-mode session whose account is a Specialist, else the
 * backend's own 403 answer (`permission_denied`) without a call. The profile is always the
 * caller's (the routes take no id). Mock mode is always an administrator, so these answer
 * `permission_denied` there too. Validation and messages follow the admin language, like the
 * staff cards these actions back (`clinic.actions.ts`).
 */

const API_ID = z.string().regex(/^\d{1,18}$/);
const PROFILE_REMAP: FieldRemap = { force: TOP_LEVEL_ERROR };
const BLOCK_REMAP: FieldRemap = { start: "startTime", end: "endTime" };
const PHOTO_REMAP: FieldRemap = { file: "photo" };

interface OwnStarted {
  ok: true;
  token: string;
  locale: Locale;
  m: ClinicDataCopy;
  schemas: (typeof clinicSchemas)[Locale];
  notFound: ActionFailure;
}

async function ownPrologue(csrf: string, key: string): Promise<OwnStarted | ActionFailure> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (guard.session.mode !== "api" || (await getMe())?.role !== "specialist")
    return permissionDenied();
  const locale = await getAdminLocale();
  const m = clinicDataCopy[locale];
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: m.badKey };
  return {
    ok: true,
    token: guard.session.token,
    locale,
    m,
    schemas: clinicSchemas[locale],
    notFound: { ok: false, error: m.notFound, code: "not_found" },
  };
}

/** A profile answer: the public site's caches follow it, the card gets the domain profile. */
function ownProfileResult(data: ApiSpecialistOwnProfile): ActionResult<ClinicSpecialist> {
  for (const tag of tagsForEntity("specialist", data.id)) updateTag(tag);
  return { ok: true, data: mapClinicSpecialist(data) };
}

/**
 * `PATCH specialist/profile/` with what differs from `baseline`: every profile field but the
 * clinics (staff assign them; never sent). Publishing answers 409 `conflict` while the checklist
 * is incomplete; an unpublish with visits ahead answers 409 unless `force`.
 */
export async function updateMyProfile(
  values: SpecialistFormValues,
  baseline: SpecialistFormValues,
  force: boolean,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  const parsed = start.schemas.specialist.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, start.m.checkFields);
  const base = start.schemas.specialist.safeParse(baseline);
  if (!base.success) return fieldErrorsFrom(base.error, start.m.checkFields);
  const body = ownProfilePatchBody(base.data, parsed.data, force === true);
  return apiMutation("updateMyProfile", async () => {
    try {
      return ownProfileResult((await apiPatchOwnProfile(start.token, body, key)).data);
    } catch (error) {
      return toActionResult(error, PROFILE_REMAP);
    }
  });
}

/**
 * `PUT specialist/profile/photo/` with the `photo` part of `form` (JPEG, PNG or WebP up to
 * 5 MiB), or `DELETE …/photo/` (204 → `null`) when `form` is `null`.
 */
export async function setMyProfilePhoto(
  form: FormData | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist | null>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  let photo: File | null = null;
  if (form !== null) {
    const picked = form instanceof FormData ? form.get("photo") : null;
    const parsed = imageFileSchemas[start.locale].safeParse(picked);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? start.m.checkPhoto;
      return { ok: false, error: message, fieldErrors: { photo: message } };
    }
    photo = parsed.data;
  }
  return apiMutation<ClinicSpecialist | null>("setMyProfilePhoto", async () => {
    try {
      if (!photo) {
        await apiDeleteOwnProfilePhoto(start.token, key);
        for (const tag of tagsForEntity("specialist")) updateTag(tag);
        return { ok: true, data: null };
      }
      const body = new FormData();
      body.set("file", photo, photo.name);
      return ownProfileResult((await apiPutOwnProfilePhoto(start.token, body, key)).data);
    } catch (error) {
      return toActionResult(error, PHOTO_REMAP);
    }
  });
}

/** `PUT specialist/weekly-hours/`: the whole week (the working weekdays only). */
export async function saveMyWorkingHours(
  values: WorkingWeekValues,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  const parsed = start.schemas.week.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, start.m.checkFields);
  return apiMutation("saveMyWorkingHours", async () => {
    try {
      const { data } = await apiPutOwnWeeklyHours(start.token, workingWeekBody(parsed.data), key);
      return { ok: true, data: mapClinicSpecialist(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/** `POST specialist/overrides/`: one date's hours or a day off. */
export async function createMyOverride(
  values: OverrideFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<HoursOverride>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  const parsed = start.schemas.override.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, start.m.checkFields);
  return apiMutation("createMyOverride", async () => {
    try {
      const { data } = await apiCreateOwnOverride(start.token, overrideBody(parsed.data), key);
      return { ok: true, data: mapOverride(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/** `POST specialist/blocks/`: a busy or off period. */
export async function createMyBlock(
  values: BlockFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<BlockedPeriod>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  const parsed = start.schemas.block.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, start.m.checkFields);
  return apiMutation("createMyBlock", async () => {
    try {
      const { data } = await apiCreateOwnBlock(start.token, blockBody(parsed.data), key);
      return { ok: true, data: mapBlock(data) };
    } catch (error) {
      return toActionResult(error, BLOCK_REMAP);
    }
  });
}

/** `DELETE specialist/overrides/{id}/` or `…/blocks/{id}/` → 204. */
export async function deleteMyScheduleEntry(
  kind: "override" | "block",
  entryId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  if ((kind !== "override" && kind !== "block") || !API_ID.safeParse(entryId).success) {
    return start.notFound;
  }
  return apiMutation("deleteMyScheduleEntry", async () => {
    try {
      await apiDeleteOwnScheduleEntry(start.token, kind, entryId, key);
      return { ok: true, data: { id: entryId } };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/**
 * `POST specialist/services/` (`serviceId` null) or `PATCH specialist/services/{id}/` with what
 * differs from `baseline`; both answer the whole profile (its publish checklist follows).
 */
export async function saveMyService(
  serviceId: string | null,
  values: SpecialistServiceFormValues,
  baseline: SpecialistServiceFormValues | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  if (serviceId !== null && !API_ID.safeParse(serviceId).success) return start.notFound;
  const parsed = start.schemas.specialistService.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, start.m.checkFields);
  const base = baseline === null ? null : start.schemas.specialistService.safeParse(baseline);
  if (base && !base.success) return fieldErrorsFrom(base.error, start.m.checkFields);
  return apiMutation("saveMyService", async () => {
    try {
      const { data } =
        serviceId === null || !base
          ? await apiCreateOwnService(start.token, serviceCreateBody(parsed.data), key)
          : await apiPatchOwnService(
              start.token,
              serviceId,
              servicePatchBody(base.data, parsed.data),
              key,
            );
      return ownProfileResult(data);
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/** `PATCH specialist/services/{id}/` with `is_active` only (the list's switch). */
export async function setMyServiceActive(
  serviceId: string,
  isActive: boolean,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  if (!API_ID.safeParse(serviceId).success || typeof isActive !== "boolean") {
    return start.notFound;
  }
  return apiMutation("setMyServiceActive", async () => {
    try {
      return ownProfileResult(
        (await apiPatchOwnService(start.token, serviceId, { is_active: isActive }, key)).data,
      );
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/**
 * `DELETE specialist/services/{id}/` → 204 for a service never booked; one with appointments
 * answers 409 `conflict` (the card offers to deactivate it instead).
 */
export async function deleteMyService(
  serviceId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const start = await ownPrologue(csrf, key);
  if (!start.ok) return start;
  if (!API_ID.safeParse(serviceId).success) return start.notFound;
  return apiMutation("deleteMyService", async () => {
    try {
      await apiDeleteOwnService(start.token, serviceId, key);
      for (const tag of tagsForEntity("service")) updateTag(tag);
      return { ok: true, data: { id: serviceId } };
    } catch (error) {
      return toActionResult(error);
    }
  });
}
