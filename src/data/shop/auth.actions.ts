"use server";

import { cookies } from "next/headers";

import {
  apiLogin,
  apiResetPassword,
  apiSendCode,
  apiSetPassword,
  apiSocialComplete,
  apiSocialNonce,
  apiSocialSignIn,
  apiVerifyCode,
} from "@/data/api/customer/account";
import {
  isAuthTokens,
  type ApiAuthTokens,
  type ApiNextStep,
} from "@/data/api/customer/account-types";
import { setCookie } from "@/data/auth/cookies";
import { mintCsrf } from "@/data/auth/csrf";
import { customerCsrfCookie } from "@/data/customer-auth/cookies";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { guardCustomerCsrf } from "@/data/customer-auth/session";
import type { ActionResult } from "@/data/types";
import type { SocialProvider } from "@/domain/shop-account";
import { identifierBody, parseIdentifier, type Identifier } from "@/features/shop/auth/identifier";
import { serverEnv } from "@/lib/env.server";
import { isLocale, type Locale } from "@/lib/i18n/locales";

import { shopMessage, storeSignIn, toShopFailure } from "./private";

/**
 * Sign-in, registration, password reset and social sign-in of the
 * storefront (contract §2.1; hybrid identity B-W2: a phone **or** an e-mail
 * address). The browser never sees a token: a successful sign-in sets the
 * HttpOnly session cookies and the device key here and answers only where
 * to go next. Each action checks the double-submit csrf token first.
 */

export interface CodeSent {
  /** "+998 90 *** ** 67" or "m***@gmail.com". */
  mask: string;
  channel: "sms" | "email";
  resendIn: number;
  length: number;
}

export type SignInOutcome =
  | { kind: "done"; next: string; isNew: boolean }
  | ({ kind: "verify_device" } & CodeSent)
  | {
      kind: "verify_phone";
      ticket: string;
      provider: SocialProvider;
      emailMask: string | null;
    };

type Purpose = "register" | "reset_password" | "login_new_device" | "link_social";

function localeOf(value: unknown): Locale {
  return typeof value === "string" && isLocale(value) ? value : "uz";
}

function identifierOf(value: unknown, locale: Locale): Identifier | ActionResult<never> {
  const parsed = parseIdentifier(value);
  if (parsed.kind === "phone" || parsed.kind === "email") return parsed;
  const field = parsed.kind === "invalid" && parsed.looksLike === "email" ? "email" : "phone";
  const message = {
    uz: "Telefon raqami yoki emailni to‘g‘ri kiriting.",
    ru: "Введите корректный номер телефона или email.",
    en: "Enter a valid phone number or e-mail address.",
  }[locale];
  return {
    ok: false,
    error: message,
    code: "validation_error",
    fieldErrors: { identifier: message, [field]: message },
  };
}

function isIdentifier(value: Identifier | ActionResult<never>): value is Identifier {
  return "kind" in value;
}

function codeSent(input: {
  phone_mask: string | null;
  email_mask: string | null;
  resend_in: number;
  length: number;
}): CodeSent {
  return {
    mask: input.phone_mask ?? input.email_mask ?? "",
    channel: input.email_mask && !input.phone_mask ? "email" : "sms",
    resendIn: Math.max(0, input.resend_in),
    length: input.length || 6,
  };
}

async function rotateCsrf(): Promise<void> {
  const jar = await cookies();
  setCookie(jar, customerCsrfCookie({ secure: serverEnv.cookieSecure(), value: mintCsrf() }));
}

async function finishSignIn(
  tokens: ApiAuthTokens,
  locale: Locale,
  next: unknown,
): Promise<ActionResult<SignInOutcome>> {
  if (!(await storeSignIn(tokens))) {
    return { ok: false, error: shopMessage(locale, "unexpected"), code: "unexpected" };
  }
  await rotateCsrf();
  return {
    ok: true,
    data: { kind: "done", next: safeShopNext(next, locale), isNew: tokens.is_new_customer },
  };
}

function nextStepOutcome(step: ApiNextStep): SignInOutcome {
  if (step.next_step === "verify_phone" && step.social_ticket && step.provider) {
    return {
      kind: "verify_phone",
      ticket: step.social_ticket,
      provider: step.provider,
      emailMask: step.email_mask,
    };
  }
  return {
    kind: "verify_device",
    ...codeSent({
      phone_mask: step.phone_mask,
      email_mask: step.email_mask,
      resend_in: step.otp?.resend_in ?? 60,
      length: step.otp?.length ?? 6,
    }),
  };
}

