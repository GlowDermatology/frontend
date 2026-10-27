import type { ActionResult } from "@/data/types";
import {
  currentPath,
  refreshSessionAt,
  runActionWith,
  type ActionClientConfig,
  type ActionClientEnv,
} from "@/lib/actions/action-client";

import { readCsrfCookie } from "./csrf";

/**
 * Admin binding of the shared Server Action plumbing
 * (`src/lib/actions/action-client.ts`): the `gd_csrf` cookie, the
 * `/admin/auth/refresh` route and `/admin/login?next=…` (spec "Frontend
 * wiring › Auth › Refresh flow"). Behaviour is unchanged from before the
 * storefront shared it.
 */

export type { ActionClientEnv };
export { currentPath };

export const NETWORK_ERROR_MESSAGE = "API bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.";

const ADMIN_ACTIONS: ActionClientConfig = {
  refreshPath: "/admin/auth/refresh",
  signInUrl: (next) => `/admin/login?next=${encodeURIComponent(next)}`,
  networkErrorMessage: NETWORK_ERROR_MESSAGE,
};

/** The real browser environment (`fetch`, `location`, the `gd_csrf` cookie). */
export function browserActionEnv(): ActionClientEnv {
  return {
    fetch: (input, init) => fetch(input, init),
    location: window.location,
    csrf: () => readCsrfCookie(),
  };
}

export function refreshSession(env: ActionClientEnv): Promise<boolean> {
  return refreshSessionAt(ADMIN_ACTIONS.refreshPath, env);
}

export function runAction<T>(
  invoke: (csrf: string) => Promise<ActionResult<T>>,
  env: ActionClientEnv = browserActionEnv(),
): Promise<ActionResult<T>> {
  return runActionWith(ADMIN_ACTIONS, invoke, env);
}
