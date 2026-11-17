"use server";

import { z } from "zod";

import { mfaDataCopy, type MfaDataCopy } from "@/domain/copy/mfa";
import type { MfaStatus } from "@/domain/settings";
import { STAFF_INVITE_STATES, type StaffAccountRow } from "@/domain/staff";
import { copyFor, getLocalized } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { mapStaffRow } from "./api/mappers/staff";
import { getMe } from "./auth";
import { mockMfaState, saveMockMfaState } from "./mfa";
import {
  apiMfaConfirm,
  apiMfaDisable,
  apiMfaRecoveryCodes,
  apiMfaSetup,
  apiResetStaffMfa,
} from "./mfa-api";
import { mfaFailure } from "./mfa-errors";
import {
  mfaSchemas,
  type MfaConfirmValues,
  type MfaDisableValues,
  type MfaRegenerateValues,
  type MfaSetupValues,
} from "./mfa.schema";
import { delay } from "./mock/delay";
import {
  MOCK_DEVICE_ID,
  MOCK_LOCKED_CODE,
  MOCK_LOCK_SECONDS,
  MOCK_RECOVERY_CODES,
  MOCK_TOTP_CODE,
  MOCK_TOTP_SECRET,
  groupKey,
  isMockRecoveryCode,
  isWrongMockPassword,
  mockOtpauthUri,
  mockResetStaffMfa,
} from "./mock/mfa";
import { MOCK_STAFF_ACCOUNTS } from "./mock/staff";
import { dataSource } from "./source";
import type { ActionFailure, ActionResult } from "./types";

/**
 * The admin panel MFA from Settings (DESIGN §E "MFA", contract §2.1) and the manager's reset from
 * the staff page (§2.16). Every action re-verifies the session and the double-submit token
 * (`guardAction`), validates its input with zod (lengths as the backend's serializers) and maps
 * the backend's refusals with `mfaFailure`. No idempotency key on `auth/*` (§1.7: never stored).
 *
 * The TOTP secret (`otpauth_uri`, `manual_key`) and the recovery codes are returned to the dialog
 * that asked for them and kept nowhere else; nothing here logs a password, a code or a key. The
 * client re-reads the card (`router.refresh()`) once a dialog is done.
 */

export interface MfaSetupInfo {
  deviceId: number;
  /** `otpauth://totp/…` for the QR code (drawn in the browser, never sent elsewhere). */
  otpauthUri: string;
  /** The same secret in base32, in groups of four, to type by hand. */
  manualKey: string;
}

export interface MfaRecoveryCodes {
  recoveryCodes: string[];
}

const conflict = (error: string): ActionFailure => ({ ok: false, error, code: "conflict" });

function mockPasswordRefused(m: MfaDataCopy): ActionFailure {
  return {
    ok: false,
    error: m.checkFields,
    code: "validation_error",
    fieldErrors: { currentPassword: m.passwordIncorrect },
  };
}

function mockCodeRefused(m: MfaDataCopy, code: string): ActionFailure | null {
  if (code === MOCK_LOCKED_CODE) {
    return {
      ok: false,
      error: m.throttledFor(MOCK_LOCK_SECONDS),
      code: "throttled",
      retryAfter: MOCK_LOCK_SECONDS,
    };
  }
  if (code !== MOCK_TOTP_CODE) {
    return {
      ok: false,
      error: m.codeInvalid,
      code: "mfa_code_invalid",
      fieldErrors: { code: m.codeInvalid },
    };
  }
  return null;
}

/** Settings → enable, step 1 (`auth/mfa/setup/`): the password again → a pending device to scan. */
export async function startMfaSetup(
  values: MfaSetupValues,
  csrf: string,
): Promise<ActionResult<MfaSetupInfo>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(mfaDataCopy);
  const parsed = (await getLocalized(mfaSchemas)).setup.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiMfaSetup(sessionToken(guard.session), parsed.data.currentPassword);
      return {
        ok: true,
        data: {
          deviceId: data.device_id,
          otpauthUri: data.otpauth_uri,
          manualKey: data.manual_key,
        },
      };
    } catch (error) {
      return mfaFailure(error, m);
    }
  }
  await delay(400);
  if ((await mockMfaState()).enabled) return conflict(m.alreadyOn);
  if (isWrongMockPassword(parsed.data.currentPassword)) return mockPasswordRefused(m);
  const me = await getMe();
  return {
    ok: true,
    data: {
      deviceId: MOCK_DEVICE_ID,
      otpauthUri: mockOtpauthUri(me?.email ?? "admin"),
      manualKey: groupKey(MOCK_TOTP_SECRET),
    },
  };
}

/** Settings → enable, step 2 (`auth/mfa/confirm/`): the first code → MFA on, ten recovery codes once. */
export async function confirmMfaSetup(
  values: MfaConfirmValues,
  csrf: string,
): Promise<ActionResult<MfaRecoveryCodes>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(mfaDataCopy);
  const parsed = (await getLocalized(mfaSchemas)).confirm.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiMfaConfirm(
        sessionToken(guard.session),
        parsed.data.deviceId,
        parsed.data.code,
      );
      return { ok: true, data: { recoveryCodes: [...data.recovery_codes] } };
    } catch (error) {
      return mfaFailure(error, m);
    }
  }
  await delay(400);
  if ((await mockMfaState()).enabled) return conflict(m.alreadyOn);
  const refused = mockCodeRefused(m, parsed.data.code);
  if (refused) return refused;
  await saveMockMfaState({ enabled: true, recoveryCodesLeft: MOCK_RECOVERY_CODES.length });
  return { ok: true, data: { recoveryCodes: [...MOCK_RECOVERY_CODES] } };
}

