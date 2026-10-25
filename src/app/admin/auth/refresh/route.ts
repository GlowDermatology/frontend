import { NextResponse, type NextRequest } from "next/server";

import { apiRefresh } from "@/data/api/auth";
import { isApiError } from "@/data/api/errors";
import { cookieNames } from "@/data/auth/cookie-names";
import {
  accessCookie,
  clearSessionCookies,
  refreshBackoffCookie,
  setCookie,
} from "@/data/auth/cookies";
import { isAccessLive } from "@/data/auth/jwt";
import { safeNext } from "@/data/auth/next-param";
import { classifyRefresh, type RefreshCallResult } from "@/data/auth/refresh-outcome";
import { isSameOriginRequest } from "@/data/auth/same-origin";
import { serverEnv } from "@/lib/env.server";
import { parseAllowedOrigins } from "@/lib/origins";

/**
 * `GET /admin/auth/refresh?next=` — the only place that sees the refresh
 * cookie (`Path=/admin/auth`). The proxy sends GETs here when the access
 * cookie is missing or about to expire; outcomes per the spec:
 *
 * - ok        → new access cookie, 303 to `next` (+ backoff cookie when the new
 *               token is already inside the lead time);
 * - ended     → Django 400/401 or no refresh cookie: clear cookies, 303 login;
 * - transient → 429/5xx/timeout/unusable token: with a live access cookie 303
 *               to `next` with a 30 s backoff, without one a 503 retry page;
 * - cross-site GET → a same-origin bounce page (SameSite=Strict cookies are
 *               absent on cross-site navigations, so a bounce re-sends them).
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location, ...NO_STORE } });
}

function loginUrl(next: string): string {
  return `/admin/login?next=${encodeURIComponent(next)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, body: string, init: ResponseInit): NextResponse {
  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;font:15px/1.5 system-ui,sans-serif;background:#fbf8f2;color:#2a2418}main{max-width:360px;padding:24px;text-align:center}a{color:#9a7424;font-weight:700}</style></head><body><main>${body}</main></body></html>`;
  return new NextResponse(html, {
    ...init,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE, ...init.headers },
  });
}

async function callRefresh(refresh: string): Promise<RefreshCallResult> {
  try {
    const response = await apiRefresh(refresh);
    return { status: response.status, body: response.data };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { status: error.status, body: error.body, retryAfter: error.retryAfter };
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  if (serverEnv.dataSource() === "mock") return seeOther(next);

  const sameOrigin = isSameOriginRequest({
    secFetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestHost: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
  });
  if (!sameOrigin) {
    const self = escapeHtml(url.pathname + url.search);
    return htmlPage(
      "Glow Derma Admin",
      `<meta http-equiv="refresh" content="0;url=${self}"><p>Yo‘naltirilmoqda…</p><p><a href="${self}">Davom etish</a></p>`,
      { status: 200 },
    );
  }

  const secure = serverEnv.cookieSecure();
  const names = cookieNames(secure);
  const refresh = request.cookies.get(names.refresh)?.value;
  if (!refresh) {
    const response = seeOther(loginUrl(next));
    clearSessionCookies(response.cookies, secure);
    return response;
  }

  const nowMs = Date.now();
  const outcome = classifyRefresh(await callRefresh(refresh), nowMs);

  if (outcome.kind === "ok") {
    const response = seeOther(next);
    const cookie = accessCookie({
      secure,
      token: outcome.access,
      accessExpiresAt: outcome.accessExpiresAt,
      nowMs,
    });
    // `classifyRefresh` already rejected unusable tokens, so `cookie` is set.
    if (cookie) setCookie(response.cookies, cookie);
    if (outcome.nearExpiry) setCookie(response.cookies, refreshBackoffCookie({ secure }));
    return response;
  }

  if (outcome.kind === "ended") {
    const response = seeOther(loginUrl(next));
    clearSessionCookies(response.cookies, secure);
    return response;
  }

  // transient
  if (isAccessLive(request.cookies.get(names.access)?.value, nowMs)) {
    const response = seeOther(next);
    setCookie(response.cookies, refreshBackoffCookie({ secure }));
    return response;
  }
  const retryAfter = outcome.retryAfter ?? 5;
  const self = escapeHtml(url.pathname + url.search);
  return htmlPage(
    "Glow Derma Admin — qayta urinib ko‘ring",
    `<h1 style="font:700 20px/1.3 Georgia,serif;margin:0 0 12px">Sessiyani yangilab bo‘lmadi</h1><p>API vaqtincha javob bermadi. ${retryAfter} soniyadan so‘ng qayta urinib ko‘ring.</p><p><a href="${self}">Qayta urinish</a> · <a href="${escapeHtml(loginUrl(next))}">Qayta kirish</a></p>`,
    { status: 503, headers: { "Retry-After": String(retryAfter) } },
  );
}
