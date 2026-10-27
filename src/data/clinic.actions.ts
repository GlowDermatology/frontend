"use server";

import { z } from "zod";

import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  HoursOverride,
} from "@/domain/clinic";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiCreateBlock,
  apiCreateOverride,
  apiCreateService,
  apiCreateSpecialist,
  apiDeleteBlock,
  apiDeleteOverride,
  apiDeleteSpecialistPhoto,
  apiPatchLocation,
  apiPatchService,
  apiPatchSpecialist,
  apiPutOfferedServices,
  apiPutSpecialistPhoto,
  apiPutWorkingHours,
} from "./api/clinic";
import {
  blockBody,
  locationPatchBody,
  mapBlock,
  mapClinicService,
  mapClinicSpecialist,
  mapLocation,
  mapOverride,
  offeredServicesBody,
  overrideBody,
  serviceCreateBody,
  servicePatchBody,
  specialistCreateBody,
  specialistPatchBody,
  workingWeekBody,
} from "./api/mappers/clinic";
import { TOP_LEVEL_ERROR, toActionResult, type FieldRemap } from "./api/mappers/errors";
import {
  blockFormSchema,
  locationFormSchema,
  offeredServicesSchema,
  overrideFormSchema,
  serviceFormSchema,
  specialistFormSchema,
  workingWeekSchema,
  type BlockFormValues,
  type LocationFormValues,
  type OfferedServicesValues,
  type OverrideFormValues,
  type ServiceFormValues,
  type SpecialistFormValues,
  type WorkingWeekValues,
} from "./clinic.schema";
import * as mock from "./mock/clinic.actions";
import { imageFileSchema } from "./products.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Specialists, services, schedules and the clinic (contract §2.17, gap
 * FND-1). Every write carries the form's idempotency key; a refused
 * deactivation answers 409 `conflict` with the server's message, and the
 * form then offers «Baribir nofaol qilish» (`force`). The API's field
 * paths are camelised onto the forms' names (`slot_step_min` →
 * `slotStepMin`, `services.0.price`, `days.2.break_start` →
 * `days.2.breakStart`); a missing clinic is the form-level error.
 */

const BAD_KEY = { ok: false as const, error: "Noto‘g‘ri so‘rov kaliti." };
const NOT_FOUND = { ok: false as const, error: "Topilmadi.", code: "not_found" };
const apiId = z.string().regex(/^\d{1,18}$/);
/** Demo ids also include the fixtures' and the drafts'. */
const anyId = z.string().regex(/^(?:\d{1,18}|draft-[0-9a-f-]{36})$/);

const SPECIALIST_REMAP: FieldRemap = { location_id: TOP_LEVEL_ERROR, force: TOP_LEVEL_ERROR };
const BLOCK_REMAP: FieldRemap = { start: "startTime", end: "endTime" };
const PHOTO_REMAP: FieldRemap = { file: "photo" };

type Guarded = Exclude<Awaited<ReturnType<typeof guardAction>>, { ok: false }>;

async function prologue(
  csrf: string,
  key: string | null,
): Promise<{ ok: true; guard: Guarded } | { ok: false; error: string; code?: string }> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (key !== null && !idempotencyKeySchema.safeParse(key).success) return BAD_KEY;
  return { ok: true, guard };
}

export async function createSpecialist(
  values: SpecialistFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  const parsed = specialistFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    return apiMutation("createSpecialist", async () => {
      try {
        const { data } = await apiCreateSpecialist(
          sessionToken(start.guard.session),
          specialistCreateBody(parsed.data),
          key,
        );
        return { ok: true, data: mapClinicSpecialist(data) };
      } catch (error) {
        return toActionResult(error, SPECIALIST_REMAP);
      }
    });
  }
  return mock.createSpecialist(parsed.data);
}

/**
 * `PATCH specialists/{id}/` with what differs from `baseline`; `force`
 * confirms a deactivation with appointments ahead (decision PS-2).
 */
export async function updateSpecialist(
  id: string,
  values: SpecialistFormValues,
  baseline: SpecialistFormValues,
  force: boolean,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = specialistFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const base = specialistFormSchema.safeParse(baseline);
  if (!base.success) return fieldErrorsFrom(base.error);
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("updateSpecialist", async () => {
      try {
        const { data } = await apiPatchSpecialist(
          sessionToken(start.guard.session),
          id,
          specialistPatchBody(base.data, parsed.data, force === true),
          key,
        );
        return { ok: true, data: mapClinicSpecialist(data) };
      } catch (error) {
        return toActionResult(error, SPECIALIST_REMAP);
      }
    });
  }
  return mock.updateSpecialist(id, parsed.data, force === true);
}

/**
 * `PUT specialists/{id}/photo/` with the `photo` part of `form` (JPEG, PNG
 * or WebP up to 5 MB), or `DELETE …/photo/` when `form` is `null`.
 */
