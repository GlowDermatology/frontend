/**
 * Validation of the `next` parameter carried by `/admin/login?next=` and
 * `/admin/auth/refresh?next=`. Only a relative path inside the admin panel is
 * accepted, so a crafted link can never bounce a staff member off-site.
 */

import type { Route } from "next";

/** Typed as a `Route`: every value `safeNext` returns is a validated in-panel path. */
export const DEFAULT_NEXT: Route = "/admin";

const MAX_LENGTH = 2048;
/** `.`, `..` and their percent-encoded spellings, which URL parsers normalise. */
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

function isAdminPath(path: string): boolean {
  if (path === "/admin") return true;
  if (!path.startsWith("/admin/")) return false;
  // A loop guard: landing on the login or auth routes after login makes no sense.
  return !(path === "/admin/login" || path.startsWith("/admin/auth/") || path === "/admin/auth");
}

/**
 * Returns `value` when it is a safe in-panel path, otherwise `/admin`.
 * Rejected: non-strings, anything not starting with `/admin` (so `/adminx`,
 * `//evil`, `https://…`, `\\evil`), control characters, backslashes, dot
 * segments (`/admin/../x`) and over-long values. A fragment is dropped.
 */
export function safeNext(value: unknown): Route {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return DEFAULT_NEXT;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return DEFAULT_NEXT;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;

  const withoutFragment = raw.split("#")[0] ?? "";
  const queryStart = withoutFragment.indexOf("?");
  const path = queryStart === -1 ? withoutFragment : withoutFragment.slice(0, queryStart);
  if (!isAdminPath(path)) return DEFAULT_NEXT;
  if (path.split("/").some((segment) => DOT_SEGMENT.test(segment))) return DEFAULT_NEXT;
  return withoutFragment as Route;
}
