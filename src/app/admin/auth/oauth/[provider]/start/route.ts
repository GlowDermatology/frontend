import type { NextRequest } from "next/server";

import { cookieNames } from "@/data/auth/cookie-names";
import { oauthFlowCookie, setCookie } from "@/data/auth/cookies";
import { seeOther } from "@/data/auth/html-page";
import { authorizeUrl, newFlow, sealFlow, type OAuthIntent } from "@/data/auth/oauth";
import { oauthKey } from "@/data/auth/oauth-env";
import { enabledProvider, notFoundPage, redirectUriFor, sameOrigin } from "@/data/auth/oauth-route";
import { serverEnv } from "@/lib/env.server";

/**
 * `GET /admin/auth/oauth/{provider}/start?intent=login|link&next=` (contract
 * §2.1, M0b). Creates the flow (state, PKCE verifier, nonce), seals it into
 * the HttpOnly `gd_oauth` cookie (`Path=/admin/auth`, `SameSite=Lax`, 10 min)
 * and redirects to the provider's authorize URL — the built-in fake page when
 * `GLOWDERMA_OAUTH_MODE=fake`. A provider that is not enabled is a 404.
 *
 * `intent=link` (the account card) needs a signed-in session and a
 * same-origin request: a link started from another site, or after the
 * session ended, goes back to the settings page or the login page without
 * touching the provider. `next` is honoured for a login only and validated
 * like the login page's (`safeNext`).
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

  if (intent === "link") {
    if (!sameOrigin(request)) return seeOther("/admin/settings");
    if (serverEnv.dataSource() === "api") {
      const names = cookieNames(secure);
      const signedIn = request.cookies.has(names.access) || request.cookies.has(names.refresh);
      if (!signedIn) return seeOther("/admin/login?next=%2Fadmin%2Fsettings");
    }
  }

  const redirectUri = redirectUriFor(request, provider, secure);
  const clientId = config.clientIds[provider];
  if (!redirectUri || !clientId) return notFoundPage();

  const flow = newFlow({ provider, intent, next: params.get("next"), nowMs: Date.now() });
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
  return response;
}
