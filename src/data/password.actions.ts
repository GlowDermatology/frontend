"use server";

import { cookies } from "next/headers";

import { passwordDataCopy } from "@/domain/copy/password";
import { serverEnv } from "@/lib/env.server";
import { copyFor, getLocalized } from "@/lib/i18n/admin-locale";

import { fieldErrorsFrom, guardAction, sessionToken } from "./action-guard";
import { apiChangePassword } from "./api/admin";
import { apiOwnPasswordLink, apiPasswordTokenSet } from "./api/auth";
import { toActionResult } from "./api/mappers/errors";
import { MOCK_PASSWORD_SET_COOKIE } from "./auth";
import { cookieNames } from "./auth/cookie-names";
import { csrfMatches } from "./auth/csrf";
import { safeNext } from "./auth/next-param";
import { clearPasswordTokenCookie } from "./auth/password-token";
import { referenceNow } from "./config";
import { delay } from "./mock/delay";
import { mockPasswordLink, stashedPasswordToken } from "./password";
import {
  passwordSchemas,
  type ChangeOwnPasswordValues,
  type SetPasswordValues,
} from "./password.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * The own-password flows of DESIGN §E.
 *
 * - `changeOwnPassword` — the forced change at `/admin/change-password` (`auth/change-password/`,
 *   allowed while a change is pending): clears `must_change_password`, keeps this session, revokes
 *   the others; answers where to go next (`safeNext`, never an auth or password page).
 * - `requestOwnPasswordLink` — «Havola yuborish» for an account that cannot type a current
 *   password (OAuth sign-in, e-mail-link account): `auth/password-link/`.
 * - `setPasswordWithLink` — the public `/admin/set-password` form: the token comes from the
 *   HttpOnly cookie the proxy stored (never from the browser), `auth/password-token/set/` → 204,
 *   no session is opened; the person signs in next.
 */

export async function changeOwnPassword(
  values: ChangeOwnPasswordValues,
  next: string,
  csrf: string,
): Promise<ActionResult<{ next: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = await copyFor(passwordDataCopy);
  const parsed = (await getLocalized(passwordSchemas)).change.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      await apiChangePassword(sessionToken(guard.session), {
        current_password: parsed.data.currentPassword,
        new_password: parsed.data.newPassword,
      });
    } catch (error) {
      return toActionResult(error);
    }
    return { ok: true, data: { next: safeNext(next) } };
  }
  await delay(400);
  // The demo keeps no password: this browser stops being gated (`GLOWDERMA_MOCK_MUST_CHANGE`).
  (await cookies()).set(MOCK_PASSWORD_SET_COOKIE, "1", {
    httpOnly: true,
    secure: serverEnv.cookieSecure(),
    sameSite: "strict",
    path: "/admin",
  });
  return { ok: true, data: { next: safeNext(next) } };
}

export interface OwnPasswordLinkSent {
  emailMasked: string;
  expiresAt: string | null;
  /** The demo only reports the e-mail. */
  demo?: boolean;
}

export async function requestOwnPasswordLink(
  csrf: string,
): Promise<ActionResult<OwnPasswordLinkSent>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiOwnPasswordLink(sessionToken(guard.session));
      return {
        ok: true,
        data: { emailMasked: data.email_masked, expiresAt: data.activation.expires_at || null },
      };
    } catch (error) {
      return toActionResult(error);
    }
  }
  await delay(400);
  const m = await copyFor(passwordDataCopy);
  if (!serverEnv.mockEmailInvite())
    return { ok: false, error: m.emailUnavailable, code: "conflict" };
  return {
    ok: true,
    data: {
      emailMasked: "a***@glowderma.uz",
      expiresAt: new Date(referenceNow().getTime() + 72 * 3_600_000).toISOString(),
      demo: true,
    },
  };
}

export async function setPasswordWithLink(
  values: SetPasswordValues,
  csrf: string,
): Promise<ActionResult<{ done: true }>> {
  const m = await copyFor(passwordDataCopy);
  const secure = serverEnv.cookieSecure();
  const store = await cookies();
  // A public form: the double-submit token the proxy minted when the page was served.
  if (!csrfMatches(store.get(cookieNames(secure).csrf)?.value, csrf)) {
    return { ok: false, error: m.staleForm, code: "csrf" };
  }
  const token = await stashedPasswordToken();
  if (!token) return { ok: false, error: m.tokenInvalid, code: "token_invalid" };
  const parsed = (await getLocalized(passwordSchemas)).set.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  if ((await dataSource()) === "api") {
    try {
      await apiPasswordTokenSet({ token, new_password: parsed.data.newPassword });
    } catch (error) {
      const failure = toActionResult(error);
      if (failure.code === "token_invalid") clearPasswordTokenCookie(store, secure);
      return failure;
    }
  } else {
    await delay(400);
    if (!mockPasswordLink(token).ok) {
      clearPasswordTokenCookie(store, secure);
      return { ok: false, error: m.tokenInvalid, code: "token_invalid" };
    }
  }
  clearPasswordTokenCookie(store, secure);
  return { ok: true, data: { done: true } };
}
