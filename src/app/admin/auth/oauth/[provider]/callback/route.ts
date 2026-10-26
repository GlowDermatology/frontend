import type { NextRequest, NextResponse } from "next/server";

import { apiOAuthLink, apiOAuthLogin, apiRefresh } from "@/data/api/auth";
import { isApiError } from "@/data/api/errors";
import { isSessionExpired } from "@/data/api/mappers/errors";
import type { OAuthCallbackRequest } from "@/data/api/types";
import { cookieNames } from "@/data/auth/cookie-names";
import {
  accessCookie,
  clearOAuthFlowCookie,
  clearSessionCookies,
  csrfCookie,
  refreshCookie,
  setCookie,
  type SessionCookie,
} from "@/data/auth/cookies";
import { mintCsrf } from "@/data/auth/csrf";
import { sameOriginBounce, seeOther } from "@/data/auth/html-page";
import { isAccessLive } from "@/data/auth/jwt";
import {
  CALLBACK_MESSAGES,
  OAUTH_PROVIDER_LABEL,
  checkCallback,
  nonceForExchange,
  oauthCookieName,
  openFlow,
  type OAuthFlow,
  type OAuthMode,
  type OAuthProvider,
} from "@/data/auth/oauth";
import { oauthKey } from "@/data/auth/oauth-env";
import { oauthErrorMessage } from "@/data/auth/oauth-errors";
import {
  enabledProvider,
  notFoundPage,
  redirectUriFor,
  sameOrigin,
  withNotice,
} from "@/data/auth/oauth-route";
import { classifyRefresh } from "@/data/auth/refresh-outcome";
import { serverEnv } from "@/lib/env.server";

/**
 * `GET /admin/auth/oauth/{provider}/callback?code=&state=` (contract §2.1).
 *
 * 1. A cross-site arrival (the provider's redirect) gets a same-origin
 *    bounce first: the session cookies are SameSite=Strict, so neither the
 *    link flow's access token nor the freshly set login cookies would reach
 *    the following requests of a cross-site navigation chain.
 * 2. The flow cookie is opened, the returned `state` compared with it, and
 *    the cookie cleared whatever the outcome (one attempt per flow).
 * 3. `intent=login`: `POST auth/oauth/{provider}/` with the code, the same
 *    `redirect_uri`, the PKCE verifier and (Google) the nonce; a 200 sets the
 *    access, refresh and rotated csrf cookies exactly like the password login
 *    and lands on the flow's `next`.
 *    `intent=link`: `POST auth/oauth/{provider}/link/` with the current
 *    access token (renewed once through the refresh cookie, which this path
 *    receives, when it lapsed during the round trip) and returns to the
 *    account card.
 * 4. Failures go back to the login page or the account card with a signed
 *    `?oauth=` notice carrying the backend's Uzbek message.
 *
 * Mock mode has no sessions and no Django: a login lands on `next`, a link
 * returns to the account card with a demo notice.
 */

interface Context {
  provider: OAuthProvider;
  mode: OAuthMode;
  secure: boolean;
  nowMs: number;
}

function failure(ctx: Context, intent: "login" | "link", message: string, next = "/admin") {
  const path =
    intent === "link" ? "/admin/settings" : `/admin/login?next=${encodeURIComponent(next)}`;
  return seeOther(withNotice(path, { kind: "error", provider: ctx.provider, message }, ctx.nowMs));
}

function exchangeBody(
  request: NextRequest,
  ctx: Context,
  flow: OAuthFlow,
  code: string,
): OAuthCallbackRequest | null {
  const redirectUri = redirectUriFor(request, ctx.provider, ctx.secure);
  if (!redirectUri) return null;
  const body: OAuthCallbackRequest = {
    code,
    code_verifier: flow.verifier,
    redirect_uri: redirectUri,
  };
  const nonce = nonceForExchange(flow, ctx.mode);
  if (nonce !== undefined) body.nonce = nonce;
  return body;
}

async function login(ctx: Context, flow: OAuthFlow, body: OAuthCallbackRequest) {
  let data;
  try {
    data = (await apiOAuthLogin(ctx.provider, body)).data;
  } catch (error) {
    if (!isApiError(error)) throw error;
    return failure(ctx, "login", oauthErrorMessage(error), flow.next);
  }
  const access = accessCookie({
    secure: ctx.secure,
    token: data.access,
    accessExpiresAt: data.access_expires_at,
    nowMs: ctx.nowMs,
  });
  const refresh = refreshCookie({
    secure: ctx.secure,
    token: data.refresh,
    refreshExpiresAt: data.refresh_expires_at,
    nowMs: ctx.nowMs,
  });
  if (!access || !refresh) {
    return failure(ctx, "login", "API bilan bog‘lanib bo‘lmadi.", flow.next);
  }
  const response = seeOther(flow.next);
  setCookie(response.cookies, access);
  setCookie(response.cookies, refresh);
  setCookie(response.cookies, csrfCookie({ secure: ctx.secure, value: mintCsrf() }));
  return response;
}

