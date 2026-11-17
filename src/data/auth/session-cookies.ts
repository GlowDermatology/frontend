import { applyAdminLocaleCookie, staffLanguage } from "@/lib/i18n/admin-locale-cookie";

import type { LoginResponse } from "../api/types";
import { accessCookie, csrfCookie, refreshCookie, setCookie, type CookieSink } from "./cookies";
import { mintCsrf } from "./csrf";

/**
 * The one code path that turns a sign-in answer (`auth/login/`, `auth/oauth/{provider}/`,
 * `auth/mfa/verify/` — the same `LoginResponse`) into the panel's session: the access cookie
 * (`Path=/admin`), the refresh cookie (`Path=/admin/auth`), a rotated double-submit csrf token, and
 * the member's saved language (`StaffUser.language`, DESIGN §G) when the backend sends it. Used by
 * the password login action, the OAuth callback and the MFA step, on `cookies()` or
 * `response.cookies` alike.
 *
 * Returns `false` (and sets nothing) when Django answered 200 with a token this server cannot use
 * (undecodable, already expired): callers treat it like an outage.
 */
export function applyStaffSession(
  sink: CookieSink,
  data: Pick<LoginResponse, "access" | "access_expires_at" | "refresh" | "refresh_expires_at"> & {
    user?: unknown;
  },
  secure: boolean,
  nowMs: number,
): boolean {
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
  if (!access || !refresh) return false;
  setCookie(sink, access);
  setCookie(sink, refresh);
  setCookie(sink, csrfCookie({ secure, value: mintCsrf() }));
  const language = staffLanguage(data.user);
  if (language) applyAdminLocaleCookie(sink, language, secure);
  return true;
}
