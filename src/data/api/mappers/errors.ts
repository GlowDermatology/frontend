import type { ActionResult } from "../../types";
import { isApiError } from "../errors";
import { camelKey } from "./common";

/** The failure half of `ActionResult`. */
export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

/**
 * Per-action field remaps, keyed by the API's dotted snake_case path
 * (contract §7.1), e.g. `{"audience.phone": "phone"}`. A key ending in `.*`
 * matches every path under that prefix (`"link.*": "link"`). The value is the
 * form field name the UI expects.
 */
export type FieldRemap = Record<string, string>;

/** `ActionResult.error` for a 401 that ends the session; the client refreshes or goes to login. */
export const SESSION_EXPIRED = "session_expired";
export const NETWORK_ERROR_MESSAGE = "API bilan bog‘lanib bo‘lmadi.";
export const UNEXPECTED_ERROR_MESSAGE = "Kutilmagan xato.";

/** 401 codes that mean the session is gone (§1.2); `invalid_credentials` is not one. */
const SESSION_CODES = new Set(["not_authenticated", "SESSION_EXPIRED", "SESSION_REPLACED"]);

function throttledMessage(seconds: number): string {
  return `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`;
}

/**
 * Whether an error is a 401 that ends the current session (as opposed to a
 * wrong password on login). Callers clear the cookies or refresh once.
 */
export function isSessionExpired(error: unknown): boolean {
  return isApiError(error) && error.status === 401 && SESSION_CODES.has(error.code);
}

/**
 * API field path → form field name: the remap table first (exact, then `.*`
 * prefix), otherwise each dotted segment camelised, numeric segments kept
 * (`tiers.1.percent`, `texts.uz.name`, `scheduled_at` → `scheduledAt`).
 */
export function mapFieldPath(field: string, remap?: FieldRemap): string {
  if (remap) {
    const exact = remap[field];
    if (exact !== undefined) return exact;
    for (const [pattern, target] of Object.entries(remap)) {
      if (pattern.endsWith(".*") && field.startsWith(pattern.slice(0, -1))) return target;
    }
  }
  return field.split(".").map(camelKey).join(".");
}

/**
 * Turns a failed API call into the `{ ok: false }` half of `ActionResult`
 * (contract §1.6):
 *
 * - 400 `validation_error` → `error` is the first `errors[]` entry with
 *   `field: null`, else the envelope message; `fieldErrors` keeps the first
 *   message per field, paths mapped with `mapFieldPath`.
 * - 401 session codes → `error: "session_expired"` (see `isSessionExpired`);
 *   `invalid_credentials` keeps its message so the login form can show it.
 * - 429 → the contract template with the `Retry-After` seconds when present.
 * - transport failure (status 0) → "API bilan bog‘lanib bo‘lmadi.".
 * - everything else (409, 422, 503, 404, 5xx, …) → the envelope message.
 * - a non-`ApiError` is a bug, not an API outcome: it is logged and shown as
 *   "Kutilmagan xato." so the form never hangs.
 */
export function toActionResult(error: unknown, remap?: FieldRemap): ActionFailure {
  if (!isApiError(error)) {
    console.error("[data] unexpected error in a Server Action", error);
    return { ok: false, error: UNEXPECTED_ERROR_MESSAGE };
  }
  if (error.status === 0) return { ok: false, error: NETWORK_ERROR_MESSAGE };
  if (isSessionExpired(error)) return { ok: false, error: SESSION_EXPIRED };

  if (error.status === 400 && error.code === "validation_error") {
    const fieldErrors: Record<string, string> = {};
    let nonField: string | undefined;
    for (const item of error.body.errors) {
      if (item.field === null) {
        nonField ??= item.message;
        continue;
      }
      const key = mapFieldPath(item.field, remap);
      if (!(key in fieldErrors)) fieldErrors[key] = item.message;
    }
    const result: ActionFailure = { ok: false, error: nonField ?? error.body.message };
    if (Object.keys(fieldErrors).length > 0) result.fieldErrors = fieldErrors;
    return result;
  }

  if (error.status === 429 && error.retryAfter !== undefined) {
    return { ok: false, error: throttledMessage(error.retryAfter) };
  }
  return { ok: false, error: error.body.message };
}
