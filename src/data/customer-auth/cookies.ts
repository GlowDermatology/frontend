import { randomBytes } from "node:crypto";

import {
  accessCookieMaxAge,
  type CookieAttributes,
  type CookieSink,
  type SessionCookie,
} from "@/data/auth/cookies";

import { customerCookieNames } from "./cookie-names";

/**
 * Builders for the customer session cookies (see `cookie-names.ts` for what
 * each one is). Plain objects, so the attributes are unit-tested and applied
 * to `cookies()` (Server Actions) or `NextResponse.cookies` (route handlers,
 * proxy) through `setCookie` from the admin module.
 */

export const CUSTOMER_COOKIE_PATH = "/";
/** Browsers cap cookie lifetimes at 400 days (RFC 6265bis). */
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
/** The csrf token outlives a refresh token's sliding window (60 days). */
export const CUSTOMER_CSRF_MAX_AGE = 60 * 24 * 60 * 60;
export const CUSTOMER_REFRESH_BACKOFF_SECONDS = 30;

/** `^[A-Za-z0-9_-]{8,128}$` — the API's device id pattern (contract §1.2). */
const DEVICE_ID = /^[A-Za-z0-9_-]{8,128}$/;
/** `secrets.token_urlsafe(32)`: exactly 43 base64url characters (§1.2). */
const DEVICE_KEY = /^[A-Za-z0-9_-]{43}$/;

/**
 * A new browser device id: `web_` plus 22 random base64url characters
 * (128 bits). The prefix lets support and logs tell a browser from an app
 * install at a glance; the API sees an opaque, well-formed id.
 */
export function mintDeviceId(): string {
  return `web_${randomBytes(16).toString("base64url")}`;
}

export function isValidDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID.test(value);
}

export function isValidDeviceKey(value: unknown): value is string {
  return typeof value === "string" && DEVICE_KEY.test(value);
}

function attributes(secure: boolean, httpOnly: boolean, maxAge: number): CookieAttributes {
  return { httpOnly, secure, sameSite: "lax", path: CUSTOMER_COOKIE_PATH, maxAge };
}

function secondsUntil(iso: string, nowMs: number): number {
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : Math.floor((at - nowMs) / 1000);
}

export function customerAccessCookie(input: {
  secure: boolean;
  token: string;
  accessExpiresAt: string;
  nowMs: number;
}): SessionCookie | null {
  const maxAge = accessCookieMaxAge(input.token, input.accessExpiresAt, input.nowMs);
  if (maxAge <= 0) return null;
  return {
    name: customerCookieNames(input.secure).access,
    value: input.token,
    attributes: attributes(input.secure, true, maxAge),
  };
}

export function customerRefreshCookie(input: {
  secure: boolean;
  token: string;
  refreshExpiresAt: string;
  nowMs: number;
}): SessionCookie | null {
  const maxAge = secondsUntil(input.refreshExpiresAt, input.nowMs);
  if (maxAge <= 0 || input.token.length === 0) return null;
  return {
    name: customerCookieNames(input.secure).refresh,
    value: input.token,
    attributes: attributes(input.secure, true, maxAge),
  };
}

/** Readable `1` that lives as long as the refresh token: the header's "signed in" hint. */
export function signedInHintCookie(input: { secure: boolean; maxAge: number }): SessionCookie {
  return {
    name: customerCookieNames(input.secure).signedIn,
    value: "1",
    attributes: attributes(input.secure, false, input.maxAge),
  };
}

export function customerCsrfCookie(input: { secure: boolean; value: string }): SessionCookie {
  return {
    name: customerCookieNames(input.secure).csrf,
    value: input.value,
    attributes: attributes(input.secure, false, CUSTOMER_CSRF_MAX_AGE),
  };
}

export function deviceIdCookie(input: { secure: boolean; value: string }): SessionCookie {
  return {
    name: customerCookieNames(input.secure).deviceId,
    value: input.value,
    attributes: attributes(input.secure, true, DEVICE_COOKIE_MAX_AGE),
  };
}

/** The `device_key` of a verified sign-in (`AuthTokens.device_key`, §1.9); `null` for a malformed key. */
export function deviceKeyCookie(input: { secure: boolean; value: string }): SessionCookie | null {
  if (!isValidDeviceKey(input.value)) return null;
  return {
    name: customerCookieNames(input.secure).deviceKey,
    value: input.value,
    attributes: attributes(input.secure, true, DEVICE_COOKIE_MAX_AGE),
  };
}

export function customerRefreshBackoffCookie(input: { secure: boolean }): SessionCookie {
  return {
    name: customerCookieNames(input.secure).refreshBackoff,
    value: "1",
    attributes: attributes(input.secure, true, CUSTOMER_REFRESH_BACKOFF_SECONDS),
  };
}

/**
 * Tokens of a sign-in or a refresh as the cookies that carry them: access,
 * refresh and the signed-in hint. `null` when the answer is unusable (an
 * expired or undecodable access token, a past refresh expiry), which the
 * callers treat like a transient failure.
 */
export function sessionCookies(input: {
  secure: boolean;
  access: string;
  accessExpiresAt: string;
  refresh: string;
  refreshExpiresAt: string;
  nowMs: number;
}): SessionCookie[] | null {
  const access = customerAccessCookie({
    secure: input.secure,
    token: input.access,
    accessExpiresAt: input.accessExpiresAt,
    nowMs: input.nowMs,
  });
  const refresh = customerRefreshCookie({
    secure: input.secure,
    token: input.refresh,
    refreshExpiresAt: input.refreshExpiresAt,
    nowMs: input.nowMs,
  });
  if (!access || !refresh) return null;
  return [
    access,
    refresh,
    signedInHintCookie({ secure: input.secure, maxAge: refresh.attributes.maxAge }),
  ];
}

/**
 * Ends the browser side of a customer session: access, refresh, the hint and
 * the backoff marker. The device id and device key stay — they identify the
 * browser, not the session (§1.9: signing in again on a known device skips
 * the SMS), and the csrf token stays valid for the next sign-in form.
 */
export function clearCustomerSession(sink: CookieSink, secure: boolean): void {
  const names = customerCookieNames(secure);
  sink.set(names.access, "", attributes(secure, true, 0));
  sink.set(names.refresh, "", attributes(secure, true, 0));
  sink.set(names.signedIn, "", attributes(secure, false, 0));
  sink.set(names.refreshBackoff, "", attributes(secure, true, 0));
}
