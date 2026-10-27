import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { customerFetchFrom, type CustomerDevice } from "./client";

/**
 * Session endpoints the BFF route handlers need (contract §2.1.6–§2.1.7).
 * Sign-in, registration, codes and social sign-in are in `./account.ts`;
 * their Server Actions set the cookies with `sessionCookies()` and
 * `deviceKeyCookie()` (`src/data/shop/private.ts`).
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
 * `scope` (`current` | `others` | `all`, B-W1) is sent only when asked for
 * (`all` = «Hamma joydan chiqish»), so the call also works on an older API.
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
