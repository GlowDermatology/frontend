import type { NextRequest, NextResponse } from "next/server";

import { apiOAuthLink, apiOAuthLogin } from "@/data/api/auth";
import { isApiError, type ApiError } from "@/data/api/errors";
import { isSessionExpired } from "@/data/api/mappers/errors";
import type { OAuthCallbackRequest } from "@/data/api/types";
import { cookieNames } from "@/data/auth/cookie-names";
import {
  clearOAuthFlowCookie,
  clearSessionCookies,
  setCookie,
  type SessionCookie,
} from "@/data/auth/cookies";
import { requestTheme, sameOriginBounce, seeOther } from "@/data/auth/html-page";
import { decodeJwtPayload, isAccessLive } from "@/data/auth/jwt";
import { MFA_STEP_PATH, isMfaChallengeAnswer, mfaChallengeCookie } from "@/data/auth/mfa-challenge";
import {
  OAUTH_PROVIDER_LABEL,
  callbackMessages,
  checkCallback,
  nonceForExchange,
  oauthCookieName,
  openFlow,
  sessionMatches,
  type OAuthFlow,
  type OAuthMode,
  type OAuthProvider,
} from "@/data/auth/oauth";
import { consumeFlowState, oauthKey } from "@/data/auth/oauth-env";
import {
  oauthErrorMessage,
  oauthLinkErrorMessage,
  oauthRefusalLog,
} from "@/data/auth/oauth-errors";
import {
  enabledProvider,
  notFoundPage,
  redirectUriFor,
  sameOrigin,
  withNotice,
} from "@/data/auth/oauth-route";
import { renewAccess } from "@/data/auth/oauth-session";
import { applyStaffSession } from "@/data/auth/session-cookies";
import { MOCK_MFA_COOKIE, mockChallenge, readMockMfaState } from "@/data/mock/mfa";
import { authDataCopy, type AuthDataCopy } from "@/domain/copy/auth";
import { serverEnv } from "@/lib/env.server";
import { ADMIN_LOCALE_COOKIE, parseAdminLocale } from "@/lib/i18n/admin-locale-cookie";
import { LOCALE_INFO } from "@/lib/i18n/locales";

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
 *    and lands on the flow's `next`; with the admin panel MFA on, the answer
 *    is a challenge instead (DESIGN §E): it goes into the MFA step page's
 *    HttpOnly cookie with `next`, and the browser continues at `/admin/mfa`.
 *    `intent=link`: `POST auth/oauth/{provider}/link/` with the current
 *    access token (renewed once through the refresh cookie, which this path
 *    receives, when it lapsed during the round trip) — only when that token
 *    belongs to the session sealed into the flow by `start` — and returns to
 *    the account card.
 *    A state is accepted once per process (`consumeFlowState`), and a flow
 *    issued before the process started not at all: replaying a
 *    captured cookie and callback URL reads as an expired request.
 * 4. Failures go back to the login page or the account card with a signed
 *    `?oauth=` notice carrying the message in the admin language (the
 *    backend's, sent with `Accept-Language`, or this server's `authDataCopy`).
 *
 * Mock mode has no sessions and no Django: a login lands on `next` (or on the
 * MFA step while the demo's MFA is on), a link returns to the account card
 * with a demo notice.
 */

interface Context {
  provider: OAuthProvider;
  mode: OAuthMode;
  secure: boolean;
  nowMs: number;
  /** The admin language's messages (`gd_admin_language`). */
  m: AuthDataCopy;
}

function failure(ctx: Context, intent: "login" | "link", message: string, next = "/admin") {
  const path =
    intent === "link" ? "/admin/settings" : `/admin/login?next=${encodeURIComponent(next)}`;
  return seeOther(withNotice(path, { kind: "error", provider: ctx.provider, message }, ctx.nowMs));
}

/**
 * Server log of a refused exchange — everything but the expected 401 (an
 * identity that is not a staff member, an expired session). A field error
 * here means this server sent what Django does not accept (a `redirect_uri`
 * that differs from Django's `GOOGLE_OAUTH_REDIRECT_URI` /
 * `FACEBOOK_OAUTH_REDIRECT_URI`, a missing nonce), which the admin
 * only sees as a failed sign-in. The code and the verifier are never logged.
 */
function logRefusal(ctx: Context, intent: "login" | "link", error: ApiError): void {
  if (error.status === 401) return;
  console.warn(`[oauth] ${ctx.provider} ${intent} refused`, oauthRefusalLog(error));
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

/**
 * The MFA step for a first step's challenge: its cookie (HttpOnly, Strict, `Path=/admin/mfa`)
 * and a 303 there. The callback answered the same-origin bounce first, so the Strict cookie is
 * sent with the step page's request.
 */
function toMfaStep(
  ctx: Context,
  answer: { challenge: string; challenge_expires_at: string },
  next: string,
): NextResponse | null {
  const pending = mfaChallengeCookie({ secure: ctx.secure, answer, next, nowMs: ctx.nowMs });
  if (!pending) return null;
  const response = seeOther(MFA_STEP_PATH);
  setCookie(response.cookies, pending);
  return response;
}

async function login(ctx: Context, flow: OAuthFlow, body: OAuthCallbackRequest) {
  let data;
  try {
    data = (await apiOAuthLogin(ctx.provider, body)).data;
  } catch (error) {
    if (!isApiError(error)) throw error;
    logRefusal(ctx, "login", error);
    return failure(ctx, "login", oauthErrorMessage(error, ctx.m), flow.next);
  }
  if (isMfaChallengeAnswer(data)) {
    return toMfaStep(ctx, data, flow.next) ?? failure(ctx, "login", ctx.m.unreachable, flow.next);
  }
  const response = seeOther(flow.next);
  // The same code path as the password login and the MFA step.
  if (!applyStaffSession(response.cookies, data, ctx.secure, ctx.nowMs)) {
    return failure(ctx, "login", ctx.m.unreachable, flow.next);
  }
  return response;
}

async function link(
  request: NextRequest,
  ctx: Context,
  flow: OAuthFlow,
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
        { kind: "error", provider: ctx.provider, message: ctx.m.sessionEnded },
        ctx.nowMs,
      ),
    );
    clearSessionCookies(response.cookies, ctx.secure);
    return response;
  };
  const withRenewed = (response: NextResponse) => {
    if (renewed) setCookie(response.cookies, renewed);
    return response;
  };
  // The flow belongs to the session that started it (`start` sealed its
  // `sid`): a token of any other session — a link flow planted from another
  // browser — is refused before Django sees the code.
  const bound = (value: string | undefined) => sessionMatches(flow, decodeJwtPayload(value)?.sid);
  const notBound = () => {
    console.warn(`[oauth] ${ctx.provider} link refused: the flow belongs to another session`);
    return withRenewed(failure(ctx, "link", callbackMessages(ctx.m).state_mismatch));
  };
  const renew = async () => {
    renewed = await renewAccess(refreshToken, ctx.secure, ctx.nowMs);
    token = renewed?.value;
    return renewed;
  };

  if (isAccessLive(token, ctx.nowMs, 0)) {
    if (!bound(token)) return notBound();
  } else {
    if (!(await renew())) return sessionEnded();
    if (!bound(token)) return notBound();
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      await apiOAuthLink(token ?? "", ctx.provider, body);
      break;
    } catch (error) {
      if (!isApiError(error)) throw error;
      // Authentication runs before the code exchange, so a 401 has not used the code.
      if (isSessionExpired(error) && attempt === 0) {
        if (!(await renew())) return sessionEnded();
        if (!bound(token)) return notBound();
        continue;
      }
      if (isSessionExpired(error)) return sessionEnded();
      logRefusal(ctx, "link", error);
      return withRenewed(failure(ctx, "link", oauthLinkErrorMessage(error, ctx.m)));
    }
  }

  return withRenewed(
    seeOther(
      withNotice(
        "/admin/settings",
        {
          kind: "linked",
          provider: ctx.provider,
          message: ctx.m.linked(OAUTH_PROVIDER_LABEL[ctx.provider]),
        },
        ctx.nowMs,
      ),
    ),
  );
}

