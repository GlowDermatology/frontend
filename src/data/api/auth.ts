import "server-only";

import { apiFetch, type ApiResponse } from "./client";

/**
 * Typed calls to the auth endpoints (contract §2.1). Every function throws
 * `ApiError` for a non-2xx answer; the callers in `src/data/auth.ts`,
 * `auth.actions.ts` and the auth route handlers map those to outcomes.
 */

/** `GET auth/me/` (contract §2.1 `Me`). */
export interface Me {
  id: number;
  email: string;
  display_name: string;
  is_superuser: boolean;
  linked_providers: string[];
  session_expires_at: string;
}

export interface LoginResponse {
  access: string;
  access_expires_at: string;
  refresh: string;
  refresh_expires_at: string;
  user: Me;
}

export interface RefreshResponse {
  access: string;
  access_expires_at: string;
  refresh_expires_at: string;
}

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
