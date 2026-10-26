import type { NextRequest } from "next/server";

import { clientIpFrom } from "@/data/api/client";

import {
  clearSessionCookies,
  oauthFlowCookie,
  setCookie,
  type SessionCookie,
} from "@/data/auth/cookies";
import { seeOther } from "@/data/auth/html-page";
import { safeNext } from "@/data/auth/next-param";
import { authorizeUrl, newFlow, sealFlow, type OAuthIntent } from "@/data/auth/oauth";
import { allowFlowStart, oauthKey } from "@/data/auth/oauth-env";
import { OAUTH_THROTTLED_MESSAGE, OAUTH_UNREACHABLE_MESSAGE } from "@/data/auth/oauth-errors";
import {
  enabledProvider,
  notFoundPage,
  redirectUriFor,
  sameOrigin,
  withNotice,
} from "@/data/auth/oauth-route";
import { verifyOAuthSession } from "@/data/auth/oauth-session";
import { serverEnv } from "@/lib/env.server";

/**
 * `GET /admin/auth/oauth/{provider}/start?intent=login|link&next=` (contract
 * §2.1, M0b). Creates the flow (state, PKCE verifier, nonce), seals it into
 * the HttpOnly `gd_oauth` cookie (`Path=/admin/auth`, `SameSite=Lax`, 10 min)
 * and redirects to the provider's authorize URL — the built-in fake page when
 * `GLOWDERMA_OAUTH_MODE=fake`. A provider that is not enabled is a 404.
 *
 * `intent=link` (the account card) needs a same-origin request and, in api
 * mode, a session Django accepts (`verifyOAuthSession`: `auth/me/`, renewed
 * once through the refresh cookie) — a cookie that merely exists is not
 * enough. The flow is sealed with that session's `sid`, and the callback
 * links only with a token of the same session, so a link flow cannot be
 * planted into another browser. A link started from another site, or after
 * the session ended, goes back to the settings page or the login page without
 * touching the provider. `next` is honoured for a login only and validated
 * like the login page's (`safeNext`).
 *
 * Each client IP (as the edge reports it) may start a limited number of
 * flows per minute (`allowFlowStart`); past that the login page or the
 * account card says to try again later. That keeps one client from filling
 * the callback's set of used states.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/admin/auth/oauth/[provider]/start">,
) {
  const { provider: param } = await ctx.params;
  const enabled = enabledProvider(param);
  if (!enabled) return notFoundPage();
  const { provider, config } = enabled;

  const params = request.nextUrl.searchParams;
  const intent: OAuthIntent = params.get("intent") === "link" ? "link" : "login";
  const secure = serverEnv.cookieSecure();

  const redirectUri = redirectUriFor(request, provider, secure);
  const clientId = config.clientIds[provider];
  if (!redirectUri || !clientId) return notFoundPage();

  const nowMs = Date.now();
  if (!allowFlowStart(clientIpFrom(request.headers), nowMs)) {
    const back =
      intent === "link"
        ? "/admin/settings"
        : `/admin/login?next=${encodeURIComponent(safeNext(params.get("next")))}`;
    return seeOther(
      withNotice(back, { kind: "error", provider, message: OAUTH_THROTTLED_MESSAGE }, nowMs),
    );
  }
  let sid: string | null = null;
  let renewed: SessionCookie | null = null;
  if (intent === "link") {
    if (!sameOrigin(request)) return seeOther("/admin/settings");
    if (serverEnv.dataSource() === "api") {
      const session = await verifyOAuthSession(request, secure, nowMs);
      if (!session.ok && session.reason === "no_session") {
        const response = seeOther("/admin/login?next=%2Fadmin%2Fsettings");
        clearSessionCookies(response.cookies, secure);
        return response;
      }
      if (!session.ok) {
        return seeOther(
          withNotice(
            "/admin/settings",
            { kind: "error", provider, message: OAUTH_UNREACHABLE_MESSAGE },
            nowMs,
          ),
        );
      }
      sid = session.sid;
      renewed = session.renewed;
    }
  }

  const flow = newFlow({ provider, intent, next: params.get("next"), nowMs, sid });
  const response = seeOther(
    authorizeUrl({
      provider,
      mode: config.mode,
      clientId,
      redirectUri,
      state: flow.state,
      verifier: flow.verifier,
      nonce: flow.nonce,
    }),
  );
  setCookie(response.cookies, oauthFlowCookie({ secure, value: sealFlow(flow, oauthKey()) }));
  if (renewed) setCookie(response.cookies, renewed);
  return response;
}
