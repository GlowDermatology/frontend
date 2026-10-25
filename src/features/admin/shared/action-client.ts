import type { ActionResult } from "@/data/types";

import { readCsrfCookie } from "./csrf";

/**
 * Runs a Server Action from a client component (spec "Frontend wiring › Auth
 * › Refresh flow"). It supplies the `gd_csrf` cookie and, when the action
 * answers `code: "session_expired"`, calls the refresh route once — a
 * same-origin `fetch` to `/admin/auth/refresh` (the browser adds
 * `Sec-Fetch-Site: same-origin` itself; `Sec-*` are forbidden request header
 * names and cannot be set by scripts) with `redirect: "manual"`, so the 303
 * back to `next` is not followed and only the cookie side effect matters —
 * and retries the action once. If the session is still expired the browser
 * goes to the login page with the current location as `next`.
 *
 * `idempotency key` reuse across the retry is the caller's job: pass the same
 * key inside `invoke` (see `useIdempotencyKey`).
 */

export interface ActionClientEnv {
  fetch: typeof fetch;
  location: Pick<Location, "pathname" | "search" | "assign">;
  csrf: () => string;
}

function defaultEnv(): ActionClientEnv {
  return {
    fetch: (input, init) => fetch(input, init),
    location: window.location,
    csrf: () => readCsrfCookie(),
  };
}

export function currentPath(location: Pick<Location, "pathname" | "search">): string {
  return `${location.pathname}${location.search}`;
}

export async function refreshSession(env: ActionClientEnv): Promise<boolean> {
  const next = encodeURIComponent(currentPath(env.location));
  try {
    const response = await env.fetch(`/admin/auth/refresh?next=${next}`, {
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

export async function runAction<T>(
  invoke: (csrf: string) => Promise<ActionResult<T>>,
  env: ActionClientEnv = defaultEnv(),
): Promise<ActionResult<T>> {
  const first = await invoke(env.csrf());
  if (first.ok || first.code !== "session_expired") return first;

  const refreshed = await refreshSession(env);
  const second = refreshed ? await invoke(env.csrf()) : first;
  if (second.ok || second.code !== "session_expired") return second;

  env.location.assign(`/admin/login?next=${encodeURIComponent(currentPath(env.location))}`);
  return second;
}
