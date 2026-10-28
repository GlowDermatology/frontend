import type { NextRequest } from "next/server";

import { setCookie } from "@/data/auth/cookies";
import { escapeHtml, htmlPage, sameOriginBounce, seeOther } from "@/data/auth/html-page";
import { isAccessLive } from "@/data/auth/jwt";
import { isSameOriginRequest } from "@/data/auth/same-origin";
import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import {
  clearCustomerSession,
  customerRefreshBackoffCookie,
  isValidDeviceId,
  sessionCookies,
} from "@/data/customer-auth/cookies";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { refreshCustomerSession } from "@/data/customer-auth/refresh-service";
import { parseShopPath, shopHref } from "@/features/shop/routing/routes";
import { serverEnv } from "@/lib/env.server";
import { parseAllowedOrigins } from "@/lib/origins";

/**
 * `GET /api/shop/auth/refresh?next=` — rotates the customer session
 * (contract §2.1.6) through the single-flight coordinator and returns to
 * `next`. The proxy sends private-page GETs here when the access cookie is
 * missing or about to lapse; the storefront's `runAction` calls it (fetch,
 * `redirect: "manual"`) when a Server Action answers `session_expired`.
 *
 * - ok        → new access, refresh and hint cookies, 303 `next`;
 * - ended     → cookies cleared, 303 to the sign-in page with `next`;
 * - transient → with a live access cookie 303 `next` plus a 30 s backoff,
 *               without one a 503 retry page;
 * - cross-site request → a tiny same-origin page that reloads this URL
 *               (`sameOriginBounce`): a link from elsewhere must not rotate
 *               tokens, and a 303 straight back to `next` would loop — a
 *               visitor returning from Click/Payme with a lapsed access cookie
 *               is bounced here by the proxy again (ERR_TOO_MANY_REDIRECTS).
 *               The reload is same-origin, so it then refreshes normally.
 *
 * `POST` does the same (a Server Action render that redirects here is
 * replayed with its method; answering 405 broke it): the 303 turns it into a
 * GET of `next`.
 */

const RETRY_COPY = {
  uz: [
    "Sessiyani yangilab bo‘lmadi",
    "Server vaqtincha javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.",
    "Qayta urinish",
  ],
  ru: [
    "Не удалось обновить сессию",
    "Сервер временно не ответил. Попробуйте ещё раз чуть позже.",
    "Повторить",
  ],
  en: [
    "Could not refresh your session",
    "The server did not answer. Please try again in a moment.",
    "Try again",
  ],
} as const;

export function POST(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawNext = url.searchParams.get("next");
  const locale = parseShopPath((rawNext ?? "/").split("?")[0] ?? "/")?.locale ?? "uz";
  const next = safeShopNext(rawNext, locale);
  if (serverEnv.dataSource() === "mock") return seeOther(next);

  const sameOrigin = isSameOriginRequest({
    secFetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestHost: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
  });
  if (!sameOrigin) return sameOriginBounce(url.pathname + url.search, "Glow Derma");

  const secure = serverEnv.cookieSecure();
  const names = customerCookieNames(secure);
  const signIn = shopHref(locale, { kind: "signIn" }, { next });
  const refresh = request.cookies.get(names.refresh)?.value;
  if (!refresh) {
    const response = seeOther(signIn);
    clearCustomerSession(response.cookies, secure);
    return response;
  }

  const deviceId = request.cookies.get(names.deviceId)?.value;
  const nowMs = Date.now();
  const outcome = await refreshCustomerSession({
    refresh,
    device: isValidDeviceId(deviceId) ? { id: deviceId } : undefined,
    locale,
    requestHeaders: request.headers,
  });

  if (outcome.kind === "ok") {
    const cookies = sessionCookies({ secure, ...outcome.tokens, nowMs });
    if (cookies) {
      const response = seeOther(next);
      for (const cookie of cookies) setCookie(response.cookies, cookie);
      return response;
    }
  }

  if (outcome.kind === "ended") {
    const response = seeOther(signIn);
    clearCustomerSession(response.cookies, secure);
    return response;
  }

  // transient (or an ok answer whose cookies were unusable)
  if (isAccessLive(request.cookies.get(names.access)?.value, nowMs)) {
    const response = seeOther(next);
    setCookie(response.cookies, customerRefreshBackoffCookie({ secure }));
    return response;
  }
  const retryAfter = outcome.kind === "transient" ? (outcome.retryAfter ?? 5) : 5;
  const [title, body, retry] = RETRY_COPY[locale];
  const self = escapeHtml(url.pathname + url.search);
  return htmlPage(
    `Glow Derma — ${title}`,
    `<h1 style="font:600 22px/1.3 Georgia,serif;margin:0 0 12px">${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="${self}">${escapeHtml(retry)}</a></p>`,
    { status: 503, headers: { "Retry-After": String(retryAfter) } },
  );
}
