import "server-only";

import type { Route } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { serverEnv } from "@/lib/env.server";

import { apiMe, type Me } from "./api/auth";
import { isApiError } from "./api/errors";
import { cookieNames } from "./auth/cookie-names";
import { csrfMatches } from "./auth/csrf";
import { decodeJwtPayload } from "./auth/jwt";
import { DEFAULT_NEXT, SPECIALIST_HOME, safeNext } from "./auth/next-param";
import { NEXT_PATH_HEADER } from "./auth/proxy-decision";

/**
 * Data Access Layer for the staff session (spec "Frontend wiring › Auth").
 *
 * Read it inside each page's data boundary (the `*-content.tsx` components,
 * which stream inside `<Suspense>`), in every Server Action and in route
 * handlers — **never in a layout**, which would make every admin route block
 * on the request. The browser never sees a token: the access JWT lives in an
 * HttpOnly cookie and only this server forwards it to Django.
 */

export type StaffSession =
  | { ok: true; mode: "mock" }
  | { ok: true; mode: "api"; token: string; sid: string | null }
  | { ok: false; reason: "no_session" | "expired" | "csrf" };

export interface VerifyStaffOptions {
  /**
   * The double-submit token presented by the caller (Server Action argument,
   * `X-CSRF-Token` header). When the property is present — even as
   * `undefined` or `null` — it must equal the `gd_csrf` cookie; an absent or
   * empty token fails with `reason: "csrf"`. Omit the property only for
   * reads (page content, GET route handlers).
   */
  csrf?: string | null;
}

/**
 * Checks the session cookies. In mock mode it is a no-op that reports a valid
 * session without touching cookies (the admin is open, as before). In api mode
 * it requires an access cookie whose JWT decodes and has not expired — Django
 * verifies the signature on every call; a forged token only reaches Django,
 * which answers 401.
 *
 * `await connection()` comes first so the mode is read at request time, never
 * baked into the static shell at build time.
 */
export async function verifyStaff(options: VerifyStaffOptions = {}): Promise<StaffSession> {
  await connection();
  if (serverEnv.dataSource() === "mock") return { ok: true, mode: "mock" };

  const store = await cookies();
  const names = cookieNames(serverEnv.cookieSecure());
  const token = store.get(names.access)?.value;
  if (!token) return { ok: false, reason: "no_session" };
  const claims = decodeJwtPayload(token);
  if (!claims) return { ok: false, reason: "no_session" };
  if (claims.exp * 1000 <= Date.now()) return { ok: false, reason: "expired" };
  if ("csrf" in options && !csrfMatches(store.get(names.csrf)?.value, options.csrf)) {
    return { ok: false, reason: "csrf" };
  }
  return { ok: true, mode: "api", token, sid: claims.sid };
}

export type VerifiedStaff = Extract<StaffSession, { ok: true }>;

export interface RequireStaffOptions {
  /**
   * The forced password change itself (`/admin/change-password`): an account that must set its
   * own password first is let through instead of being sent there. Every other caller leaves it
   * out.
   */
  allowPasswordChangePending?: boolean;
}

/** The forced password change page (DESIGN §E). */
export const CHANGE_PASSWORD_PATH = "/admin/change-password";

/** `/admin/change-password?next=…` for the current request's path (`x-gd-next`). */
export function changePasswordHref(next: string): Route {
  return `${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent(safeNext(next))}` as Route;
}

/**
 * For page content components: returns the session or redirects. An expired
 * access token goes to `/admin/auth/refresh?next=…` (the proxy normally does
 * this on GETs, but a token can lapse between the proxy and the render, and
 * client-side navigations skip the proxy's redirect); no session goes to
 * `/admin/login?next=…`. The current path comes from the `x-gd-next` request
 * header that `src/proxy.ts` stamps on every `/admin` request it handles
 * (path + query, validated with `safeNext`). That is more robust than each
 * page passing its own path: it includes the query string, survives page
 * refactors, and falls back to `/admin` when the header is absent (e.g. a
 * render that did not pass through the proxy).
 *
 * The forced password change (DESIGN §E): when `auth/me/` (cached per request,
 * shared with the shell) says `must_change_password`, every page goes to
 * `/admin/change-password?next=…` — the backend refuses its data with 403
 * `password_change_required` anyway. In mock mode `GLOWDERMA_MOCK_MUST_CHANGE`
 * previews it.
 */
