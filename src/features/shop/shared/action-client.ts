import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import { SHOP_REFRESH_PATH } from "@/data/customer-auth/proxy-decision";
import type { ActionResult } from "@/data/types";
import {
  documentCookie,
  readCookie,
  runActionWith,
  type ActionClientConfig,
  type ActionClientEnv,
} from "@/lib/actions/action-client";
import type { Locale } from "@/lib/i18n/locales";

import { parseShopPath, shopHref } from "../routing/routes";

/**
 * Storefront binding of the shared Server Action plumbing
 * (`src/lib/actions/action-client.ts`) for W3b's islands (add to cart,
 * checkout, booking, account): the `gd_cust_csrf` cookie, the single-flight
 * refresh route and the localized sign-in page. A Server Action guarded by
 * `guardCustomerAction(csrf)` answers `session_expired` when the access
 * cookie lapsed; `runShopAction` then refreshes once and retries, and sends
 * the customer to sign in (with `next` = this page) when the session ended.
 */

export { useIdempotencyKey, type IdempotencyKey } from "@/lib/actions/idempotency";

/** The readable csrf cookie (`""` outside a browser or before the proxy minted it). */
export function readShopCsrf(cookieString: string | undefined = documentCookie()): string {
  // `__Host-gd_cust_csrf` on HTTPS, `gd_cust_csrf` on plain-HTTP development.
  return (
    readCookie(customerCookieNames(true).csrf, cookieString) ||
    readCookie(customerCookieNames(false).csrf, cookieString)
  );
}

/** Whether the readable signed-in hint is set (presentation only; never trusted). */
export function hasSignedInHint(cookieString: string | undefined = documentCookie()): boolean {
  return readCookie(customerCookieNames(false).signedIn, cookieString) === "1";
}

const NETWORK_ERROR: Record<Locale, string> = {
  uz: "Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",
  ru: "Не удалось связаться с сервером. Попробуйте ещё раз.",
  en: "Could not reach the server. Please try again.",
};

export function shopActionConfig(locale: Locale): ActionClientConfig {
  return {
    refreshPath: SHOP_REFRESH_PATH,
    signInUrl: (next) => {
      const nextLocale = parseShopPath(next.split("?")[0] ?? "/")?.locale ?? locale;
      return shopHref(nextLocale, { kind: "signIn" }, { next });
    },
    networkErrorMessage: NETWORK_ERROR[locale],
  };
}

export function browserShopEnv(): ActionClientEnv {
  return {
    fetch: (input, init) => fetch(input, init),
    location: window.location,
    csrf: () => readShopCsrf(),
  };
}

export function runShopAction<T>(
  locale: Locale,
  invoke: (csrf: string) => Promise<ActionResult<T>>,
  env: ActionClientEnv = browserShopEnv(),
): Promise<ActionResult<T>> {
  return runActionWith(shopActionConfig(locale), invoke, env);
}
