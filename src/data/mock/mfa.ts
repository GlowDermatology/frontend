import { randomBytes } from "node:crypto";

import type { StaffAccountRow } from "@/domain/staff";

/**
 * The demo's admin panel MFA (DESIGN §E "MFA"; mock mode only), deterministic so every screen can
 * be previewed:
 *
 * - the demo account's state lives in the `gd_mock_mfa` cookie of this browser (`off`, or
 *   `on:<recovery codes left>`); without it, `GLOWDERMA_MOCK_MFA=true` means "on, 3 codes left"
 *   (the low-codes warning) and anything else "off";
 * - while it is on, the demo sign-in asks for the second step;
 * - the authenticator code is always `123456`; `000000` imitates the code lockout (429);
 * - the recovery codes are `gdemo-10001` … `gdemo-10010`;
 * - a current password starting with `wrong` is refused (`password_incorrect`).
 *
 * Nothing secret: the demo key is a fixed, well-known value.
 */

export const MOCK_MFA_COOKIE = "gd_mock_mfa";
export const MOCK_TOTP_CODE = "123456";
export const MOCK_LOCKED_CODE = "000000";
export const MOCK_LOCK_SECONDS = 30;
export const MOCK_DEFAULT_CODES_LEFT = 3;
export const MOCK_DEVICE_ID = 1;
/** Base32 of the demo key (shown as the manual key, in groups of four). */
export const MOCK_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

export const MOCK_RECOVERY_CODES: ReadonlyArray<string> = Array.from(
  { length: 10 },
  (_, index) => `gdemo-${10001 + index}`,
);

export interface MockMfaState {
  enabled: boolean;
  recoveryCodesLeft: number;
}

/** The demo state from the cookie value, else from `GLOWDERMA_MOCK_MFA`. */
export function readMockMfaState(cookieValue: string | undefined, envOn: boolean): MockMfaState {
  if (cookieValue === "off") return { enabled: false, recoveryCodesLeft: 0 };
  const match = /^on:(\d{1,2})$/.exec(cookieValue ?? "");
  if (match) return { enabled: true, recoveryCodesLeft: Math.min(10, Number(match[1])) };
  return envOn
    ? { enabled: true, recoveryCodesLeft: MOCK_DEFAULT_CODES_LEFT }
    : { enabled: false, recoveryCodesLeft: 0 };
}

export function mockMfaCookieValue(state: MockMfaState): string {
  return state.enabled ? `on:${state.recoveryCodesLeft}` : "off";
}

/** The demo otpauth URI (issuer «Glow Derma Admin», like the backend's). */
export function mockOtpauthUri(account: string): string {
  const label = encodeURIComponent(`Glow Derma Admin:${account}`);
  return `otpauth://totp/${label}?secret=${MOCK_TOTP_SECRET}&algorithm=SHA1&digits=6&period=30&issuer=Glow%20Derma%20Admin`;
}

/** `ABCD EFGH …`, as the backend formats `manual_key`. */
export function groupKey(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function isMockRecoveryCode(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return MOCK_RECOVERY_CODES.some((code) => code.replace("-", "") === normalized);
}

export function isWrongMockPassword(password: string): boolean {
  return password.trim().toLowerCase().startsWith("wrong");
}

/** A demo challenge shaped like the backend's (`token_urlsafe(32)`). */
export function mockChallenge(): string {
  return randomBytes(32).toString("base64url");
}

export type MockResetOutcome =
  { ok: true; row: StaffAccountRow } | { ok: false; reason: "not_found" | "self" | "not_on" };

/** `reset-mfa/` against a demo row: the backend's refusals (own account, no panel MFA). */
export function mockResetStaffMfa(row: StaffAccountRow | null, selfId: string): MockResetOutcome {
  if (!row) return { ok: false, reason: "not_found" };
  if (row.id === selfId) return { ok: false, reason: "self" };
  if (!row.mfaEnabled) return { ok: false, reason: "not_on" };
  return { ok: true, row: { ...row, mfaEnabled: false } };
}
