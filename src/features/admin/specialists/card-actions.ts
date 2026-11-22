import {
  createBlock,
  createOverride,
  deleteScheduleEntry,
  saveWorkingHours,
  setSpecialistPhoto,
  updateSpecialist,
} from "@/data/clinic.actions";
import type {
  BlockFormValues,
  OverrideFormValues,
  SpecialistFormValues,
  WorkingWeekValues,
} from "@/data/clinic.schema";
import type { ActionResult } from "@/data/types";
import type { BlockedPeriod, ClinicSpecialist, HoursOverride } from "@/domain/clinic";

/** A dated schedule entry the cards list and remove. */
export type ScheduleEntryKind = "override" | "block";

/**
 * The writes of the schedule cards (`HoursCard`, `OverridesCard`, `BlocksCard`). The cards never
 * name a route: staff bind them to `specialists/{id}/…`, the specialist's own workspace to
 * `specialist/…`. Every write takes an Idempotency-Key (one per user intent) and the CSRF token.
 */
export interface ScheduleActions {
  saveWeek(
    values: WorkingWeekValues,
    key: string,
    csrf: string,
  ): Promise<ActionResult<ClinicSpecialist>>;
  createOverride(
    values: OverrideFormValues,
    key: string,
    csrf: string,
  ): Promise<ActionResult<HoursOverride>>;
  createBlock(
    values: BlockFormValues,
    key: string,
    csrf: string,
  ): Promise<ActionResult<BlockedPeriod>>;
  deleteEntry(
    kind: ScheduleEntryKind,
    entryId: string,
    key: string,
    csrf: string,
  ): Promise<ActionResult<{ id: string }>>;
}

/** Upload (`form`) or remove (`null`) the profile photo; a removal answers `null`. */
export type PhotoAction = (
  form: FormData | null,
  key: string,
  csrf: string,
) => Promise<ActionResult<ClinicSpecialist | null>>;

/** The writes of `ProfileCard`: the profile PATCH (what differs from `baseline`) and the photo. */
export interface ProfileActions {
  save(
    values: SpecialistFormValues,
    baseline: SpecialistFormValues,
    force: boolean,
    key: string,
    csrf: string,
  ): Promise<ActionResult<ClinicSpecialist>>;
  photo: PhotoAction;
}

/** Staff on `/admin/specialists/[id]`: the schedule writes of that specialist. */
export function staffScheduleActions(specialistId: string): ScheduleActions {
  return {
    saveWeek: (values, key, csrf) => saveWorkingHours(specialistId, values, key, csrf),
    createOverride: (values, key, csrf) => createOverride(specialistId, values, key, csrf),
    createBlock: (values, key, csrf) => createBlock(specialistId, values, key, csrf),
    deleteEntry: (kind, entryId, key, csrf) =>
      deleteScheduleEntry(specialistId, kind, entryId, key, csrf),
  };
}

/** Staff on `/admin/specialists/[id]`: the profile and photo writes of that specialist. */
export function staffProfileActions(specialistId: string): ProfileActions {
  return {
    save: (values, baseline, force, key, csrf) =>
      updateSpecialist(specialistId, values, baseline, force, key, csrf),
    photo: (form, key, csrf) => setSpecialistPhoto(specialistId, form, key, csrf),
  };
}
