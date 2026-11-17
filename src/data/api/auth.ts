import "server-only";

import type { OAuthProvider } from "../auth/oauth";
import { apiFetch, type ApiResponse } from "./client";
import type {
  AccessResponse,
  AdminLoginResult,
  ApiOwnPasswordLink,
  ApiPasswordTokenInfo,
  ApiPasswordTokenSet,
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
export type { AdminLoginResult };
export type RefreshResponse = AccessResponse;

export const LOGOUT_SCOPES = ["current", "others", "all"] as const;
export type LogoutScope = (typeof LOGOUT_SCOPES)[number];

export function isLogoutScope(value: unknown): value is LogoutScope {
  return typeof value === "string" && (LOGOUT_SCOPES as readonly string[]).includes(value);
}

/**
 * `POST auth/login/` (no bearer): a session, or the MFA challenge (`AdminLoginResult`). 401
 * `invalid_credentials`, 429 `throttled`.
 */
export function apiLogin(body: {
  email: string;
  password: string;
}): Promise<ApiResponse<AdminLoginResult>> {
  return apiFetch<AdminLoginResult>("/api/v1/admin/auth/login/", { method: "POST", body });
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
): Promise<ApiResponse<AdminLoginResult>> {
  return apiFetch<AdminLoginResult>(`/api/v1/admin/auth/oauth/${provider}/`, {
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

/**
 * `POST auth/password-link/` (bearer): e-mails the caller a single-use link to set their password
 * (an account that must change it but cannot type the current one). 409 `conflict` when no change
 * is pending or e-mail is not available; 429.
 */
export function apiOwnPasswordLink(token: string): Promise<ApiResponse<ApiOwnPasswordLink>> {
  return apiFetch<ApiOwnPasswordLink>("/api/v1/admin/auth/password-link/", {
    method: "POST",
    body: {},
    token,
  });
}

/** `POST auth/password-token/check/` (no bearer): whose link it is. 400 `token_invalid`, 429. */
export function apiPasswordTokenCheck(token: string): Promise<ApiResponse<ApiPasswordTokenInfo>> {
  return apiFetch<ApiPasswordTokenInfo>("/api/v1/admin/auth/password-token/check/", {
    method: "POST",
    body: { token },
  });
}

/**
 * `POST auth/password-token/set/` (no bearer) → 204, no session opened. 400 `token_invalid`, 400
 * `validation_error` on `new_password` (the link stays usable), 429.
 */
export function apiPasswordTokenSet(body: ApiPasswordTokenSet): Promise<ApiResponse<undefined>> {
  return apiFetch<undefined>("/api/v1/admin/auth/password-token/set/", { method: "POST", body });
}
