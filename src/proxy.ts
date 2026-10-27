import { NextResponse, type NextRequest } from "next/server";

import { cookieNames } from "@/data/auth/cookie-names";
import { csrfCookie, setCookie } from "@/data/auth/cookies";
import { mintCsrf } from "@/data/auth/csrf";
import { NEXT_PATH_HEADER, decideProxy } from "@/data/auth/proxy-decision";
import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import {
  customerCsrfCookie,
  deviceIdCookie,
  isValidDeviceId,
  mintDeviceId,
} from "@/data/customer-auth/cookies";
import { lookupSlug } from "@/data/customer-auth/legacy-redirect";
import { slugExists } from "@/data/customer-auth/slug-exists";
import { decideShopProxy } from "@/data/customer-auth/proxy-decision";
import { shopPath } from "@/features/shop/routing/routes";

/**
 * One proxy, two audiences.
 *
 * **Admin** (`/admin/**`, unchanged; spec "Frontend wiring › Auth ›
 * src/proxy.ts"). GET/HEAD only: in api mode a missing or near-expiry access
 * cookie is sent to the refresh route (307, `next` = path + query) unless the
 * backoff marker is set; the refresh cookie never reaches the proxy
 * (`Path=/admin/auth`), so it cannot refresh itself. In both modes it mints
 * the readable `gd_csrf` cookie when missing and stamps `x-gd-next` for
 * `requireStaff()`. Server Actions (POST) pass through: every action
 * verifies the session itself.
 *
 * **Storefront** (everything else that is a page; `decideShopProxy`):
 * legacy numeric id URLs get a 301 to the slug (api mode), private pages get
 * the device id and csrf cookies and a bounce to the customer refresh route
 * when their access cookie lapsed. Public pages pass through untouched for
 * anonymous visitors.
 *
 * The env is read directly (not through `serverEnv`): the decisions must
 * stay free of the `server-only` marker and of lazy throws.
 */

/** The route that answers an unknown storefront slug with the localized 404 (U3). */
const NOT_FOUND_PATH = "/gd-not-found";

function cookieSecure(): boolean {
  const value = process.env.GLOWDERMA_COOKIE_SECURE;
  if (value === undefined || value === "") return process.env.NODE_ENV === "production";
  return value === "true" || value === "1";
}

function mode(): "api" | "mock" {
  return process.env.GLOWDERMA_DATA_SOURCE === "api" ? "api" : "mock";
}

function adminProxy(request: NextRequest, secure: boolean): NextResponse {
  const names = cookieNames(secure);
  const { pathname, search } = request.nextUrl;

  const decision = decideProxy({
    method: request.method,
    pathname,
    search,
    mode: mode(),
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

async function shopProxy(request: NextRequest, secure: boolean): Promise<NextResponse> {
  const names = customerCookieNames(secure);
  const { pathname, search } = request.nextUrl;
  const decision = decideShopProxy({
    method: request.method,
    pathname,
    search,
    mode: mode(),
    accessToken: request.cookies.get(names.access)?.value,
    hasRefresh: request.cookies.has(names.refresh),
    hasBackoff: request.cookies.has(names.refreshBackoff),
    hasCsrf: request.cookies.has(names.csrf),
    hasDeviceId: isValidDeviceId(request.cookies.get(names.deviceId)?.value),
    nowMs: Date.now(),
  });

  if (decision.kind === "legacy-id") {
    const slug = await lookupSlug(decision.entity, decision.id, decision.locale);
    if (slug) {
      const target = new URL(
        shopPath(decision.locale, { kind: decision.entity, slug }) + search,
        request.nextUrl,
      );
      const response = NextResponse.redirect(target, 301);
      response.headers.set("Cache-Control", "public, max-age=3600");
      return response;
    }
    return NextResponse.next();
  }

  if (decision.kind === "check-slug") {
    let response: NextResponse;
    if ((await slugExists(decision.entity, decision.slug)) === false) {
      // A real 404 (the streamed page could only render a 200 "not found").
      const target = new URL(
        decision.locale === "uz" ? NOT_FOUND_PATH : `/${decision.locale}${NOT_FOUND_PATH}`,
        request.nextUrl,
      );
      response = NextResponse.rewrite(target, { status: 404 });
    } else {
      response = NextResponse.next();
    }
    if (decision.mintCsrf) {
      setCookie(response.cookies, customerCsrfCookie({ secure, value: mintCsrf() }));
    }
    return response;
  }

  let response: NextResponse;
  if (decision.kind === "refresh") {
    response = NextResponse.redirect(new URL(decision.location, request.nextUrl), 307);
    response.headers.set("Cache-Control", "no-store");
  } else {
    response = NextResponse.next();
  }
  if (decision.mintDeviceId) {
    setCookie(response.cookies, deviceIdCookie({ secure, value: mintDeviceId() }));
  }
  if (decision.mintCsrf) {
    setCookie(response.cookies, customerCsrfCookie({ secure, value: mintCsrf() }));
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const secure = cookieSecure();
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminProxy(request, secure);
  return shopProxy(request, secure);
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Storefront pages: not Next internals, route handlers, metadata files or
    // anything with a file extension.
    "/((?!_next/|api/|og/|sitemaps/|healthz|admin|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
