import type { ActionResult } from "@/data/types";

/**
 * Client plumbing for Server Actions, shared by the admin panel and the
 * storefront (each binds its own refresh route, sign-in page and csrf
 * cookie: `features/admin/shared/action-client.ts`,
 * `features/shop/shared/action-client.ts`).
 *
 * `runAction` supplies the double-submit csrf cookie and, when the action
 * answers `code: "session_expired"`, calls the refresh route once — a
 * same-origin `fetch` (the browser adds `Sec-Fetch-Site: same-origin` itself;
 * `Sec-*` are forbidden request header names and cannot be set by scripts)
 * with `redirect: "manual"`, so the 303 back to `next` is not followed and
 * only the cookie side effect matters — and retries the action once. If the
 * session is still expired the browser goes to the sign-in page with the
 * current location as `next`.
 *
 * Idempotency key reuse across the retry is the caller's job: pass the same
 * key inside `invoke` (see `useIdempotencyKey`).
 *
 * A Server Action call can also reject: a dropped connection, Next's own
 * "Invalid Server Actions request" (Origin/`allowedOrigins` mismatch, stale
 * action id after a deploy) or an exception inside the action. The call
 * sites await `runAction` inside a transition without a try/catch, so such a
 * rejection is turned into a plain `ActionResult` failure here (the toast
 * shows it and the kept idempotency key gets its replay) instead of escaping
 * to the route's error boundary.
 */

export interface ActionClientEnv {
  fetch: typeof fetch;
  location: Pick<Location, "pathname" | "search" | "assign">;
  csrf: () => string;
}

/** Where one audience's session plumbing lives. */
export interface ActionClientConfig {
  /** Route handler that rotates the session, e.g. `/admin/auth/refresh`; `?next=` is appended. */
  refreshPath: string;
  /** Sign-in page for the current location, given the encoded-ready `next` path. */
  signInUrl: (next: string) => string;
  /** Message of the synthetic `network_error` failure. */
  networkErrorMessage: string;
}

export function currentPath(location: Pick<Location, "pathname" | "search">): string {
  return `${location.pathname}${location.search}`;
}

/** Reads one cookie out of `document.cookie` (or a given cookie string); `""` when absent. */
export function readCookie(name: string, cookieString: string | undefined): string {
  if (!cookieString) return "";
  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return safeDecode(trimmed.slice(name.length + 1));
  }
  return "";
}

export function documentCookie(): string | undefined {
  return typeof document === "undefined" ? undefined : document.cookie;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function refreshSessionAt(
  refreshPath: string,
  env: ActionClientEnv,
): Promise<boolean> {
  const next = encodeURIComponent(currentPath(env.location));
  try {
    const response = await env.fetch(`${refreshPath}?next=${next}`, {
      method: "GET",
      credentials: "same-origin",
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    // `redirect: "manual"` yields an opaque-redirect (status 0) for the 303s
    // (both "ok" and "ended" look alike); only a 5xx retry page is a hard no.
    return response.type === "opaqueredirect" || response.status < 500;
  } catch {
    return false;
  }
}

async function invokeSafely<T>(
  invoke: (csrf: string) => Promise<ActionResult<T>>,
  csrf: string,
  networkErrorMessage: string,
): Promise<ActionResult<T>> {
  try {
    return await invoke(csrf);
  } catch (cause) {
    if (process.env.NODE_ENV !== "production") console.error("[action] call failed", cause);
    return { ok: false, error: networkErrorMessage, code: "network_error" };
  }
}

export async function runActionWith<T>(
  config: ActionClientConfig,
  invoke: (csrf: string) => Promise<ActionResult<T>>,
  env: ActionClientEnv,
): Promise<ActionResult<T>> {
  const first = await invokeSafely(invoke, env.csrf(), config.networkErrorMessage);
  if (first.ok || first.code !== "session_expired") return first;

  const refreshed = await refreshSessionAt(config.refreshPath, env);
  const second = refreshed
    ? await invokeSafely(invoke, env.csrf(), config.networkErrorMessage)
    : first;
  if (second.ok || second.code !== "session_expired") return second;

  env.location.assign(config.signInUrl(currentPath(env.location)));
  return second;
}
