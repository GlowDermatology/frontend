import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isApiError } from "@/data/api/errors";
import { setCookie } from "@/data/auth/cookies";
import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import {
  clearCustomerSession,
  deviceKeyCookie,
  sessionCookies,
} from "@/data/customer-auth/cookies";
import { SHOP_REFRESH_PATH } from "@/data/customer-auth/proxy-decision";
import { readCustomerSession } from "@/data/customer-auth/session";
import type { ActionFailure } from "@/data/types";
import { shopHref } from "@/features/shop/routing/routes";
import { serverEnv } from "@/lib/env.server";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Server-side plumbing of the private storefront (W3b): the session check
 * of the private pages, the API error → `ActionResult` mapping of the
 * customer Server Actions, and the cookies a sign-in sets.
 */

const MESSAGES = {
  uz: {
    network: "Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",
    invalid: "Maydonlarni tekshiring.",
    unexpected: "Kutilmagan xato. Qayta urinib ko‘ring.",
  },
  ru: {
    network: "Не удалось связаться с сервером. Попробуйте ещё раз.",
    invalid: "Проверьте поля.",
    unexpected: "Непредвиденная ошибка. Попробуйте ещё раз.",
  },
  en: {
    network: "Could not reach the server. Please try again.",
    invalid: "Please check the fields.",
    unexpected: "Something went wrong. Please try again.",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function shopMessage(locale: Locale, key: keyof (typeof MESSAGES)["uz"]): string {
  return MESSAGES[locale][key];
}

/** 401 codes that mean "this session cannot go on" on a **C** route (contract §1.2). */
const SESSION_CODES = new Set(["not_authenticated", "SESSION_EXPIRED", "SESSION_REPLACED"]);

export const SESSION_EXPIRED_FAILURE: ActionFailure = {
  ok: false,
  error: "session_expired",
  code: "session_expired",
};

/**
 * A failed customer API call as an `ActionResult` failure: the API's own
 * (already localized, §1.2) message and code, the field messages keyed by
 * their snake_case field, `details` and `Retry-After`. On a session route a
 * 401 becomes `session_expired`, which the client plumbing answers with one
 * refresh and a retry (`runShopAction`); `password_changed` keeps its code so
 * the page can say why. Transport failures read "could not reach the server".
 */
export function toShopFailure(
  error: unknown,
  locale: Locale,
  options: { route?: "session" | "auth" } = {},
): ActionFailure {
  if (!isApiError(error)) {
    console.error("[shop] action failed", error);
    return { ok: false, error: shopMessage(locale, "unexpected"), code: "unexpected" };
  }
  if (error.status === 0) {
    return { ok: false, error: shopMessage(locale, "network"), code: "network_error" };
  }
  if (
    (options.route ?? "session") === "session" &&
    error.status === 401 &&
    (SESSION_CODES.has(error.code) || error.code.startsWith("http_"))
  ) {
    return SESSION_EXPIRED_FAILURE;
  }
  const fieldErrors: Record<string, string> = {};
  for (const item of error.body.errors) {
    if (item.field) fieldErrors[item.field] ??= item.message;
  }
  return {
    ok: false,
    error: error.body.message || shopMessage(locale, "unexpected"),
    code: error.code,
    ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
    ...(error.details !== undefined && error.details !== null ? { details: error.details } : {}),
    ...(error.retryAfter !== undefined ? { retryAfter: error.retryAfter } : {}),
  };
}

/** The sign-in page for `next`, in the language of the page. */
export function signInHref(locale: Locale, next: string) {
  return shopHref(locale, { kind: "signIn" }, { next });
}

/**
 * The private-page gate (call it inside the page's Suspense boundary): a
 * live access cookie lets the page render; a lapsed one with a refresh
 * cookie goes through the single-flight refresh route back to `next` (the
 * proxy normally did that already); no session at all goes to sign-in.
 */
export async function requireCustomer(locale: Locale, next: string): Promise<void> {
  const session = await readCustomerSession();
  if (session.accessToken) return;
  if (session.hasRefresh) redirect(`${SHOP_REFRESH_PATH}?next=${encodeURIComponent(next)}`);
  redirect(signInHref(locale, next));
}

/**
 * Runs a private page's read. An API 401 (the session was revoked or its
 * device does not match) is sent through the refresh route, which either
 * rotates the session and comes back or clears it and opens sign-in; any
 * other failure reaches the page's error boundary.
 */
export async function privateRead<T>(next: string, read: () => Promise<T>): Promise<T> {
  let failure: unknown;
  try {
    return await read();
  } catch (error) {
    failure = error;
  }
  if (isApiError(failure) && failure.status === 401) {
    redirect(`${SHOP_REFRESH_PATH}?next=${encodeURIComponent(next)}`);
  }
  throw failure;
}

/** Tokens of a successful sign-in (contract `AuthTokens`). */
export interface SignInTokens {
  access: string;
  access_expires_at: string;
  refresh: string;
  refresh_expires_at: string;
  device_key: string | null;
}

/**
 * Stores a sign-in in this browser (Server Action context): access, refresh
 * and the signed-in hint, plus the new device key when the API issued one
 * (`null` = keep the stored key, §1.9). `false` when the answer was unusable.
 */
export async function storeSignIn(tokens: SignInTokens): Promise<boolean> {
  const secure = serverEnv.cookieSecure();
  const session = sessionCookies({
    secure,
    access: tokens.access,
    accessExpiresAt: tokens.access_expires_at,
    refresh: tokens.refresh,
    refreshExpiresAt: tokens.refresh_expires_at,
    nowMs: Date.now(),
  });
  if (!session) return false;
  const jar = await cookies();
  for (const cookie of session) setCookie(jar, cookie);
  if (tokens.device_key) {
    const key = deviceKeyCookie({ secure, value: tokens.device_key });
    if (key) setCookie(jar, key);
  }
  return true;
}

/** Ends this browser's session (deleted account, own session signed out). */
export async function forgetSignIn(): Promise<void> {
  const jar = await cookies();
  clearCustomerSession(jar, serverEnv.cookieSecure());
}

/** Whether this browser holds any customer session cookie (header summary). */
export async function hasCustomerCookies(): Promise<boolean> {
  const jar = await cookies();
  const names = customerCookieNames(serverEnv.cookieSecure());
  return jar.has(names.refresh) || jar.has(names.access);
}
