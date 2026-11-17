import type { MfaDataCopy } from "@/domain/copy/mfa";

import { isApiError } from "./api/errors";
import { toActionResult, type FieldRemap } from "./api/mappers/errors";
import type { ActionFailure } from "./types";

/**
 * How the admin panel MFA answers become what the forms show (DESIGN §E "MFA"; pure, unit-tested):
 *
 * - 400 `validation_error` with `current_password` `password_incorrect` → the password field;
 * - 400 `mfa_code_invalid` → the code field (the backend's message, already in the admin language);
 * - 409 `conflict` (already on / off: another tab or device changed it) → a form message, `code`
 *   `conflict` so the card re-reads its state;
 * - 429 → "too many attempts, try again in N seconds" with `retryAfter`;
 * - no answer / 5xx without the envelope → "could not reach the API".
 */

/** The API's field names in the settings forms (`code_or_recovery` is the dialog's `code`). */
const SETTINGS_REMAP: FieldRemap = {
  current_password: "currentPassword",
  code_or_recovery: "code",
};

export function mfaFailure(error: unknown, m: MfaDataCopy): ActionFailure {
  const base = toActionResult(error, SETTINGS_REMAP);
  if (!isApiError(error)) return base;
  if (error.status === 0) return { ok: false, error: m.unreachable, code: "network_error" };
  if (error.status === 429) {
    const failure: ActionFailure = {
      ok: false,
      error: error.retryAfter === undefined ? m.throttled : m.throttledFor(error.retryAfter),
      code: error.code,
    };
    if (error.retryAfter !== undefined) failure.retryAfter = error.retryAfter;
    return failure;
  }
  if (error.code === "mfa_code_invalid") {
    return {
      ok: false,
      error: error.body.message,
      code: error.code,
      fieldErrors: { code: error.body.message },
    };
  }
  if (error.code === "validation_error" && base.fieldErrors)
    return { ...base, error: m.checkFields };
  if (error.status >= 500 && (error.code.startsWith("http_") || error.code === "invalid_json")) {
    return { ok: false, error: m.unreachable, code: error.code };
  }
  return base;
}

/** What the sign-in's second step does with a refused `auth/mfa/verify/`. */
export type MfaStepRefusal =
  /** Wrong or reused code: the challenge stays, try again. */
  | { kind: "code"; message: string }
  /** The challenge is gone (expired, used, 6th attempt, password changed …): sign in again. */
  | { kind: "challenge" }
  /** Account lockout or the per-IP limit. */
  | { kind: "throttled"; message: string; retryAfter: number | null }
  | { kind: "form"; message: string };

export function mfaStepRefusal(error: unknown, m: MfaDataCopy): MfaStepRefusal {
  if (!isApiError(error)) return { kind: "form", message: m.unreachable };
  if (error.status === 0 || error.status >= 500) return { kind: "form", message: m.unreachable };
  if (error.status === 429) {
    return {
      kind: "throttled",
      message: error.retryAfter === undefined ? m.throttled : m.throttledFor(error.retryAfter),
      retryAfter: error.retryAfter ?? null,
    };
  }
  if (error.code === "mfa_challenge_invalid") return { kind: "challenge" };
  if (error.code === "mfa_code_invalid") return { kind: "code", message: error.body.message };
  if (error.code === "validation_error") {
    const fields = error.body.errors;
    // A challenge the backend does not accept (too long) cannot be answered: sign in again.
    if (fields.some((item) => item.field === "challenge")) return { kind: "challenge" };
    const onCode = fields.find((item) => item.field === "code" || item.field === "recovery_code");
    if (onCode) return { kind: "code", message: onCode.message };
  }
  return { kind: "form", message: error.body.message || m.unreachable };
}
