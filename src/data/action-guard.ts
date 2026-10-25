import "server-only";

import { refresh } from "next/cache";
import { z } from "zod";

import { verifyStaff, type VerifiedStaff } from "./auth";
import type { ActionFailure, ActionResult } from "./types";

/**
 * Shared prologue of the Server Actions in `src/data/*.actions.ts` (spec
 * "Frontend wiring › Server Actions", contract §1.7):
 *
 * 1. `guardAction(csrf)` re-verifies the staff session and the double-submit
 *    token; the client plumbing (`features/admin/shared/action-client.ts`)
 *    branches on the returned `code`.
 * 2. `fieldErrorsFrom(zodError)` turns a failed re-validation into the
 *    `ActionResult` shape the forms already consume (first message per path).
 * 3. `apiMutation(name, call)` runs the api-mode branch: without a `call` the
 *    endpoint is not wired yet (F2) and the documented "not wired" failure is
 *    returned; with one, a successful result is followed by `refresh()` from
 *    `next/cache`, so the current route's RSC payload is re-rendered in the
 *    same roundtrip. Mock mode never refreshes: the fixtures do not change,
 *    so a re-render would only discard the client's local state (the order,
 *    ledger or schedule the action just returned).
 *
 * This module is not a `"use server"` file on purpose: such a file may only
 * export async functions, and these helpers are plain values.
 */

export const SESSION_EXPIRED_MESSAGE = "Sessiya tugadi. Qayta kiring.";
export const CSRF_MESSAGE = "Xavfsizlik tekshiruvi o‘tmadi. Sahifani yangilang.";
export const NOT_WIRED_MESSAGE = "Bu amal API bilan hali ulanmagan.";
export const INVALID_FORM_MESSAGE = "Maydonlarni tekshiring.";

export type Guarded = { ok: true; session: VerifiedStaff } | ActionFailure;

export async function guardAction(csrf: string): Promise<Guarded> {
  const session = await verifyStaff({ csrf });
  if (session.ok) return { ok: true, session };
  if (session.reason === "csrf") return { ok: false, error: CSRF_MESSAGE, code: "csrf" };
  return { ok: false, error: SESSION_EXPIRED_MESSAGE, code: "session_expired" };
}

/** Client-generated idempotency key (contract §1.7): one UUID per dialog instance. */
export const idempotencyKeySchema = z.uuid({ error: "Noto‘g‘ri so‘rov kaliti." });

export function fieldErrorsFrom(
  error: z.ZodError,
  message: string = INVALID_FORM_MESSAGE,
): ActionFailure {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, error: message, fieldErrors };
}

const warned = new Set<string>();

/** api mode, endpoint not wired yet (F2): a plain failure, warned once per action. */
function notWiredYet(action: string): ActionFailure {
  if (!warned.has(action)) {
    warned.add(action);
    console.warn(
      `[data] ${action}: GLOWDERMA_DATA_SOURCE=api but this mutation is not wired to Django yet.`,
    );
  }
  return { ok: false, error: NOT_WIRED_MESSAGE };
}

/**
 * The api-mode branch of a mutation. After a successful call the current
 * route is re-rendered (`refresh()`), so lists, counters and the sidebar
 * reflect the change in this roundtrip. Until F2 wires the endpoint there is
 * no `call`, and the "not wired" failure is returned instead.
 */
export async function apiMutation<T>(
  action: string,
  call?: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (!call) return notWiredYet(action);
  const result = await call();
  if (result.ok) refresh();
  return result;
}
