"use server";

import { z } from "zod";

import type { StaffAccountRow, StaffCredentials } from "@/domain/staff";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiCreateStaff, apiPatchStaff, apiResetStaffPassword, apiStaffAction } from "./api/admin";
import { toActionResult } from "./api/mappers/errors";
import { mapStaffCredentials, mapStaffRow } from "./api/mappers/staff";
import * as mock from "./mock/staff.actions";
import { dataSource } from "./source";
import {
  inviteStaffSchema,
  staffIdSchema,
  updateStaffSchema,
  type InviteStaffValues,
  type UpdateStaffValues,
} from "./staff.schema";
import type { ActionResult } from "./types";

/**
 * Staff management (contract §2.16, gap FND-4), manager only — the server
 * answers 403 to anyone else. Invitation and password reset answer the
 * temporary password once (`StaffCredentials`); it is handed to the dialog
 * and never stored. The 409 `conflict` refusals (own account, last active
 * manager, superuser) come back with the server's message.
 *
 * `snapshot` is the row as the screen shows it, used by the demo only (it
 * keeps no rows, so an account invited in the demo is known by it alone);
 * the API never sees it.
 */

const snapshotSchema = z
  .object({
    id: z.string().max(64),
    displayName: z.string().max(300),
    email: z.string().max(254),
    fullName: z.string().max(300),
    isActive: z.boolean(),
    isManager: z.boolean(),
    lastLoginAt: z.string().max(40).nullable(),
    linkedProviders: z.array(z.string().max(20)).max(5),
    createdAt: z.string().max(40).nullable(),
  })
  .optional();

const BAD_KEY = { ok: false as const, error: "Noto‘g‘ri so‘rov kaliti." };
const NOT_FOUND = { ok: false as const, error: "Xodim topilmadi.", code: "not_found" };

/** Demo ids are `<n>` or `draft-<uuid>`; the API's are integers. */
const anyIdSchema = z.string().regex(/^(?:[1-9]\d{0,17}|draft-[0-9a-f-]{36})$/);

function demoSnapshot(id: string, snapshot: unknown): StaffAccountRow | undefined {
  const parsed = snapshotSchema.safeParse(snapshot);
  return parsed.success && parsed.data?.id === id ? parsed.data : undefined;
}

export async function inviteStaff(
  values: InviteStaffValues,
  key: string,
  csrf: string,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (!idempotencyKeySchema.safeParse(key).success) return BAD_KEY;
  const parsed = inviteStaffSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    return apiMutation("inviteStaff", async () => {
      try {
        const { data } = await apiCreateStaff(
          sessionToken(guard.session),
          {
            email: parsed.data.email,
            full_name: parsed.data.fullName,
            is_manager: parsed.data.isManager,
          },
          key,
        );
        return { ok: true, data: mapStaffCredentials(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.inviteStaff(parsed.data);
}

export async function updateStaff(
  id: string,
  values: UpdateStaffValues,
  baseline: UpdateStaffValues,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffAccountRow>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (!anyIdSchema.safeParse(id).success) return NOT_FOUND;
  if (!idempotencyKeySchema.safeParse(key).success) return BAD_KEY;
  const parsed = updateStaffSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const base = updateStaffSchema.safeParse(baseline);
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return NOT_FOUND;
    // Only what changed (a resent unchanged role would still be checked).
    const body: { full_name?: string; is_manager?: boolean } = {};
    if (!base.success || base.data.fullName !== parsed.data.fullName) {
      body.full_name = parsed.data.fullName;
    }
    if (!base.success || base.data.isManager !== parsed.data.isManager) {
      body.is_manager = parsed.data.isManager;
    }
    return apiMutation("updateStaff", async () => {
      try {
        const { data } = await apiPatchStaff(sessionToken(guard.session), id, body, key);
        return { ok: true, data: mapStaffRow(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateStaff(id, parsed.data, demoSnapshot(id, snapshot));
}

/** `deactivate/` (key required: revokes every session) or `reactivate/`. */
export async function setStaffActive(
  id: string,
  active: boolean,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffAccountRow>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (!anyIdSchema.safeParse(id).success) return NOT_FOUND;
  if (!idempotencyKeySchema.safeParse(key).success) return BAD_KEY;
  if (typeof active !== "boolean") return { ok: false, error: "Noto‘g‘ri so‘rov." };
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return NOT_FOUND;
    return apiMutation(active ? "reactivateStaff" : "deactivateStaff", async () => {
      try {
        const { data } = await apiStaffAction(
          sessionToken(guard.session),
          id,
          active ? "reactivate" : "deactivate",
          key,
        );
        return { ok: true, data: mapStaffRow(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.setStaffActive(id, active, demoSnapshot(id, snapshot));
}

/** `reset-password/` (key required): a new temporary password, every session revoked. */
export async function resetStaffPassword(
  id: string,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (!anyIdSchema.safeParse(id).success) return NOT_FOUND;
  if (!idempotencyKeySchema.safeParse(key).success) return BAD_KEY;
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return NOT_FOUND;
    return apiMutation("resetStaffPassword", async () => {
      try {
        const { data } = await apiResetStaffPassword(sessionToken(guard.session), id, key);
        return { ok: true, data: mapStaffCredentials(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.resetStaffPassword(id, demoSnapshot(id, snapshot));
}
