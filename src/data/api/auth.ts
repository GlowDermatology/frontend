import "server-only";

import type { OAuthProvider } from "../auth/oauth";
import { apiFetch, type ApiResponse } from "./client";
import type {
  AccessResponse,
  LoginResponse as ApiLoginResponse,
  Me as ApiMe,
  OAuthCallbackRequest,
} from "./types";

/**
 * Typed calls to the auth endpoints (contract §2.1). Every function throws
 * `ApiError` for a non-2xx answer; the callers in `src/data/auth.ts`,
 * `auth.actions.ts` and the auth route handlers map those to outcomes.
 */

/** `GET auth/me/` (contract §2.1 `Me`), from the generated OpenAPI types. */
export type Me = ApiMe;
export type LoginResponse = ApiLoginResponse;
export type RefreshResponse = AccessResponse;

export const LOGOUT_SCOPES = ["current", "others", "all"] as const;
export type LogoutScope = (typeof LOGOUT_SCOPES)[number];

export function isLogoutScope(value: unknown): value is LogoutScope {
  return typeof value === "string" && (LOGOUT_SCOPES as readonly string[]).includes(value);
}

/** `POST auth/login/` (no bearer). 401 `invalid_credentials`, 429 `throttled`. */
export function apiLogin(body: {
  email: string;
  password: string;
}): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>("/api/v1/admin/auth/login/", { method: "POST", body });
}

/** `POST auth/refresh/` (no bearer). 401 `SESSION_EXPIRED` / `not_authenticated` ends the session. */
export function apiRefresh(refresh: string): Promise<ApiResponse<RefreshResponse>> {
  return apiFetch<RefreshResponse>("/api/v1/admin/auth/refresh/", {
    method: "POST",
    body: { refresh },
  });
}

/** `POST auth/logout/` → 204. A 401 `SESSION_EXPIRED` counts as logged out. */
export function apiLogout(refresh: string, scope: LogoutScope): Promise<ApiResponse<undefined>> {
  return apiFetch<undefined>("/api/v1/admin/auth/logout/", {
    method: "POST",
    body: { refresh, scope },
  });
}

/** `GET auth/me/` with the staff access token. */
export function apiMe(token: string): Promise<ApiResponse<Me>> {
  return apiFetch<Me>("/api/v1/admin/auth/me/", { token });
}

/**
 * `POST auth/oauth/{provider}/` (no bearer, M0b): the callback result in
 * exchange for a staff session, same body as `auth/login/`. 400
 * `oauth_exchange_failed` / `validation_error`, 401
 * `social_account_not_allowed`, 429, 503 `provider_unavailable`.
 */
export function apiOAuthLogin(
  provider: OAuthProvider,
  body: OAuthCallbackRequest,
): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>(`/api/v1/admin/auth/oauth/${provider}/`, {
    method: "POST",
    body,
  });
}

/** `POST auth/oauth/{provider}/link/` (bearer): links the identity, answers `Me`. 409 `conflict`. */
export function apiOAuthLink(
  token: string,
  provider: OAuthProvider,
  body: OAuthCallbackRequest,
): Promise<ApiResponse<Me>> {
  return apiFetch<Me>(`/api/v1/admin/auth/oauth/${provider}/link/`, {
    method: "POST",
    body,
    token,
  });
}

/** `DELETE auth/oauth/{provider}/` (bearer) → 204; 404 when nothing is linked. */
export function apiOAuthUnlink(
  token: string,
  provider: OAuthProvider,
): Promise<ApiResponse<undefined>> {
  return apiFetch<undefined>(`/api/v1/admin/auth/oauth/${provider}/`, {
    method: "DELETE",
    token,
  });
}