export async function setSpecialistPhoto(
  id: string,
  form: FormData | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist | null>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  let photo: File | null = null;
  if (form !== null) {
    const picked = form instanceof FormData ? form.get("photo") : null;
    const parsed = imageFileSchema.safeParse(picked);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Rasmni tekshiring.";
      return { ok: false, error: message, fieldErrors: { photo: message } };
    }
    photo = parsed.data;
  }
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("setSpecialistPhoto", async () => {
      const token = sessionToken(start.guard.session);
      try {
        if (!photo) {
          await apiDeleteSpecialistPhoto(token, id);
          return { ok: true, data: null };
        }
        const body = new FormData();
        body.set("file", photo, photo.name);
        const { data } = await apiPutSpecialistPhoto(token, id, body, key);
        return { ok: true, data: mapClinicSpecialist(data) };
      } catch (error) {
        return toActionResult(error, PHOTO_REMAP);
      }
    });
  }
  const result = await mock.setSpecialistPhoto(id, photo);
  return result.ok && !photo ? { ok: true, data: null } : result;
}

export async function saveOfferedServices(
  id: string,
  values: OfferedServicesValues,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = offeredServicesSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("saveOfferedServices", async () => {
      try {
        const { data } = await apiPutOfferedServices(
          sessionToken(start.guard.session),
          id,
          offeredServicesBody(parsed.data),
          key,
        );
        return { ok: true, data: mapClinicSpecialist(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveOfferedServices(id, parsed.data);
}

/** The whole week; `days` holds the working weekdays only (sorted by weekday when sent). */
export async function saveWorkingHours(
  id: string,
  values: WorkingWeekValues,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicSpecialist>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = workingWeekSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("saveWorkingHours", async () => {
      try {
        const { data } = await apiPutWorkingHours(
          sessionToken(start.guard.session),
          id,
          workingWeekBody(parsed.data),
          key,
        );
        return { ok: true, data: mapClinicSpecialist(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveWorkingHours(id, parsed.data);
}

export async function createOverride(
  id: string,
  values: OverrideFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<HoursOverride>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = overrideFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("createOverride", async () => {
      try {
        const { data } = await apiCreateOverride(
          sessionToken(start.guard.session),
          id,
          overrideBody(parsed.data),
          key,
        );
        return { ok: true, data: mapOverride(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.createOverride(id, parsed.data);
}

export async function createBlock(
  id: string,
  values: BlockFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<BlockedPeriod>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = blockFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("createBlock", async () => {
      try {
        const { data } = await apiCreateBlock(
          sessionToken(start.guard.session),
          id,
          blockBody(parsed.data),
          key,
        );
        return { ok: true, data: mapBlock(data) };
      } catch (error) {
        return toActionResult(error, BLOCK_REMAP);
      }
    });
  }
  return mock.createBlock(id, parsed.data);
}

/** `DELETE …/overrides/{id}/` or `…/blocks/{id}/` → 204 (no key: idempotent by nature). */
export async function deleteScheduleEntry(
  id: string,
  kind: "override" | "block",
  entryId: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const start = await prologue(csrf, null);
  if (!start.ok) return start;
  if (!anyId.safeParse(id).success || !anyId.safeParse(entryId).success) return NOT_FOUND;
  if (kind !== "override" && kind !== "block") return NOT_FOUND;
  if ((await dataSource()) === "api") {
    if (!apiId.safeParse(id).success || !apiId.safeParse(entryId).success) return NOT_FOUND;
    return apiMutation("deleteScheduleEntry", async () => {
      try {
        const token = sessionToken(start.guard.session);
        if (kind === "override") await apiDeleteOverride(token, id, entryId);
        else await apiDeleteBlock(token, id, entryId);
        return { ok: true, data: { id: entryId } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.deleteScheduleEntry(id, kind, entryId);
}

/** `POST services/` (`id` null) or `PATCH services/{id}/` with what differs from `baseline`. */
export async function saveService(
  id: string | null,
  values: ServiceFormValues,
  baseline: ServiceFormValues | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicService>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  if (id !== null && !anyId.safeParse(id).success) return NOT_FOUND;
  const parsed = serviceFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const base = baseline === null ? null : serviceFormSchema.safeParse(baseline);
  if (base && !base.success) return fieldErrorsFrom(base.error);
  if ((await dataSource()) === "api") {
    if (id !== null && !apiId.safeParse(id).success) return NOT_FOUND;
    return apiMutation("saveService", async () => {
      const token = sessionToken(start.guard.session);
      try {
        const { data } =
          id === null || !base
            ? await apiCreateService(token, serviceCreateBody(parsed.data), key)
            : await apiPatchService(token, id, servicePatchBody(base.data, parsed.data), key);
        return { ok: true, data: mapClinicService(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveService(id, parsed.data);
}

/** `PATCH location/` (the first one creates the clinic, then `name.uz` is required). */
export async function saveLocation(
  values: LocationFormValues,
  baseline: LocationFormValues | null,
  key: string,
  csrf: string,
): Promise<ActionResult<ClinicLocation>> {
  const start = await prologue(csrf, key);
  if (!start.ok) return start;
  const parsed = locationFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const base = baseline === null ? null : locationFormSchema.safeParse(baseline);
  if ((await dataSource()) === "api") {
    return apiMutation("saveLocation", async () => {
      try {
        const { data } = await apiPatchLocation(
          sessionToken(start.guard.session),
          locationPatchBody(base?.success ? base.data : null, parsed.data),
          key,
        );
        return { ok: true, data: mapLocation(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveLocation(parsed.data);
}
