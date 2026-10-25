import { REFRESH_LEAD_SECONDS, isAccessLive } from "./jwt";
import { safeNext } from "./next-param";

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
  { kind: "pass"; mintCsrf: boolean } | { kind: "refresh"; next: string; mintCsrf: boolean };

function isAuthRoute(pathname: string): boolean {
  return pathname === "/admin/auth" || pathname.startsWith("/admin/auth/");
}

export function decideProxy(input: ProxyInput): ProxyDecision {
  if (input.method !== "GET" && input.method !== "HEAD") return { kind: "pass", mintCsrf: false };
  if (isAuthRoute(input.pathname)) return { kind: "pass", mintCsrf: false };

  const mintCsrf = !input.hasCsrf;
  if (input.pathname === "/admin/login") return { kind: "pass", mintCsrf };
  if (input.mode !== "api") return { kind: "pass", mintCsrf };

  const live = isAccessLive(input.accessToken, input.nowMs, REFRESH_LEAD_SECONDS);
  if (!live && !input.hasBackoff) {
    return { kind: "refresh", next: safeNext(input.pathname + input.search), mintCsrf };
  }
  return { kind: "pass", mintCsrf };
}
