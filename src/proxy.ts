import { NextResponse, type NextRequest } from "next/server";

import { cookieNames } from "@/data/auth/cookie-names";
import { csrfCookie, setCookie } from "@/data/auth/cookies";
import { mintCsrf } from "@/data/auth/csrf";
import { NEXT_PATH_HEADER, decideProxy } from "@/data/auth/proxy-decision";

/**
 * Admin proxy (spec "Frontend wiring › Auth › src/proxy.ts"). GET/HEAD only:
 * in api mode a missing or near-expiry access cookie is sent to the refresh
 * route (307, `next` = path + query) unless the backoff marker is set; the
 * refresh cookie never reaches the proxy (`Path=/admin/auth`), so it cannot
 * refresh itself. In both modes it mints the readable `gd_csrf` cookie when
 * missing and stamps `x-gd-next` for `requireStaff()`. Server Actions
 * (POST) pass through: every action verifies the session itself.
 *
 * The env is read directly (not through `serverEnv`): the decision must stay
 * free of the `server-only` marker and of lazy throws, and the two rules are
 * tiny. `GLOWDERMA_COOKIE_SECURE` mirrors `serverEnv.cookieSecure()`.
 */

function cookieSecure(): boolean {
  const value = process.env.GLOWDERMA_COOKIE_SECURE;
  if (value === undefined || value === "") return process.env.NODE_ENV === "production";
  return value === "true" || value === "1";
}

export function proxy(request: NextRequest) {
  const secure = cookieSecure();
  const names = cookieNames(secure);
  const { pathname, search } = request.nextUrl;

  const decision = decideProxy({
    method: request.method,
    pathname,
    search,
    mode: process.env.GLOWDERMA_DATA_SOURCE === "api" ? "api" : "mock",
    accessToken: request.cookies.get(names.access)?.value,
    hasBackoff: request.cookies.has(names.refreshBackoff),
    hasCsrf: request.cookies.has(names.csrf),
    nowMs: Date.now(),
  });

  let response: NextResponse;
  if (decision.kind === "refresh") {
    // `NextResponse.redirect` needs an absolute URL, so the path is resolved
    // against `request.nextUrl`. Next relativises a Location that shares that
    // origin before sending it, so the browser follows a same-origin
    // redirect whatever host or scheme the edge presented (X-Forwarded-Host
    // only matters for the same-origin checks in the route handlers).
    const location = new URL(
      `/admin/auth/refresh?next=${encodeURIComponent(decision.next)}`,
      request.nextUrl,
    );
    response = NextResponse.redirect(location, 307);
    response.headers.set("Cache-Control", "no-store");
  } else {
    const requestHeaders = new Headers(request.headers);
    // Always overwritten, so a client-supplied value never reaches the DAL.
    requestHeaders.set(NEXT_PATH_HEADER, pathname + search);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (decision.mintCsrf) setCookie(response.cookies, csrfCookie({ secure, value: mintCsrf() }));
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