/** `auth/send-code/` for registration, a reset or a social link. */
export async function sendSignInCode(input: {
  locale: string;
  identifier: string;
  purpose: Purpose;
  socialTicket?: string | null;
  csrf: string;
}): Promise<ActionResult<CodeSent>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  const identifier = identifierOf(input.identifier, locale);
  if (!isIdentifier(identifier)) return identifier;
  if (!["register", "reset_password", "link_social"].includes(input.purpose)) {
    return { ok: false, error: shopMessage(locale, "invalid"), code: "validation_error" };
  }
  try {
    const { data } = await apiSendCode(locale, {
      ...identifierBody(identifier),
      purpose: input.purpose,
      social_ticket: input.purpose === "link_social" ? (input.socialTicket ?? null) : null,
    });
    return { ok: true, data: codeSent(data) };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/** `auth/verify-code/` → the single-use verification token (kept in the form's memory). */
export async function verifySignInCode(input: {
  locale: string;
  identifier: string;
  purpose: Purpose;
  code: string;
  csrf: string;
}): Promise<ActionResult<{ token: string; customerExists: boolean }>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  const identifier = identifierOf(input.identifier, locale);
  if (!isIdentifier(identifier)) return identifier;
  try {
    const { data } = await apiVerifyCode(locale, {
      ...identifierBody(identifier),
      purpose: input.purpose,
      code: String(input.code ?? "").replace(/\D/g, ""),
    });
    return {
      ok: true,
      data: { token: data.verification_token, customerExists: data.customer_exists },
    };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/** `auth/set-password/`: the account is created and signed in (201 `AuthTokens`). */
export async function registerAccount(input: {
  locale: string;
  verificationToken: string;
  name: string;
  password: string;
  termsVersion: string;
  next?: string;
  csrf: string;
}): Promise<ActionResult<SignInOutcome>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  try {
    const { data } = await apiSetPassword(locale, {
      verification_token: String(input.verificationToken ?? ""),
      name: String(input.name ?? "").trim(),
      password: String(input.password ?? ""),
      terms_version: String(input.termsVersion ?? ""),
      language: locale,
    });
    return finishSignIn(data, locale, input.next);
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/**
 * `auth/login/` with this browser's device key. A known browser is signed in
 * at once; a new one gets a code (`verify_device`) and comes back with the
 * verification token of purpose `login_new_device`.
 */
export async function signIn(input: {
  locale: string;
  identifier: string;
  password: string;
  verificationToken?: string | null;
  next?: string;
  csrf: string;
}): Promise<ActionResult<SignInOutcome>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  const identifier = identifierOf(input.identifier, locale);
  if (!isIdentifier(identifier)) return identifier;
  try {
    const { data } = await apiLogin(locale, {
      ...identifierBody(identifier),
      password: String(input.password ?? ""),
      verification_token: input.verificationToken || null,
    });
    if (isAuthTokens(data)) return finishSignIn(data, locale, input.next);
    return { ok: true, data: nextStepOutcome(data) };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/** `auth/reset-password/`: the new password signs this browser in and every other one out. */
export async function resetPassword(input: {
  locale: string;
  verificationToken: string;
  password: string;
  next?: string;
  csrf: string;
}): Promise<ActionResult<SignInOutcome>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  try {
    const { data } = await apiResetPassword(locale, {
      verification_token: String(input.verificationToken ?? ""),
      password: String(input.password ?? ""),
    });
    return finishSignIn(data, locale, input.next);
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/** `auth/social/nonce/`: a single-use nonce bound to this browser's device id. */
export async function socialNonce(input: {
  locale: string;
  csrf: string;
}): Promise<ActionResult<{ nonce: string }>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  try {
    const { data } = await apiSocialNonce(locale);
    return { ok: true, data: { nonce: data.nonce } };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

const SOCIAL: ReadonlyArray<SocialProvider> = ["google", "facebook", "apple"];

/**
 * `auth/social/` with a token from the provider's web SDK: Google Identity
 * Services (`id_token` + nonce), the Facebook JS SDK (`access_token`) or
 * Sign in with Apple JS (`id_token` + nonce + the authorization code).
 */
export async function socialSignIn(input: {
  locale: string;
  provider: SocialProvider;
  token: string;
  tokenType: "id_token" | "access_token";
  nonce?: string | null;
  authorizationCode?: string | null;
  next?: string;
  csrf: string;
}): Promise<ActionResult<SignInOutcome>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  if (!SOCIAL.includes(input.provider) || typeof input.token !== "string" || !input.token) {
    return { ok: false, error: shopMessage(locale, "invalid"), code: "validation_error" };
  }
  try {
    const { data } = await apiSocialSignIn(locale, {
      provider: input.provider,
      token: input.token.slice(0, 4096),
      token_type: input.tokenType === "access_token" ? "access_token" : "id_token",
      nonce: input.nonce ?? null,
      authorization_code: input.authorizationCode ?? null,
    });
    if (isAuthTokens(data)) return finishSignIn(data, locale, input.next);
    return { ok: true, data: nextStepOutcome(data) };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/**
 * `auth/social/complete/`: either with a verified phone or e-mail (a code
 * sent with the ticket; an existing account with a password also needs it),
 * or without one — a new account whose phone is asked at the first order,
 * booking or QR (hybrid identity, §2.1.9).
 */
export async function completeSocialSignIn(input: {
  locale: string;
  ticket: string;
  verificationToken?: string | null;
  password?: string | null;
  name?: string | null;
  termsVersion?: string | null;
  next?: string;
  csrf: string;
}): Promise<ActionResult<SignInOutcome>> {
  const locale = localeOf(input.locale);
  const refused = await guardCustomerCsrf(input.csrf);
  if (refused) return refused;
  try {
    const { data } = await apiSocialComplete(locale, {
      social_ticket: String(input.ticket ?? ""),
      verification_token: input.verificationToken || null,
      password: input.password || null,
      name: input.name?.trim() || null,
      terms_version: input.termsVersion || null,
      language: locale,
    });
    return finishSignIn(data, locale, input.next);
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}
