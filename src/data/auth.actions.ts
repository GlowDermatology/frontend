"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { staffAuthCopy } from "@/features/admin/auth/copy";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

import { apiLogin } from "./api/auth";
import { isApiError } from "./api/errors";
import { cookieNames } from "./auth/cookie-names";
import { setCookie } from "./auth/cookies";
import { csrfMatches } from "./auth/csrf";
import { MFA_STEP_PATH, isMfaChallengeAnswer, mfaChallengeCookie } from "./auth/mfa-challenge";
import { safeNext, staffDestination } from "./auth/next-param";
import { applyStaffSession } from "./auth/session-cookies";
import { mockMfaState } from "./mfa";
import { mockChallenge } from "./mock/mfa";

/**
 * Staff login (contract §2.1 `POST auth/login/`). Logout is the
 * `/admin/auth/logout` route handler; refresh is `/admin/auth/refresh`.
 */

export interface LoginState {
  error: string | null;
  /** Echoed back so the field keeps its value after React resets the form. */
  email?: string;
}

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254).toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
  next: z.string().optional(),
  csrf: z.string().optional(),
});

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * `useActionState` action of the login form. On success it sets the access,
 * refresh and (rotated) csrf cookies and redirects to the validated `next`.
 * With the admin panel MFA on (DESIGN §E) the backend answers a challenge
 * instead of a session: it goes into the step page's HttpOnly cookie (never
 * the URL or the browser's JavaScript) with `next`, and the browser moves on
 * to `/admin/mfa`, whose action opens the session through the same
 * `applyStaffSession`.
 */
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = field(formData, "email") ?? "";
  const fail = (error: string): LoginState => ({ error, email });
  // The sign-in page's language (`gd_admin_language`, its small switch), like the page itself.
  const m = (await copyFor(staffAuthCopy)).errors;
  const parsed = loginSchema.safeParse({
    email,
    password: field(formData, "password"),
    next: field(formData, "next"),
    csrf: field(formData, "csrf"),
  });
  if (!parsed.success) return fail(m.invalidForm);
  const next = safeNext(parsed.data.next);

  const secure = serverEnv.cookieSecure();
  const names = cookieNames(secure);
  const store = await cookies();

  // Mock mode has no sessions: the admin is open. With the demo's MFA on
  // (`GLOWDERMA_MOCK_MFA`, or switched on in Settings) the second step is shown.
  if (serverEnv.dataSource() === "mock") {
    if ((await mockMfaState()).enabled) {
      const nowMs = Date.now();
      const pending = mfaChallengeCookie({
        secure,
        answer: {
          challenge: mockChallenge(),
          challenge_expires_at: new Date(nowMs + 5 * 60_000).toISOString(),
        },
        next,
        nowMs,
      });
      if (pending) {
        setCookie(store, pending);
        redirect(MFA_STEP_PATH);
      }
    }
    redirect(next);
  }

  // Double-submit check: the proxy minted `gd_csrf` when the page was served
  // and the form echoes it. A stale or missing cookie means "reload".
  if (!csrfMatches(store.get(names.csrf)?.value, parsed.data.csrf)) {
    return fail(m.staleForm);
  }

  let data;
  try {
    data = (await apiLogin({ email: parsed.data.email, password: parsed.data.password })).data;
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 401) return fail(m.invalidCredentials);
    if (error.status === 429)
      return fail(error.retryAfter === undefined ? m.throttled : m.throttledFor(error.retryAfter));
    if (error.status === 0 || error.status >= 500) return fail(m.unreachable);
    return fail(error.body.message);
  }

  const nowMs = Date.now();
  if (isMfaChallengeAnswer(data)) {
    const pending = mfaChallengeCookie({ secure, answer: data, next, nowMs });
    if (!pending) return fail(m.unreachable);
    setCookie(store, pending);
    redirect(MFA_STEP_PATH);
  }
  // Django answered 200 with a token we cannot use: treat it like an outage.
  if (!applyStaffSession(store, data, secure, nowMs)) return fail(m.unreachable);
  redirect(staffDestination(data.user?.role, next));
}
