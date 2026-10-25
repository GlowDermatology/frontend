"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { serverEnv } from "@/lib/env.server";

import { apiLogin } from "./api/auth";
import { isApiError } from "./api/errors";
import { cookieNames } from "./auth/cookie-names";
import { accessCookie, csrfCookie, refreshCookie, setCookie } from "./auth/cookies";
import { csrfMatches, mintCsrf } from "./auth/csrf";
import { safeNext } from "./auth/next-param";

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

// Not exported: a "use server" module may only export async functions.
const MESSAGES = {
  invalidForm: "Email va parolni kiriting.",
  invalidCredentials: "Login yoki parol noto‘g‘ri.",
  unreachable: "API bilan bog‘lanib bo‘lmadi.",
  staleForm: "Sahifani yangilab, qayta urinib ko‘ring.",
  throttled: (seconds: number | undefined) =>
    seconds === undefined
      ? "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring."
      : `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
} as const;

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * `useActionState` action of the login form. On success it sets the access,
 * refresh and (rotated) csrf cookies and redirects to the validated `next`.
 */
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = field(formData, "email") ?? "";
  const fail = (error: string): LoginState => ({ error, email });
  const parsed = loginSchema.safeParse({
    email,
    password: field(formData, "password"),
    next: field(formData, "next"),
    csrf: field(formData, "csrf"),
  });
  if (!parsed.success) return fail(MESSAGES.invalidForm);
  const next = safeNext(parsed.data.next);

  // Mock mode has no sessions: the admin is open.
  if (serverEnv.dataSource() === "mock") redirect(next);

  const secure = serverEnv.cookieSecure();
  const names = cookieNames(secure);
  const store = await cookies();
  // Double-submit check: the proxy minted `gd_csrf` when the page was served
  // and the form echoes it. A stale or missing cookie means "reload".
  if (!csrfMatches(store.get(names.csrf)?.value, parsed.data.csrf)) {
    return fail(MESSAGES.staleForm);
  }

  let data;
  try {
    data = (await apiLogin({ email: parsed.data.email, password: parsed.data.password })).data;
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 401) return fail(MESSAGES.invalidCredentials);
    if (error.status === 429) return fail(MESSAGES.throttled(error.retryAfter));
    if (error.status === 0 || error.status >= 500) return fail(MESSAGES.unreachable);
    return fail(error.body.message);
  }

  const nowMs = Date.now();
  const access = accessCookie({
    secure,
    token: data.access,
    accessExpiresAt: data.access_expires_at,
    nowMs,
  });
  const refresh = refreshCookie({
    secure,
    token: data.refresh,
    refreshExpiresAt: data.refresh_expires_at,
    nowMs,
  });
  // Django answered 200 with a token we cannot use: treat it like an outage.
  if (!access || !refresh) return fail(MESSAGES.unreachable);

  setCookie(store, access);
  setCookie(store, refresh);
  setCookie(store, csrfCookie({ secure, value: mintCsrf() }));
  redirect(next);
}
