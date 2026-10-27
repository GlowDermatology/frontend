import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { customerFetchFrom, type CustomerDevice } from "./client";

/**
 * Session endpoints the BFF route handlers need (contract §2.1.6–§2.1.7).
 * Sign-in, registration, codes and social sign-in are W3b
 * (`auth/send-code/`, `verify-code/`, `set-password/`, `login/`,
 * `reset-password/`, `social/…`): add them here, setting the cookies with
 * `sessionCookies()` and `deviceKeyCookie()` from `src/data/customer-auth`.
 */

export interface ApiCustomerTokens {
  access: string;
  access_expires_at: string;
  refresh: string;
  refresh_expires_at: string;
}

/** `POST auth/refresh/` with this browser's device headers (they must match the session's device). */
export function apiCustomerRefresh(input: {
  refresh: string;
  device: CustomerDevice | undefined;
  locale: Locale;
  requestHeaders: Pick<Headers, "get">;
}) {
  return customerFetchFrom<ApiCustomerTokens>("/api/v1/auth/refresh/", {
    method: "POST",
    locale: input.locale,
    requestHeaders: input.requestHeaders,
    device: input.device,
    body: { refresh: input.refresh },
  });
}

/**
 * `POST auth/logout/` → 204; 401 `SESSION_EXPIRED` counts as logged out.
 * `scope` (`current` | `all`) arrives with B-W1's multi-session support and
 * is sent only when asked for, so the call works on both API versions.
 */
export function apiCustomerLogout(input: {
  refresh: string;
  scope?: "current" | "all";
  accessToken?: string;
  device: CustomerDevice | undefined;
  locale: Locale;
  requestHeaders: Pick<Headers, "get">;
}) {
  return customerFetchFrom<undefined>("/api/v1/auth/logout/", {
    method: "POST",
    locale: input.locale,
    requestHeaders: input.requestHeaders,
    device: input.device,
    accessToken: input.accessToken,
    body: input.scope ? { refresh: input.refresh, scope: input.scope } : { refresh: input.refresh },
  });
}
