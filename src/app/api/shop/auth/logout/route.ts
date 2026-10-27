import { NextResponse, type NextRequest } from "next/server";

import { apiCustomerLogout } from "@/data/api/customer/auth";
import { isApiError } from "@/data/api/errors";
import { csrfMatches } from "@/data/auth/csrf";
import { seeOther } from "@/data/auth/html-page";
import { isSameOriginRequest } from "@/data/auth/same-origin";
import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import { clearCustomerSession, isValidDeviceId } from "@/data/customer-auth/cookies";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { forgetCustomerRefresh } from "@/data/customer-auth/refresh-service";
import { parseShopPath } from "@/features/shop/routing/routes";
import { serverEnv } from "@/lib/env.server";
import { parseAllowedOrigins } from "@/lib/origins";

/**
 * `POST /api/shop/auth/logout` (contract §2.1.7). Both CSRF defences are
 * required: a same-origin request (fetch metadata, then Origin/Referer
 * against the host and `GLOWDERMA_ALLOWED_ORIGINS`) and the double-submit
 * token (`X-CSRF-Token` header or `csrf` form field) matching
 * `gd_cust_csrf`. `scope` = `current` (default) or `all` («Hamma joydan
 * chiqish» of the «Faol seanslar» page, B-W1). Whatever the API answers
 * — 204, or 401 for an already-dead session, or a transport failure — the
 * browser is signed out: the session cookies are cleared (the device id and
 * key stay) and the response is a 303 to `next` (default: the home page of
 * the language the customer came from).
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function rejected(): NextResponse {
  return NextResponse.json(
    { code: "csrf_mismatch", message: "Sahifani yangilab, qayta urinib ko‘ring.", errors: [] },
    { status: 403, headers: NO_STORE },
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function readInput(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as unknown;
      const record =
        typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      return {
        scope: asString(record.scope),
        csrf: asString(record.csrf),
        next: asString(record.next),
      };
    }
    if (contentType.includes("form")) {
      const form = await request.formData();
      return {
        scope: asString(form.get("scope")),
        csrf: asString(form.get("csrf")),
        next: asString(form.get("next")),
      };
    }
  } catch {
    // Malformed body: defaults below; the csrf check still has to pass.
  }
  return { scope: undefined, csrf: undefined, next: undefined };
}

export async function POST(request: NextRequest) {
  const secure = serverEnv.cookieSecure();
  const names = customerCookieNames(secure);
  const sameOrigin = isSameOriginRequest({
    secFetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestHost: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
  });
  if (!sameOrigin) return rejected();

  const input = await readInput(request);
  const presented = request.headers.get("x-csrf-token") ?? input.csrf;
  if (!csrfMatches(request.cookies.get(names.csrf)?.value, presented)) return rejected();

  const scope = input.scope === "all" ? "all" : input.scope === "current" ? "current" : undefined;
  if (input.scope !== undefined && input.scope !== "" && scope === undefined) {
    return NextResponse.json(
      {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "scope", code: "invalid_choice", message: "Ruxsat etilmagan qiymat." }],
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const nextPath = (input.next ?? "/").split("?")[0] ?? "/";
  const locale = parseShopPath(nextPath)?.locale ?? "uz";
  const refresh = request.cookies.get(names.refresh)?.value;
  if (serverEnv.dataSource() === "api" && refresh) {
    const deviceId = request.cookies.get(names.deviceId)?.value;
    try {
      await apiCustomerLogout({
        refresh,
        scope: scope === "all" ? "all" : undefined,
        accessToken: request.cookies.get(names.access)?.value,
        device: isValidDeviceId(deviceId) ? { id: deviceId } : undefined,
        locale,
        requestHeaders: request.headers,
      });
    } catch (error) {
      // The browser side of the session ends regardless (401 = already gone).
      if (!isApiError(error)) throw error;
    }
    forgetCustomerRefresh(refresh);
  }

  const response = seeOther(safeShopNext(input.next, locale));
  clearCustomerSession(response.cookies, secure);
  return response;
}
