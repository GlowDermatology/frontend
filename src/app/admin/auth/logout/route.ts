import { NextResponse, type NextRequest } from "next/server";

import { apiLogout, isLogoutScope, type LogoutScope } from "@/data/api/auth";
import { isApiError } from "@/data/api/errors";
import { cookieNames } from "@/data/auth/cookie-names";
import { clearSessionCookies } from "@/data/auth/cookies";
import { csrfMatches } from "@/data/auth/csrf";
import { serverEnv } from "@/lib/env.server";

/**
 * `POST /admin/auth/logout` (contract §2.1 `auth/logout/`). CSRF-checked with
 * the double-submit token (`X-CSRF-Token` header or `csrf` form field).
 * `scope` ∈ current | others | all (default current). Whatever Django answers
 * — 204, or 401 `SESSION_EXPIRED` for an already-dead session — the browser
 * is logged out: for `current`/`all` the cookies are cleared and the user goes
 * to the login page; `others` keeps this session and returns to settings.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location, ...NO_STORE } });
}

interface LogoutInput {
  scope: string | undefined;
  csrf: string | undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function readInput(request: NextRequest): Promise<LogoutInput> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as unknown;
      const record =
        typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      return { scope: asString(record.scope), csrf: asString(record.csrf) };
    }
    if (contentType.includes("form")) {
      const form = await request.formData();
      return { scope: asString(form.get("scope")), csrf: asString(form.get("csrf")) };
    }
  } catch {
    // Malformed body: fall through to the defaults (csrf still has to match).
  }
  return { scope: undefined, csrf: undefined };
}

export async function POST(request: NextRequest) {
  const secure = serverEnv.cookieSecure();
  const names = cookieNames(secure);
  const input = await readInput(request);

  const presented = request.headers.get("x-csrf-token") ?? input.csrf;
  if (!csrfMatches(request.cookies.get(names.csrf)?.value, presented)) {
    return NextResponse.json(
      { code: "csrf_mismatch", message: "Sahifani yangilab, qayta urinib ko‘ring.", errors: [] },
      { status: 403, headers: NO_STORE },
    );
  }

  let scope: LogoutScope = "current";
  if (input.scope !== undefined && input.scope !== "") {
    if (!isLogoutScope(input.scope)) {
      return NextResponse.json(
        {
          code: "validation_error",
          message: "Maydonlarni tekshiring.",
          errors: [{ field: "scope", code: "invalid_choice", message: "Ruxsat etilmagan qiymat." }],
        },
        { status: 400, headers: NO_STORE },
      );
    }
    scope = input.scope;
  }

  const refresh = request.cookies.get(names.refresh)?.value;
  if (serverEnv.dataSource() === "api" && refresh) {
    try {
      await apiLogout(refresh, scope);
    } catch (error) {
      // 401 SESSION_EXPIRED (already revoked) and transient failures alike:
      // the browser side of the session ends regardless.
      if (!isApiError(error)) throw error;
    }
  }

  if (scope === "others") return seeOther("/admin/settings");
  const response = seeOther("/admin/login");
  clearSessionCookies(response.cookies, secure);
  return response;
}
