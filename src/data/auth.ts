import "server-only";

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
import { safeNext } from "./auth/next-param";
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
 */
export async function requireStaff(): Promise<VerifiedStaff> {
  const session = await verifyStaff();
  if (session.ok) return session;
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

/** Shown in mock mode, matching the design's sidebar user block. */
export const MOCK_ME: Me = {
  id: 0,
  email: "admin",
  display_name: "Administrator",
  is_superuser: true,
  is_manager: true,
  linked_providers: [],
  session_expires_at: "",
  auth_method: "password",
};

/**
 * The signed-in staff member (`GET auth/me/`), cached per request. `null` when
 * there is no valid session or Django rejects the token; callers render a
 * neutral fallback rather than redirecting (the content component does that).
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = await verifyStaff();
  if (!session.ok) return null;
  if (session.mode === "mock") return MOCK_ME;
  try {
    return (await apiMe(session.token)).data;
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
});
