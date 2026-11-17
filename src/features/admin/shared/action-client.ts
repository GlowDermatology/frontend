import type { ActionResult } from "@/data/types";
import { knownAdminLocale } from "@/lib/i18n/admin-locale-cookie";
import type { Locale } from "@/lib/i18n/locales";
import {
  currentPath,
  refreshSessionAt,
  runActionWith,
  type ActionClientConfig,
  type ActionClientEnv,
} from "@/lib/actions/action-client";

import { sharedCopy } from "./copy";
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

/** The Uzbek text; `runAction` words it in the page's language (`networkErrorMessage()`). */
export const NETWORK_ERROR_MESSAGE = sharedCopy.uz.network;

/**
 * The admin language of the page: `<html lang>`, which the panel keeps in step with the
 * `gd_admin_language` cookie (`HtmlLang`, the root layout's head script). Uzbek outside a browser.
 */
export function documentLocale(): Locale {
  if (typeof document === "undefined") return "uz";
  return knownAdminLocale(document.documentElement.lang) ?? "uz";
}

/** The synthetic `network_error` text in the page's language. */
export function networkErrorMessage(locale: Locale = documentLocale()): string {
  return sharedCopy[locale].network;
}

const ADMIN_ACTIONS: Omit<ActionClientConfig, "networkErrorMessage"> = {
  refreshPath: "/admin/auth/refresh",
  signInUrl: (next) => `/admin/login?next=${encodeURIComponent(next)}`,
  // DESIGN §E: the backend's 403 `password_change_required` → the forced change page.
  passwordChangeUrl: (next) => `/admin/change-password?next=${encodeURIComponent(next)}`,
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
  return runActionWith(
    { ...ADMIN_ACTIONS, networkErrorMessage: networkErrorMessage() },
    invoke,
    env,
  );
}
