import { cookieNames } from "./cookie-names";
import { accessExpiresAtMs } from "./jwt";
import { OAUTH_COOKIE_PATH, OAUTH_FLOW_MAX_AGE_SECONDS, oauthCookieName } from "./oauth";

/**
 * Builders for the admin session cookies (spec "Frontend wiring › Auth").
 * They return plain objects so the attributes can be unit-tested and then be
 * applied to either `cookies()` (Server Actions) or `NextResponse.cookies`
 * (route handlers, proxy) through `setCookie`.
 */

export interface CookieAttributes {
  httpOnly: boolean;
  secure: boolean;
  /** `strict` for the session cookies; `lax` only for the OAuth flow cookie. */
  sameSite: "strict" | "lax";
  path: string;
  /** Seconds. `0` expires the cookie. */
  maxAge: number;
}

export interface SessionCookie {
  name: string;
  value: string;
  attributes: CookieAttributes;
}

/** The subset of `ResponseCookies` / `ReadonlyRequestCookies` the builders need. */
export interface CookieSink {
  set(name: string, value: string, options: Partial<CookieAttributes>): unknown;
}

/** Lifetime of the marker that stops the proxy from re-bouncing after a transient refresh failure. */
export const REFRESH_BACKOFF_SECONDS = 30;

export const ACCESS_PATH = "/admin";
export const REFRESH_PATH = "/admin/auth";
export const CSRF_PATH = "/admin";
export const BACKOFF_PATH = "/admin";

function secondsUntil(epochMs: number, nowMs: number): number {
  return Math.floor((epochMs - nowMs) / 1000);
}

/**
 * Seconds the access cookie may live: `min(JWT exp, access_expires_at) − now`.
 * Returns `0` or a negative number for an unusable token (undecodable, bad
 * timestamp, already expired) so callers can treat it as a failed refresh.
 */
export function accessCookieMaxAge(token: string, accessExpiresAt: string, nowMs: number): number {
  const fromJwt = accessExpiresAtMs(token);
  const fromBody = Date.parse(accessExpiresAt);
  if (fromJwt === null || Number.isNaN(fromBody)) return 0;
  return secondsUntil(Math.min(fromJwt, fromBody), nowMs);
}

export function accessCookie(input: {
  secure: boolean;
  token: string;
  accessExpiresAt: string;
  nowMs: number;
}): SessionCookie | null {
  const maxAge = accessCookieMaxAge(input.token, input.accessExpiresAt, input.nowMs);
  if (maxAge <= 0) return null;
  return {
    name: cookieNames(input.secure).access,
    value: input.token,
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "strict",
      path: ACCESS_PATH,
      maxAge,
    },
  };
}

export function refreshCookie(input: {
  secure: boolean;
  token: string;
  refreshExpiresAt: string;
  nowMs: number;
}): SessionCookie | null {
  const expiresAt = Date.parse(input.refreshExpiresAt);
  if (Number.isNaN(expiresAt)) return null;
  const maxAge = secondsUntil(expiresAt, input.nowMs);
  if (maxAge <= 0) return null;
  return {
    name: cookieNames(input.secure).refresh,
    value: input.token,
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "strict",
      path: REFRESH_PATH,
      maxAge,
    },
  };
}

/** Readable double-submit token; `maxAge` is the session's absolute lifetime (12 h). */
export function csrfCookie(input: {
  secure: boolean;
  value: string;
  maxAge?: number;
}): SessionCookie {
  return {
    name: cookieNames(input.secure).csrf,
    value: input.value,
    attributes: {
      httpOnly: false,
      secure: input.secure,
      sameSite: "strict",
      path: CSRF_PATH,
      maxAge: input.maxAge ?? 12 * 60 * 60,
    },
  };
}

export function refreshBackoffCookie(input: { secure: boolean }): SessionCookie {
  return {
    name: cookieNames(input.secure).refreshBackoff,
    value: "1",
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "strict",
      path: BACKOFF_PATH,
      maxAge: REFRESH_BACKOFF_SECONDS,
    },
  };
}

/**
 * The sealed OAuth flow (`src/data/auth/oauth.ts`): HttpOnly, `Path=/admin/auth`
 * (only the start and callback routes see it), and `SameSite=Lax` — the one
 * exception to Strict, because the provider sends the browser back with a
 * cross-site top-level GET, which carries Lax cookies but not Strict ones.
 * Ten minutes, like the flow's own expiry.
 */
export function oauthFlowCookie(input: { secure: boolean; value: string }): SessionCookie {
  return {
    name: oauthCookieName(input.secure),
    value: input.value,
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "lax",
      path: OAUTH_COOKIE_PATH,
      maxAge: OAUTH_FLOW_MAX_AGE_SECONDS,
    },
  };
}

/** Expires the OAuth flow cookie (same name, path and SameSite as when it was set). */
export function clearOAuthFlowCookie(sink: CookieSink, secure: boolean): void {
  sink.set(oauthCookieName(secure), "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: 0,
  });
}

export function setCookie(sink: CookieSink, cookie: SessionCookie): void {
  sink.set(cookie.name, cookie.value, cookie.attributes);
}

/** Expires all four cookies (name and path must match the originals). */
export function clearSessionCookies(sink: CookieSink, secure: boolean): void {
  const names = cookieNames(secure);
  const expired = (path: string, httpOnly: boolean): CookieAttributes => ({
    httpOnly,
    secure,
    sameSite: "strict",
    path,
    maxAge: 0,
  });
  sink.set(names.access, "", expired(ACCESS_PATH, true));
  sink.set(names.refresh, "", expired(REFRESH_PATH, true));
  sink.set(names.csrf, "", expired(CSRF_PATH, false));
  sink.set(names.refreshBackoff, "", expired(BACKOFF_PATH, true));
}