export async function GET(
  request: NextRequest,
  routeCtx: RouteContext<"/admin/auth/oauth/[provider]/callback">,
) {
  const { provider: param } = await routeCtx.params;
  // The admin language of this browser (`gd_admin_language`, `Path=/admin`).
  const locale = parseAdminLocale(request.cookies.get(ADMIN_LOCALE_COOKIE)?.value);
  const m = authDataCopy[locale];
  const lang = LOCALE_INFO[locale].htmlLang;
  const enabled = enabledProvider(param);
  if (!enabled) return notFoundPage(m.page, lang, requestTheme(request));
  const url = request.nextUrl;
  if (!sameOrigin(request)) {
    return sameOriginBounce(
      url.pathname + url.search,
      undefined,
      m.page,
      lang,
      requestTheme(request),
    );
  }

  const secure = serverEnv.cookieSecure();
  const ctx: Context = {
    provider: enabled.provider,
    mode: enabled.config.mode,
    secure,
    nowMs: Date.now(),
    m,
  };
  const params = url.searchParams;
  const check = checkCallback({
    flow: openFlow(request.cookies.get(oauthCookieName(secure))?.value, oauthKey(), ctx.nowMs),
    provider: ctx.provider,
    state: params.get("state"),
    code: params.get("code"),
    error: params.get("error"),
    consume: (flow) => consumeFlowState(flow, ctx.nowMs),
  });

  let response: NextResponse;
  if (!check.ok) {
    response = failure(ctx, check.intent, callbackMessages(m)[check.reason], check.next);
  } else if (serverEnv.dataSource() === "mock") {
    const mfaStep =
      check.flow.intent === "login" &&
      readMockMfaState(request.cookies.get(MOCK_MFA_COOKIE)?.value, serverEnv.mockMfa()).enabled
        ? toMfaStep(
            ctx,
            {
              challenge: mockChallenge(),
              challenge_expires_at: new Date(ctx.nowMs + 5 * 60_000).toISOString(),
            },
            check.flow.next,
          )
        : null;
    response =
      mfaStep ??
      (check.flow.intent === "login"
        ? seeOther(check.flow.next)
        : seeOther(
            withNotice(
              "/admin/settings",
              {
                kind: "demo",
                provider: ctx.provider,
                message: m.demoNotLinked(OAUTH_PROVIDER_LABEL[ctx.provider]),
              },
              ctx.nowMs,
            ),
          ));
  } else {
    const body = exchangeBody(request, ctx, check.flow, check.code);
    if (!body) response = failure(ctx, check.flow.intent, m.unexpected, check.flow.next);
    else if (check.flow.intent === "login") response = await login(ctx, check.flow, body);
    else response = await link(request, ctx, check.flow, body);
  }
  clearOAuthFlowCookie(response.cookies, secure);
  return response;
}
