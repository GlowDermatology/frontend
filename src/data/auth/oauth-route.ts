import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { parseAllowedOrigins } from "@/lib/origins";

import { htmlPage } from "./html-page";
import {
  oauthRedirectUri,
  publicOrigin,
  sealNotice,
  type OAuthConfig,
  type OAuthNotice,
  type OAuthProvider,
} from "./oauth";
import { oauthConfig, oauthKey } from "./oauth-env";
import { isSameOriginRequest } from "./same-origin";

/** Request plumbing shared by the `/admin/auth/oauth/[provider]/*` route handlers. */

export function requestHost(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

export function sameOrigin(request: NextRequest): boolean {
  return isSameOriginRequest({
    secFetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestHost: requestHost(request),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
  });
}

/** The provider named by the route when it is enabled, with the config; otherwise `null` (404). */
export function enabledProvider(
  param: string,
): { provider: OAuthProvider; config: OAuthConfig } | null {
  const config = oauthConfig();
  const provider = config.providers.find((name) => name === param);
  return provider ? { provider, config } : null;
}

/** `redirect_uri` for this request (see `publicOrigin`): identical in start, fake and callback. */
export function redirectUriFor(
  request: NextRequest,
  provider: OAuthProvider,
  secure: boolean,
): string | null {
  const origin = publicOrigin({
    requestHost: requestHost(request),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
    secure,
  });
  return origin ? oauthRedirectUri(origin, provider) : null;
}

export function notFoundPage(): NextResponse {
  return htmlPage(
    "Topilmadi — Glow Derma Admin",
    `<h1 style="font:700 20px/1.3 Georgia,serif;margin:0 0 12px">Topilmadi</h1><p>Bu manzil mavjud emas.</p><p><a href="/admin/login">Kirish sahifasiga</a></p>`,
    { status: 404 },
  );
}

/** `path?…&oauth=<signed notice>` for the login page or the account card. */
export function withNotice(
  path: string,
  notice: Omit<OAuthNotice, "issuedAt">,
  nowMs: number,
): string {
  const token = sealNotice({ ...notice, issuedAt: nowMs }, oauthKey());
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}oauth=${encodeURIComponent(token)}`;
}
