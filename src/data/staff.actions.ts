"use server";

import { z } from "zod";

import { staffDataCopy } from "@/domain/copy/staff";
import {
  STAFF_INVITE_STATES,
  type StaffAccountRow,
  type StaffCredentials,
  type StaffPasswordDelivery,
} from "@/domain/staff";
import { copyFor, getAdminLocale, getLocalized } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiCreateStaff,
  apiPatchStaff,
  apiResetStaffPassword,
  apiSendStaffPasswordLink,
  apiStaffAction,
} from "./api/admin";
import { toActionResult } from "./api/mappers/errors";
import { mapStaffCredentials, mapStaffLinkSent, mapStaffRow } from "./api/mappers/staff";
import * as mock from "./mock/staff.actions";
import { dataSource } from "./source";
import {
  staffIdSchema,
  staffSchemas,
  type InviteStaffValues,
  type ResetStaffValues,
  type UpdateStaffValues,
} from "./staff.schema";
import type { ActionResult } from "./types";

/**
 * Staff management (contract §2.16, gap FND-4, DESIGN §E), manager only — the server answers 403
 * to anyone else. Invitation and password reset take a `delivery` (temporary password, e-mailed
 * link or both) and answer the temporary password once and/or the link's expiry
 * (`StaffCredentials`); the password is handed to the dialog and never stored. The 409
 * `conflict` refusals (own account, last active manager, superuser, no e-mail) come back with the
 * server's message, in the admin language (`Accept-Language`).
 *
 * `snapshot` is the row as the screen shows it, used by the demo only (it keeps no rows, so an
 * account invited in the demo is known by it alone); the API never sees it.
 */

const inviteSchema = z
  .object({
    state: z.enum(STAFF_INVITE_STATES),
    sentAt: z.string().max(40).nullable(),
    expiresAt: z.string().max(40).nullable(),
  })
  .nullable();

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
    mustChangePassword: z.boolean(),
    passwordChangedAt: z.string().max(40).nullable(),
    mfaEnabled: z.boolean(),
    invite: inviteSchema,
  })
  .optional();

/** Demo ids are `<n>` or `draft-<uuid>`; the API's are integers. */
const anyIdSchema = z.string().regex(/^(?:[1-9]\d{0,17}|draft-[0-9a-f-]{36})$/);

function demoSnapshot(id: string, snapshot: unknown): StaffAccountRow | undefined {
  const parsed = snapshotSchema.safeParse(snapshot);
  return parsed.success && parsed.data?.id === id ? parsed.data : undefined;
}

/** The refusals every action shares (bad id, bad key), in the admin language. */
async function refusals() {
  const m = await copyFor(staffDataCopy);
  return {
    badKey: { ok: false as const, error: m.requestKey },
    notFound: { ok: false as const, error: m.notFound, code: "not_found" },
    badRequest: { ok: false as const, error: m.badRequest },
    checkFields: m.checkFields,
  };
}

export async function inviteStaff(
  values: InviteStaffValues,
  key: string,
  csrf: string,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const r = await refusals();
  if (!idempotencyKeySchema.safeParse(key).success) return r.badKey;
  const parsed = (await getLocalized(staffSchemas)).invite.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, r.checkFields);
  const data = { ...parsed.data, language: parsed.data.language ?? (await getAdminLocale()) };
  if ((await dataSource()) === "api") {
    return apiMutation("inviteStaff", async () => {
      try {
        const { data: answer } = await apiCreateStaff(
          sessionToken(guard.session),
          {
            email: data.email,
            full_name: data.fullName,
            is_manager: data.isManager,
            delivery: data.delivery,
            language: data.language,
          },
          key,
        );
        return { ok: true, data: mapStaffCredentials(answer) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.inviteStaff(data);
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
  const r = await refusals();
  if (!anyIdSchema.safeParse(id).success) return r.notFound;
  if (!idempotencyKeySchema.safeParse(key).success) return r.badKey;
  const schema = (await getLocalized(staffSchemas)).update;
  const parsed = schema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, r.checkFields);
  const base = schema.safeParse(baseline);
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return r.notFound;
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

/** `deactivate/` (key required: revokes every session and open link) or `reactivate/`. */
export async function setStaffActive(
  id: string,
  active: boolean,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffAccountRow>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const r = await refusals();
  if (!anyIdSchema.safeParse(id).success) return r.notFound;
  if (!idempotencyKeySchema.safeParse(key).success) return r.badKey;
  if (typeof active !== "boolean") return r.badRequest;
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return r.notFound;
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

/**
 * `reset-password/` (key required): a new temporary password and/or an e-mailed link
 * (`values.delivery`); the account must set its own password at the next sign-in and every
 * session is revoked.
 */
export async function resetStaffPassword(
  id: string,
  values: ResetStaffValues,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const r = await refusals();
  if (!anyIdSchema.safeParse(id).success) return r.notFound;
  if (!idempotencyKeySchema.safeParse(key).success) return r.badKey;
  const parsed = (await getLocalized(staffSchemas)).reset.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, r.checkFields);
  const delivery: StaffPasswordDelivery = parsed.data.delivery;
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return r.notFound;
    return apiMutation("resetStaffPassword", async () => {
      try {
        const { data } = await apiResetStaffPassword(
          sessionToken(guard.session),
          id,
          { delivery },
          key,
        );
        return { ok: true, data: mapStaffCredentials(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.resetStaffPassword(id, delivery, demoSnapshot(id, snapshot));
}

/**
 * «Havolani qayta yuborish» (`send-password-link/`, key optional, sent): a fresh single-use link
 * to the account's e-mail; earlier links are revoked, the password and sessions stay.
 */
export async function sendStaffPasswordLink(
  id: string,
  key: string,
  csrf: string,
  snapshot?: unknown,
): Promise<ActionResult<StaffCredentials>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const r = await refusals();
  if (!anyIdSchema.safeParse(id).success) return r.notFound;
  if (!idempotencyKeySchema.safeParse(key).success) return r.badKey;
  if ((await dataSource()) === "api") {
    if (!staffIdSchema.safeParse(id).success) return r.notFound;
    return apiMutation("sendStaffPasswordLink", async () => {
      try {
        const { data } = await apiSendStaffPasswordLink(sessionToken(guard.session), id, key);
        return { ok: true, data: mapStaffLinkSent(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.sendStaffPasswordLink(id, demoSnapshot(id, snapshot));
}
