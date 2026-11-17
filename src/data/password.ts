import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";

import { serverEnv } from "@/lib/env.server";

import { apiPasswordTokenCheck } from "./api/auth";
import { isApiError } from "./api/errors";
import { referenceNow } from "./config";
import { isPasswordToken, passwordTokenCookieName } from "./auth/password-token";

/**
 * Read side of the e-mailed password link (DESIGN §E, contract §2.1
 * `auth/password-token/check/`): the set-password page checks the token the
 * proxy stored in its HttpOnly cookie before it shows the form. The token is
 * never rendered or handed to the browser.
 */

export type PasswordLinkPurpose = "invite" | "reset";

export interface PasswordLinkInfo {
  /** `a***@glowderma.uz` — the server masks it. */
  emailMasked: string;
  fullName: string;
  purpose: PasswordLinkPurpose;
  expiresAt: string;
}

export type PasswordLinkCheck =
  | { ok: true; info: PasswordLinkInfo }
  /** `missing`: no link was opened in this browser (or the cookie expired); `invalid`: the server refused it. */
  | { ok: false; reason: "missing" | "invalid" | "throttled" | "unreachable" };

/** The token of the link opened in this browser, else `null`. */
export async function stashedPasswordToken(): Promise<string | null> {
  const value = (await cookies()).get(passwordTokenCookieName(serverEnv.cookieSecure()))?.value;
  return isPasswordToken(value) ? value : null;
}

/**
 * Demo links (mock mode): any well-formed token opens the form for a demo account; a token
 * starting with `invalid` or `expired` imitates the backend's uniform `token_invalid`, one
 * starting with `reset` a password reset instead of an invitation.
 */
export function mockPasswordLink(token: string): PasswordLinkCheck {
  if (/^(invalid|expired)/i.test(token)) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    info: {
      emailMasked: "s***@glowderma.uz",
      fullName: "Sardor Qodirov",
      purpose: /^reset/i.test(token) ? "reset" : "invite",
      expiresAt: new Date(referenceNow().getTime() + 72 * 3_600_000).toISOString(),
    },
  };
}

export async function checkPasswordLink(): Promise<PasswordLinkCheck> {
  await connection();
  const token = await stashedPasswordToken();
  if (!token) return { ok: false, reason: "missing" };
  if (serverEnv.dataSource() === "mock") return mockPasswordLink(token);
  try {
    const { data } = await apiPasswordTokenCheck(token);
    return {
      ok: true,
      info: {
        emailMasked: data.email_masked,
        fullName: data.full_name,
        purpose: data.purpose === "reset" ? "reset" : "invite",
        expiresAt: data.expires_at,
      },
    };
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 429) return { ok: false, reason: "throttled" };
    if (error.status === 0 || error.status >= 500) return { ok: false, reason: "unreachable" };
    return { ok: false, reason: "invalid" };
  }
}