export async function requireStaff(options: RequireStaffOptions = {}): Promise<VerifiedStaff> {
  const session = await verifyStaff();
  if (session.ok) {
    if (!options.allowPasswordChangePending && (await getMe())?.must_change_password) {
      redirect(changePasswordHref((await headers()).get(NEXT_PATH_HEADER) ?? "/admin"));
    }
    return session;
  }
  const next = encodeURIComponent(safeNext((await headers()).get(NEXT_PATH_HEADER)));
  if (session.reason === "expired") redirect(`/admin/auth/refresh?next=${next}`);
  redirect(`/admin/login?next=${next}`);
}

/**
 * For the api branches of the read dispatchers: the bearer token of the
 * verified session, with `requireStaff()`'s redirects when it is missing or
 * expired. Calling it in mock mode is a programming error (the dispatchers
 * branch on `dataSource()` first).
 */
export async function requireApiToken(): Promise<string> {
  const session = await requireStaff();
  if (session.mode !== "api") throw new Error("requireApiToken() called in mock mode");
  return session.token;
}

/**
 * For the content components of the specialist workspace (`/admin/my-*`): `requireStaff()`, then
 * the caller's own account. Mock mode has no specialist account and any other role belongs to the
 * admin workspace, so both go to `/admin`. `me` is `null` when `auth/me/` failed; the page's own
 * API reads then fail the same way and show their error state.
 */
export async function requireSpecialist(): Promise<{ token: string; me: Me | null }> {
  const session = await requireStaff();
  const me = await getMe();
  if (session.mode !== "api" || (me && me.role !== "specialist")) redirect(DEFAULT_NEXT);
  return { token: session.token, me };
}

/**
 * For the content components of admin pages whose components the specialist workspace reuses:
 * `requireStaff()`, then a specialist goes to their own home (`SPECIALIST_HOME`) instead of
 * reading admin data the backend would refuse anyway.
 */
export async function requireAdmin(): Promise<VerifiedStaff> {
  const session = await requireStaff();
  if ((await getMe())?.role === "specialist") redirect(SPECIALIST_HOME);
  return session;
}

/**
 * Shown in mock mode, matching the design's sidebar user block.
 * `is_superuser` follows `GLOWDERMA_MOCK_SUPERUSER` (default true) at request
 * time, so the demo can show the ordinary admin's notifications page too;
 * `must_change_password` follows `GLOWDERMA_MOCK_MUST_CHANGE` (default false)
 * and `capabilities.staff_email_invite` `GLOWDERMA_MOCK_EMAIL_INVITE` (default
 * true).
 */
export const MOCK_ME: Me = {
  // The demo staff list's Administrator (`src/data/mock/staff.ts`), so the
  // staff screen knows its own row.
  id: 1,
  email: "admin",
  display_name: "Administrator",
  role: "admin",
  is_superuser: true,
  is_manager: true,
  linked_providers: [],
  session_expires_at: "",
  auth_method: "password",
  language: "uz",
  must_change_password: false,
  mfa_enabled: false,
  capabilities: { staff_email_invite: true },
};

/**
 * Mock mode: set by the demo's forced password change, so `GLOWDERMA_MOCK_MUST_CHANGE` stops
 * gating this browser once the demo password was "changed" (Path=/admin, session cookie).
 */
export const MOCK_PASSWORD_SET_COOKIE = "gd_mock_password_set";

/**
 * The signed-in staff member (`GET auth/me/`), cached per request. `null` when
 * there is no valid session or Django rejects the token; callers render a
 * neutral fallback rather than redirecting (the content component does that).
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = await verifyStaff();
  if (!session.ok) return null;
  if (session.mode === "mock") {
    const changed = (await cookies()).get(MOCK_PASSWORD_SET_COOKIE) !== undefined;
    return {
      ...MOCK_ME,
      is_superuser: serverEnv.mockSuperuser(),
      must_change_password: serverEnv.mockMustChange() && !changed,
      capabilities: { staff_email_invite: serverEnv.mockEmailInvite() },
    };
  }
  try {
    return (await apiMe(session.token)).data;
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
});
