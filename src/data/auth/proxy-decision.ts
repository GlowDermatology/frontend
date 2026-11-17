import { REFRESH_LEAD_SECONDS, isAccessLive } from "./jwt";
import { MFA_STEP_PATH } from "./mfa-challenge";
import { safeNext } from "./next-param";
import { SET_PASSWORD_PATH, tokenFromSearch } from "./password-token";

/**
 * Pure decision behind `src/proxy.ts` (no Next imports, unit-tested per
 * branch). The proxy only decides between letting the request through and
 * bouncing a GET to the refresh route; it never calls Django itself because
 * the refresh cookie (`Path=/admin/auth`) does not reach it.
 */

/**
 * Request header the proxy stamps with the current `path?query` so
 * `requireStaff()` can build `/admin/login?next=…` without a per-page prop.
 * The proxy overwrites it on every request it handles, so a client cannot
 * inject it; the value is validated with `safeNext` anyway.
 */
export const NEXT_PATH_HEADER = "x-gd-next";

export interface ProxyInput {
  method: string;
  pathname: string;
  /** `?a=b` or an empty string. */
  search: string;
  mode: "mock" | "api";
  accessToken: string | undefined;
  hasBackoff: boolean;
  hasCsrf: boolean;
  nowMs: number;
}

export type ProxyDecision =
  | {
      kind: "pass";
      mintCsrf: boolean;
      /** The public set-password and MFA step pages: `Referrer-Policy: no-referrer` on their answer. */
      noReferrer?: true;
    }
  | { kind: "refresh"; next: string; mintCsrf: boolean }
  /**
   * `/admin/set-password?token=…` (the e-mailed link, DESIGN §E): store the token in its
   * HttpOnly cookie (`""` = a malformed token: clear it) and 303 to the bare page, so the token
   * leaves the address bar and the history.
   */
  | { kind: "stash-token"; token: string; location: string; mintCsrf: boolean };

function isAuthRoute(pathname: string): boolean {
  return pathname === "/admin/auth" || pathname.startsWith("/admin/auth/");
}

export function decideProxy(input: ProxyInput): ProxyDecision {
  if (input.method !== "GET" && input.method !== "HEAD") return { kind: "pass", mintCsrf: false };
  if (isAuthRoute(input.pathname)) return { kind: "pass", mintCsrf: false };

  const mintCsrf = !input.hasCsrf;
  if (input.pathname === "/admin/login") return { kind: "pass", mintCsrf };
  // Public (no session): the e-mailed link. Never bounced to the refresh route.
  if (input.pathname === SET_PASSWORD_PATH) {
    const token = tokenFromSearch(input.search);
    if (token !== null) {
      return { kind: "stash-token", token, location: SET_PASSWORD_PATH, mintCsrf };
    }
    return { kind: "pass", mintCsrf, noReferrer: true };
  }
  // Public (no session yet): the sign-in's second step (DESIGN §E). Its challenge is in a cookie
  // scoped to the page; bouncing it to the refresh route would only end at the login page.
  if (input.pathname === MFA_STEP_PATH) return { kind: "pass", mintCsrf, noReferrer: true };
  if (input.mode !== "api") return { kind: "pass", mintCsrf };

  const live = isAccessLive(input.accessToken, input.nowMs, REFRESH_LEAD_SECONDS);
  if (!live && !input.hasBackoff) {
    return { kind: "refresh", next: safeNext(input.pathname + input.search), mintCsrf };
  }
  return { kind: "pass", mintCsrf };
}
