import "server-only";

import { cookies } from "next/headers";

import { isAccessLive } from "@/data/auth/jwt";
import { csrfMatches } from "@/data/auth/csrf";
import type { ActionFailure } from "@/data/types";
import { serverEnv } from "@/lib/env.server";

import { customerCookieNames } from "./cookie-names";
import { isValidDeviceId } from "./cookies";

/**
 * The customer session as the server sees it (a DAL for W3b's private pages
 * and Server Actions). Read it inside each private page's data boundary and
 * in every customer Server Action, never in a shared layout: public pages
 * stay anonymous and cacheable.
 */

export interface CustomerSession {
  /** A live access token (not checked against the API: Django is the authority). */
  accessToken: string | null;
  /** Whether a refresh token exists (the proxy refreshes before a private page renders). */
  hasRefresh: boolean;
  deviceId: string | null;
}

export async function readCustomerSession(nowMs = Date.now()): Promise<CustomerSession> {
  const jar = await cookies();
  const names = customerCookieNames(serverEnv.cookieSecure());
  const access = jar.get(names.access)?.value;
  const deviceId = jar.get(names.deviceId)?.value;
  return {
    accessToken: access && isAccessLive(access, nowMs) ? access : null,
    hasRefresh: Boolean(jar.get(names.refresh)?.value),
    deviceId: isValidDeviceId(deviceId) ? deviceId : null,
  };
}

export const CUSTOMER_SESSION_EXPIRED: ActionFailure = {
  ok: false,
  error: "session_expired",
  code: "session_expired",
};
export const CUSTOMER_CSRF_FAILURE: ActionFailure = { ok: false, error: "csrf", code: "csrf" };

export type CustomerGuardInput = {
  csrfCookie: string | undefined;
  presented: unknown;
  accessToken: string | undefined;
  nowMs: number;
};

/**
 * The prologue of every customer Server Action (pure; unit-tested). Action
 * arguments are attacker-controlled, so a missing or empty csrf token is a
 * refusal before anything else; then the access token must be live, else
 * `session_expired` — the client plumbing (`features/shop/shared/
 * action-client.ts`) refreshes through `/api/shop/auth/refresh` and retries
 * once. The `error` values are codes: the client shows the localized text.
 */
export function checkCustomerAction(
  input: CustomerGuardInput,
): { ok: true; accessToken: string } | ActionFailure {
  if (typeof input.presented !== "string" || input.presented.length === 0) {
    return CUSTOMER_CSRF_FAILURE;
  }
  if (!csrfMatches(input.csrfCookie, input.presented)) return CUSTOMER_CSRF_FAILURE;
  if (!input.accessToken || !isAccessLive(input.accessToken, input.nowMs)) {
    return CUSTOMER_SESSION_EXPIRED;
  }
  return { ok: true, accessToken: input.accessToken };
}

/** `checkCustomerAction` against this request's cookies (W3b's Server Actions call this first). */
export async function guardCustomerAction(
  csrf: unknown,
): Promise<{ ok: true; accessToken: string } | ActionFailure> {
  const jar = await cookies();
  const names = customerCookieNames(serverEnv.cookieSecure());
  return checkCustomerAction({
    csrfCookie: jar.get(names.csrf)?.value,
    presented: csrf,
    accessToken: jar.get(names.access)?.value,
    nowMs: Date.now(),
  });
}
