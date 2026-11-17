import { z } from "zod";

import { mfaDataCopy } from "@/domain/copy/mfa";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

/**
 * Validation of the admin panel MFA forms (DESIGN §E "MFA"), shared by the dialogs, the sign-in's
 * second step and their Server Actions. Lengths follow the backend's serializers: a password ≤ 128,
 * a TOTP code ≤ 16 (six digits in practice), a recovery code ≤ 32 (`xxxxx-xxxxx`; case, spaces and
 * dashes are ignored by the backend), a challenge ≤ 128.
 */

export const PASSWORD_MAX = 128;
export const CODE_MAX = 16;
export const RECOVERY_MAX = 32;
export const RESET_REASON_MAX = 200;

/** Digits of a typed or pasted TOTP code (`123 456`, `123-456` → `123456`). */
export function normalizeTotp(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function isTotpCode(value: string): boolean {
  return /^\d{6}$/.test(normalizeTotp(value));
}

/** A recovery code as the backend compares it: lower-case letters and digits only. */
export function normalizeRecovery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isRecoveryCode(value: string): boolean {
  return value.trim().length <= RECOVERY_MAX && /^[a-z0-9]{10}$/.test(normalizeRecovery(value));
}

/** `code_or_recovery` of `auth/mfa/disable/`: six digits → TOTP, anything else → a recovery code. */
export function factorOf(value: string): "totp" | "recovery" {
  return isTotpCode(value) ? "totp" : "recovery";
}

export const mfaSchemas = localized(mfaDataCopy, (m) => {
  const password = z.string().min(1, m.passwordRequired).max(PASSWORD_MAX, m.badRequest);
  const totp = z
    .string()
    .max(CODE_MAX, m.codeFormat)
    .transform(normalizeTotp)
    .pipe(
      z
        .string()
        .min(1, m.codeRequired)
        .regex(/^\d{6}$/, m.codeFormat),
    );
  const recovery = z
    .string()
    .trim()
    .min(1, m.recoveryRequired)
    .max(RECOVERY_MAX, m.recoveryFormat)
    .refine(isRecoveryCode, m.recoveryFormat);
  const codeOrRecovery = z
    .string()
    .trim()
    .min(1, m.codeOrRecoveryRequired)
    .max(RECOVERY_MAX, m.codeOrRecoveryFormat)
    .refine((value) => isTotpCode(value) || isRecoveryCode(value), m.codeOrRecoveryFormat)
    .transform((value) => (isTotpCode(value) ? normalizeTotp(value) : value));
  return {
    /** Settings → enable, step 1: re-enter the password. */
    setup: z.object({ currentPassword: password }),
    /** Settings → enable, step 2: the pending device's first code. */
    confirm: z.object({
      deviceId: z.number({ error: m.badRequest }).int(m.badRequest).min(1, m.badRequest),
      code: totp,
    }),
    /** Settings → turn off: password + a TOTP or recovery code. */
    disable: z.object({ currentPassword: password, code: codeOrRecovery }),
    /** Settings → new recovery codes: password + a TOTP code. */
    regenerate: z.object({ currentPassword: password, code: totp }),
    /** The sign-in's second step: one factor. */
    verify: z.discriminatedUnion("factor", [
      z.object({ factor: z.literal("totp"), code: totp }),
      z.object({ factor: z.literal("recovery"), code: recovery }),
    ]),
    /** Staff → «MFA ni o‘chirish»: an optional reason. */
    reset: z.object({
      reason: z.string().trim().max(RESET_REASON_MAX, m.reasonTooLong(RESET_REASON_MAX)),
    }),
  };
});

type MfaSchemas = LocalizedOf<typeof mfaSchemas>;
export type MfaSetupValues = z.input<MfaSchemas["setup"]>;
export type MfaConfirmValues = z.input<MfaSchemas["confirm"]>;
export type MfaDisableValues = z.input<MfaSchemas["disable"]>;
export type MfaRegenerateValues = z.input<MfaSchemas["regenerate"]>;
export type MfaVerifyValues = z.input<MfaSchemas["verify"]>;