/** Settings → turn off (`auth/mfa/disable/`): password + an authenticator or recovery code. */
export async function disableMfa(
  values: MfaDisableValues,
  csrf: string,
): Promise<ActionResult<MfaStatus>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(mfaDataCopy);
  const parsed = (await getLocalized(mfaSchemas)).disable.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiMfaDisable(sessionToken(guard.session), {
        current_password: parsed.data.currentPassword,
        code_or_recovery: parsed.data.code,
      });
      return {
        ok: true,
        data: { enabled: data.enabled, recoveryCodesLeft: data.recovery_codes_left },
      };
    } catch (error) {
      return mfaFailure(error, m);
    }
  }
  await delay(400);
  if (!(await mockMfaState()).enabled) return conflict(m.notOn);
  if (isWrongMockPassword(parsed.data.currentPassword)) return mockPasswordRefused(m);
  if (!isMockRecoveryCode(parsed.data.code)) {
    const refused = mockCodeRefused(m, parsed.data.code);
    if (refused) return refused;
  }
  await saveMockMfaState({ enabled: false, recoveryCodesLeft: 0 });
  return { ok: true, data: { enabled: false, recoveryCodesLeft: 0 } };
}

/** Settings → new recovery codes (`auth/mfa/recovery-codes/`): password + a TOTP code; the old ones stop working. */
export async function regenerateRecoveryCodes(
  values: MfaRegenerateValues,
  csrf: string,
): Promise<ActionResult<MfaRecoveryCodes>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(mfaDataCopy);
  const parsed = (await getLocalized(mfaSchemas)).regenerate.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiMfaRecoveryCodes(sessionToken(guard.session), {
        current_password: parsed.data.currentPassword,
        code: parsed.data.code,
      });
      return { ok: true, data: { recoveryCodes: [...data.recovery_codes] } };
    } catch (error) {
      return mfaFailure(error, m);
    }
  }
  await delay(400);
  if (!(await mockMfaState()).enabled) return conflict(m.notOn);
  if (isWrongMockPassword(parsed.data.currentPassword)) return mockPasswordRefused(m);
  const refused = mockCodeRefused(m, parsed.data.code);
  if (refused) return refused;
  await saveMockMfaState({ enabled: true, recoveryCodesLeft: MOCK_RECOVERY_CODES.length });
  return { ok: true, data: { recoveryCodes: [...MOCK_RECOVERY_CODES] } };
}

/* --- Staff → «MFA ni o‘chirish» ------------------------------------------------------------- */

const snapshotSchema = z.object({
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
  invite: z
    .object({
      state: z.enum(STAFF_INVITE_STATES),
      sentAt: z.string().max(40).nullable(),
      expiresAt: z.string().max(40).nullable(),
    })
    .nullable(),
});

/** Demo ids are `<n>` or `draft-<uuid>`; the API's are integers. */
const anyIdSchema = z.string().regex(/^(?:[1-9]\d{0,17}|draft-[0-9a-f-]{36})$/);
const apiIdSchema = z.string().regex(/^[1-9]\d{0,17}$/);

/** The demo's caller (the Administrator, `MOCK_ME.id`). */
const MOCK_SELF_ID = "1";

/**
 * The manager's reset of another member's panel MFA (a lost phone): `POST staff/{id}/reset-mfa/`
 * with the dialog's `Idempotency-Key` → the updated row (`mfaEnabled: false`); the backend also
 * ends every session of that member. Matches `ResetStaffMfaAction`
 * (`features/admin/staff/mfa-hook.ts`) plus the optional `reason`.
 */
export async function resetStaffMfa(
  id: string,
  key: string,
  csrf: string,
  snapshot?: unknown,
  reason?: unknown,
): Promise<ActionResult<StaffAccountRow>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(mfaDataCopy);
  if (!anyIdSchema.safeParse(id).success)
    return { ok: false, error: m.notFound, code: "not_found" };
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: m.badRequest };
  const parsed = (await getLocalized(mfaSchemas)).reset.safeParse({ reason: reason ?? "" });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    if (!apiIdSchema.safeParse(id).success)
      return { ok: false, error: m.notFound, code: "not_found" };
    return apiMutation("resetStaffMfa", async () => {
      try {
        const { data } = await apiResetStaffMfa(
          sessionToken(guard.session),
          id,
          key,
          parsed.data.reason,
        );
        return { ok: true, data: mapStaffRow(data) };
      } catch (error) {
        return mfaFailure(error, m);
      }
    });
  }
  await delay(400);
  const shown = snapshotSchema.safeParse(snapshot);
  const row =
    (shown.success && shown.data.id === id ? shown.data : null) ??
    MOCK_STAFF_ACCOUNTS.find((candidate) => candidate.id === id) ??
    null;
  const outcome = mockResetStaffMfa(row, MOCK_SELF_ID);
  if (outcome.ok) return { ok: true, data: outcome.row };
  if (outcome.reason === "not_found") return { ok: false, error: m.notFound, code: "not_found" };
  return conflict(outcome.reason === "self" ? m.resetSelf : m.resetNotOn);
}
