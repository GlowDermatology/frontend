import "server-only";

import type { NextRequest } from "next/server";

import { apiMe, apiRefresh } from "../api/auth";
import { isApiError } from "../api/errors";
import { cookieNames } from "./cookie-names";
import { accessCookie, type SessionCookie } from "./cookies";
import { decodeJwtPayload, isAccessLive } from "./jwt";
import { classifyRefresh } from "./refresh-outcome";

/**
 * The staff session as the OAuth route handlers see it (both receive the
 * access cookie on `Path=/admin` and the refresh cookie on `Path=/admin/auth`).
 */

/** A fresh access cookie from the refresh token, or `null` when the session has ended. */
export async function renewAccess(
  refreshToken: string | undefined,
  secure: boolean,
  nowMs: number,
): Promise<SessionCookie | null> {
  if (!refreshToken) return null;
  let outcome;
  try {
    const response = await apiRefresh(refreshToken);
    outcome = classifyRefresh({ status: response.status, body: response.data }, nowMs, 0);
  } catch (error) {
    if (!isApiError(error)) throw error;
    outcome = classifyRefresh({ status: error.status, body: error.body }, nowMs, 0);
  }
  if (outcome.kind !== "ok") return null;
  return accessCookie({
    secure,
    token: outcome.access,
    accessExpiresAt: outcome.accessExpiresAt,
    nowMs,
  });
}

export type VerifiedOAuthSession =
  | {
      ok: true;
      /** The `sid` claim of the token Django accepted. */
      sid: string;
      /** A renewed access cookie to set on the response, when the old one had lapsed. */
      renewed: SessionCookie | null;
    }
  | { ok: false; reason: "no_session" | "unavailable" };

/**
 * The session of this request, verified by Django (`GET auth/me/`), not just
 * the presence of a cookie: a lapsed access token is renewed once through the
 * refresh cookie, a 401 renews once and asks again. Used by the link flow's
 * `start` to bind the flow to the session (`OAuthFlow.sid`).
 */
export async function verifyOAuthSession(
  request: NextRequest,
  secure: boolean,
  nowMs: number,
): Promise<VerifiedOAuthSession> {
  const names = cookieNames(secure);
  const refreshToken = request.cookies.get(names.refresh)?.value;
  let token = request.cookies.get(names.access)?.value;
  let renewed: SessionCookie | null = null;
  if (!isAccessLive(token, nowMs, 0)) {
    renewed = await renewAccess(refreshToken, secure, nowMs);
    if (!renewed) return { ok: false, reason: "no_session" };
    token = renewed.value;
  }
  for (let attempt = 0; ; attempt += 1) {
    try {
      await apiMe(token ?? "");
      break;
    } catch (error) {
      if (!isApiError(error)) throw error;
      // Any 401 from `auth/me/` (expired, revoked, forged) means no usable session.
      if (error.status !== 401) return { ok: false, reason: "unavailable" };
      if (attempt > 0 || renewed) return { ok: false, reason: "no_session" };
      renewed = await renewAccess(refreshToken, secure, nowMs);
      if (!renewed) return { ok: false, reason: "no_session" };
      token = renewed.value;
    }
  }
  const sid = decodeJwtPayload(token)?.sid;
  if (!sid) return { ok: false, reason: "no_session" };
  return { ok: true, sid, renewed };
}
