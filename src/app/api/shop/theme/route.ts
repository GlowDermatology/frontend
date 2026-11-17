import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/data/auth/same-origin";
import { serverEnv } from "@/lib/env.server";
import { parseAllowedOrigins } from "@/lib/origins";
import { knownThemeChoice, themeCookie } from "@/lib/theme/theme-cookie";

/**
 * `POST /api/shop/theme` `{ "theme": "light" | "dark" | "system" }`: re-issues the `gd_theme`
 * cookie that `setThemeChoice()` has already written from script, as a server `Set-Cookie`
 * (Safari keeps script-written cookies for seven days only); `system` deletes it. Called from the
 * storefront and the admin panel alike (one origin, `/api/shop/*` stays with Next at the edge).
 * Same-origin only (fetch metadata, then Origin/Referer); no session or CSRF token is involved,
 * since the cookie is a display preference that the page itself can write.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  const sameOrigin = isSameOriginRequest({
    secFetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestHost: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
  });
  if (!sameOrigin) {
    return NextResponse.json(
      { code: "forbidden", message: "Cross-site request.", errors: [] },
      { status: 403, headers: NO_STORE },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Malformed body: answered below.
  }
  const choice = knownThemeChoice(
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).theme : undefined,
  );
  if (!choice) {
    return NextResponse.json(
      {
        code: "validation_error",
        message: "Invalid theme.",
        errors: [{ field: "theme", code: "invalid_choice", message: "light, dark or system." }],
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const response = new NextResponse(null, { status: 204, headers: NO_STORE });
  const cookie = themeCookie(choice, serverEnv.cookieSecure());
  response.cookies.set(cookie.name, cookie.value, cookie.attributes);
  return response;
}