/** A fresh access token from the refresh cookie, or `null` when the session has ended. */
async function renewAccess(
  refreshToken: string | undefined,
  ctx: Context,
): Promise<SessionCookie | null> {
  if (!refreshToken) return null;
  let outcome;
  try {
    const response = await apiRefresh(refreshToken);
    outcome = classifyRefresh({ status: response.status, body: response.data }, ctx.nowMs, 0);
  } catch (error) {
    if (!isApiError(error)) throw error;
    outcome = classifyRefresh({ status: error.status, body: error.body }, ctx.nowMs, 0);
  }
  if (outcome.kind !== "ok") return null;
  return accessCookie({
    secure: ctx.secure,
    token: outcome.access,
    accessExpiresAt: outcome.accessExpiresAt,
    nowMs: ctx.nowMs,
  });
}

async function link(
  request: NextRequest,
  ctx: Context,
  body: OAuthCallbackRequest,
): Promise<NextResponse> {
  const names = cookieNames(ctx.secure);
  const refreshToken = request.cookies.get(names.refresh)?.value;
  let token = request.cookies.get(names.access)?.value;
  let renewed: SessionCookie | null = null;
  const sessionEnded = () => {
    const response = seeOther(
      withNotice(
        "/admin/login?next=%2Fadmin%2Fsettings",
        { kind: "error", provider: ctx.provider, message: "Sessiya tugadi. Qayta kiring." },
        ctx.nowMs,
      ),
    );
    clearSessionCookies(response.cookies, ctx.secure);
    return response;
  };

  if (!isAccessLive(token, ctx.nowMs, 0)) {
    renewed = await renewAccess(refreshToken, ctx);
    if (!renewed) return sessionEnded();
    token = renewed.value;
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      await apiOAuthLink(token ?? "", ctx.provider, body);
      break;
    } catch (error) {
      if (!isApiError(error)) throw error;
      // Authentication runs before the code exchange, so a 401 has not used the code.
      if (isSessionExpired(error) && attempt === 0) {
        renewed = await renewAccess(refreshToken, ctx);
        if (!renewed) return sessionEnded();
        token = renewed.value;
        continue;
      }
      if (isSessionExpired(error)) return sessionEnded();
      const response = failure(ctx, "link", oauthErrorMessage(error));
      if (renewed) setCookie(response.cookies, renewed);
      return response;
    }
  }

  const response = seeOther(
    withNotice(
      "/admin/settings",
      {
        kind: "linked",
        provider: ctx.provider,
        message: `${OAUTH_PROVIDER_LABEL[ctx.provider]} hisobi bog‘landi.`,
      },
      ctx.nowMs,
    ),
  );
  if (renewed) setCookie(response.cookies, renewed);
  return response;
}

export async function GET(
  request: NextRequest,
  routeCtx: RouteContext<"/admin/auth/oauth/[provider]/callback">,
) {
  const { provider: param } = await routeCtx.params;
  const enabled = enabledProvider(param);
  if (!enabled) return notFoundPage();
  const url = request.nextUrl;
  if (!sameOrigin(request)) return sameOriginBounce(url.pathname + url.search);

  const secure = serverEnv.cookieSecure();
  const ctx: Context = {
    provider: enabled.provider,
    mode: enabled.config.mode,
    secure,
    nowMs: Date.now(),
  };
  const params = url.searchParams;
  const check = checkCallback({
    flow: openFlow(request.cookies.get(oauthCookieName(secure))?.value, oauthKey(), ctx.nowMs),
    provider: ctx.provider,
    state: params.get("state"),
    code: params.get("code"),
    error: params.get("error"),
  });

  let response: NextResponse;
  if (!check.ok) {
    response = failure(ctx, check.intent, CALLBACK_MESSAGES[check.reason]);
  } else if (serverEnv.dataSource() === "mock") {
    response =
      check.flow.intent === "login"
        ? seeOther(check.flow.next)
        : seeOther(
            withNotice(
              "/admin/settings",
              {
                kind: "demo",
                provider: ctx.provider,
                message: `Demo rejimi: ${OAUTH_PROVIDER_LABEL[ctx.provider]} hisobi bog‘lanmadi, ma’lumotlar saqlanmaydi.`,
              },
              ctx.nowMs,
            ),
          );
  } else {
    const body = exchangeBody(request, ctx, check.flow, check.code);
    if (!body) response = failure(ctx, check.flow.intent, "Kutilmagan xato.", check.flow.next);
    else if (check.flow.intent === "login") response = await login(ctx, check.flow, body);
    else response = await link(request, ctx, body);
  }
  clearOAuthFlowCookie(response.cookies, secure);
  return response;
}
