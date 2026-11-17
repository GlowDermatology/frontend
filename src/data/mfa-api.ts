import "server-only";

import { apiFetch, type ApiResponse } from "./api/client";
import type { ApiStaffMember, LoginResponse, Schemas } from "./api/types";

/**
 * Typed calls to the admin panel MFA endpoints (contract §2.1 "Admin panel MFA", §2.16
 * `reset-mfa/`; backend `INTERFACES-mfa.md`). Every function throws `ApiError` for a non-2xx answer;
 * `src/data/mfa.ts` and `src/data/mfa.actions.ts` map those to outcomes. Codes, passwords and the
 * challenge travel in JSON bodies only (never in a URL), and nothing here logs them.
 */

const BASE = "/api/v1/admin";

export type ApiMfaStatus = Schemas["MfaStatus"];
export type ApiMfaSetup = Schemas["MfaSetup"];
export type ApiMfaRecoveryCodes = Schemas["MfaRecoveryCodes"];
/**
 * `MfaVerifyRequest` carries the challenge and exactly one factor; the generated type has both
 * optional, so this narrows it to the two shapes the backend accepts.
 */
export type ApiMfaVerifyRequest =
  | (Pick<Schemas["MfaVerifyRequest"], "challenge"> & { code: string; recovery_code?: never })
  | (Pick<Schemas["MfaVerifyRequest"], "challenge"> & { recovery_code: string; code?: never });
type ApiStaffResetMfaRequest = Partial<Schemas["StaffResetMfaRequest"]>;

/** `GET auth/mfa/` (bearer): on or off, unused recovery codes (0 while off). */
export function apiMfaStatus(token: string): Promise<ApiResponse<ApiMfaStatus>> {
  return apiFetch<ApiMfaStatus>(`${BASE}/auth/mfa/`, { token });
}

/**
 * `POST auth/mfa/setup/ {current_password}` (bearer): a pending TOTP device. 400
 * `password_incorrect` on `current_password`, 409 `conflict` (already on), 429.
 */
export function apiMfaSetup(
  token: string,
  currentPassword: string,
): Promise<ApiResponse<ApiMfaSetup>> {
  return apiFetch<ApiMfaSetup>(`${BASE}/auth/mfa/setup/`, {
    method: "POST",
    body: { current_password: currentPassword },
    token,
  });
}

/** `POST auth/mfa/confirm/ {device_id, code}` → the ten recovery codes, once. 400 `mfa_code_invalid`, 409, 429. */
export function apiMfaConfirm(
  token: string,
  deviceId: number,
  code: string,
): Promise<ApiResponse<ApiMfaRecoveryCodes>> {
  return apiFetch<ApiMfaRecoveryCodes>(`${BASE}/auth/mfa/confirm/`, {
    method: "POST",
    body: { device_id: deviceId, code },
    token,
  });
}

/**
 * `POST auth/mfa/disable/ {current_password, code_or_recovery}` → the new status. 400
 * `password_incorrect` / `mfa_code_invalid`, 409 (off), 429.
 */
export function apiMfaDisable(
  token: string,
  body: { current_password: string; code_or_recovery: string },
): Promise<ApiResponse<ApiMfaStatus>> {
  return apiFetch<ApiMfaStatus>(`${BASE}/auth/mfa/disable/`, { method: "POST", body, token });
}

/** `POST auth/mfa/recovery-codes/ {current_password, code}` → ten new codes; the old ones stop working. */
export function apiMfaRecoveryCodes(
  token: string,
  body: { current_password: string; code: string },
): Promise<ApiResponse<ApiMfaRecoveryCodes>> {
  return apiFetch<ApiMfaRecoveryCodes>(`${BASE}/auth/mfa/recovery-codes/`, {
    method: "POST",
    body,
    token,
  });
}

/**
 * `POST auth/mfa/verify/` (public, no bearer): the challenge plus exactly one factor → the
 * `auth/login/` session answer. 400 `mfa_code_invalid` (challenge kept), 400
 * `mfa_challenge_invalid` (sign in again), 429.
 */
export function apiMfaVerify(body: ApiMfaVerifyRequest): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>(`${BASE}/auth/mfa/verify/`, { method: "POST", body });
}

/**
 * `POST staff/{id}/reset-mfa/` (manager, optional `Idempotency-Key`) → the `StaffMember` with
 * `mfa_enabled: false`. 403, 404, 409 `conflict` (own account / no panel MFA).
 *
 * The optional `StaffResetMfaRequest` body carries `reason` (trimmed, ≤ 200 characters), which the
 * backend keeps on the `auth.mfa_reset` audit entry; an empty reason sends an empty body.
 */
export function apiResetStaffMfa(
  token: string,
  staffId: string,
  idempotencyKey: string,
  reason: string,
): Promise<ApiResponse<ApiStaffMember>> {
  return apiFetch<ApiStaffMember>(`${BASE}/staff/${encodeURIComponent(staffId)}/reset-mfa/`, {
    method: "POST",
    body: (reason ? { reason } : {}) satisfies ApiStaffResetMfaRequest,
    token,
    idempotencyKey,
  });
}
