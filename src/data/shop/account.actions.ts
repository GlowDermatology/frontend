"use server";

import {
  apiAttachEmail,
  apiAttachPhone,
  apiChangePassword,
  apiConsent,
  apiCreateAddress,
  apiDefaultAddress,
  apiDeleteAddress,
  apiDeleteMe,
  apiEmailCode,
  apiLinkSocial,
  apiMe,
  apiPatchMe,
  apiPhoneCode,
  apiRevokeOtherSessions,
  apiRevokeSession,
  apiSendCode,
  apiUnlinkSocial,
  apiUpdateAddress,
  apiVerifyCode,
} from "@/data/api/customer/account";
import { mapAddress, mapMe } from "@/data/api/customer/account-mappers";
import type { ApiAddressWrite } from "@/data/api/customer/account-types";
import { apiCart, apiUnreadCount } from "@/data/api/customer/commerce";
import { isApiError } from "@/data/api/errors";
import { readCustomerSession, guardCustomerAction } from "@/data/customer-auth/session";
import type { ActionResult } from "@/data/types";
import type {
  ShopAddress,
  ShopHeaderSummary,
  ShopLanguage,
  ShopMe,
  SocialProvider,
} from "@/domain/shop-account";
import { PHONE_PATTERN, normalizePhone } from "@/lib/phone";
import { isLocale, type Locale } from "@/lib/i18n/locales";

import type { CodeSent } from "./auth.actions";
import {
  SESSION_EXPIRED_FAILURE,
  forgetSignIn,
  hasCustomerCookies,
  shopMessage,
  toShopFailure,
} from "./private";

/**
 * The signed-in customer's account (contract §2.2; hybrid identity B-W2;
 * «Faol seanslar» B-W1). Every action is guarded by `guardCustomerAction`
 * (csrf + a live access cookie; `session_expired` makes the client plumbing
 * refresh once and retry).
 */

function localeOf(value: unknown): Locale {
  return typeof value === "string" && isLocale(value) ? value : "uz";
}

function codeSent(data: {
  phone_mask: string | null;
  email_mask: string | null;
  resend_in: number;
  length: number;
}): CodeSent {
  return {
    mask: data.phone_mask ?? data.email_mask ?? "",
    channel: data.email_mask && !data.phone_mask ? "email" : "sms",
    resendIn: Math.max(0, data.resend_in),
    length: data.length || 6,
  };
}

/** Re-authentication proof of a sign-in-method change (§2.2.8–§2.2.10). */
export interface Reauth {
  password?: string | null;
  verificationToken?: string | null;
}

function reauthBody(reauth: Reauth | undefined) {
  return {
    password: reauth?.password || null,
    verification_token: reauth?.verificationToken || null,
  };
}

/* --- header -------------------------------------------------------------- */

/**
 * The header's name, cart and inbox badges. Anonymous visitors (no session
 * cookie) get `signedIn: false` without an API call; a lapsed access cookie
 * answers `session_expired`, so the header refreshes once and asks again.
 */
export async function headerSummary(input: {
  locale: string;
}): Promise<ActionResult<ShopHeaderSummary>> {
  const locale = localeOf(input.locale);
  const anonymous = { signedIn: false, name: null, cartQuantity: 0, unread: 0 };
  if (!(await hasCustomerCookies())) return { ok: true, data: anonymous };
  const session = await readCustomerSession();
  if (!session.accessToken) {
    return session.hasRefresh ? SESSION_EXPIRED_FAILURE : { ok: true, data: anonymous };
  }
  try {
    const [me, cart, unread] = await Promise.all([
      apiMe(locale),
      apiCart(locale).catch(() => null),
      apiUnreadCount(locale).catch(() => null),
    ]);
    return {
      ok: true,
      data: {
        signedIn: true,
        name: me.data.name.trim() || null,
        cartQuantity: cart?.data.quantity_total ?? 0,
        unread: unread?.data.unread_count ?? 0,
      },
    };
  } catch (error) {
    if (isApiError(error) && error.status === 401) return SESSION_EXPIRED_FAILURE;
    return toShopFailure(error, locale);
  }
}

/* --- profile and consent ------------------------------------------------- */

export async function updateProfile(input: {
  locale: string;
  name: string;
  language: ShopLanguage;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data } = await apiPatchMe(locale, {
      name: String(input.name ?? "").trim(),
      language: isLocale(input.language) ? input.language : locale,
    });
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/** `POST me/consent/` with the version the customer read (contract §2.2.4). */
export async function acceptTerms(input: {
  locale: string;
  termsVersion: string;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data } = await apiConsent(locale, String(input.termsVersion ?? ""));
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- re-authentication by a code to the customer's own phone or e-mail --- */

/**
 * Sends a `reset_password` code to the account's **own** phone (else its
 * e-mail): the proof a password-less account gives before changing how it
 * signs in (§2.2.8). The target is read from `me/`, never from the client.
 */
export async function sendReauthCode(input: {
  locale: string;
  csrf: string;
}): Promise<ActionResult<CodeSent>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data: me } = await apiMe(locale);
    const target = me.phone ? { phone: me.phone } : me.email ? { email: me.email } : null;
    if (!target) {
      return {
        ok: false,
        error: shopMessage(locale, "unexpected"),
        code: "reauth_required",
      };
    }
    const { data } = await apiSendCode(locale, { ...target, purpose: "reset_password" });
    return { ok: true, data: codeSent(data) };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

export async function verifyReauthCode(input: {
  locale: string;
  code: string;
  csrf: string;
}): Promise<ActionResult<{ token: string }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data: me } = await apiMe(locale);
    const target = me.phone ? { phone: me.phone } : me.email ? { email: me.email } : null;
    if (!target)
      return { ok: false, error: shopMessage(locale, "unexpected"), code: "reauth_required" };
    const { data } = await apiVerifyCode(locale, {
      ...target,
      purpose: "reset_password",
      code: String(input.code ?? "").replace(/\D/g, ""),
    });
    return { ok: true, data: { token: data.verification_token } };
  } catch (error) {
    return toShopFailure(error, locale, { route: "auth" });
  }
}

/* --- password, phone, e-mail --------------------------------------------- */

export async function changePassword(input: {
  locale: string;
  currentPassword?: string | null;
  verificationToken?: string | null;
  password: string;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data } = await apiChangePassword(
      locale,
      {
        current_password: input.currentPassword || null,
        verification_token: input.verificationToken || null,
        password: String(input.password ?? ""),
      },
      String(input.idempotencyKey),
    );
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

function phoneOf(value: unknown): string | null {
  const phone = normalizePhone(typeof value === "string" ? value : "");
  return PHONE_PATTERN.test(phone) ? phone : null;
}

const PHONE_INVALID: Record<Locale, string> = {
  uz: "Telefon raqamini to‘g‘ri kiriting.",
  ru: "Введите корректный номер телефона.",
  en: "Enter a valid phone number.",
};

/** `POST me/phone/code/` (purpose `attach_phone`). */
export async function sendPhoneCode(input: {
  locale: string;
  phone: string;
  csrf: string;
}): Promise<ActionResult<CodeSent>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const phone = phoneOf(input.phone);
  if (!phone) {
    return {
      ok: false,
      error: PHONE_INVALID[locale],
      code: "validation_error",
      fieldErrors: { phone: PHONE_INVALID[locale] },
    };
  }
  try {
    return { ok: true, data: codeSent((await apiPhoneCode(locale, phone)).data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/** `POST me/phone/`: attaches the verified phone (409 `phone_taken`, `reauth_required`). */
export async function attachPhone(input: {
  locale: string;
  phone: string;
  code: string;
  reauth?: Reauth;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  const phone = phoneOf(input.phone);
  if (!phone) return { ok: false, error: PHONE_INVALID[locale], code: "validation_error" };
  try {
    const { data } = await apiAttachPhone(locale, {
      phone,
      code: String(input.code ?? "").replace(/\D/g, ""),
      ...reauthBody(input.reauth),
    });
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function sendEmailCode(input: {
  locale: string;
  email: string;
  csrf: string;
}): Promise<ActionResult<CodeSent>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    return { ok: true, data: codeSent((await apiEmailCode(locale, email)).data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function attachEmail(input: {
  locale: string;
  email: string;
  code: string;
  reauth?: Reauth;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data } = await apiAttachEmail(locale, {
      email: String(input.email ?? "")
        .trim()
        .toLowerCase(),
      code: String(input.code ?? "").replace(/\D/g, ""),
      ...reauthBody(input.reauth),
    });
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- social identities --------------------------------------------------- */

const PROVIDERS: ReadonlyArray<SocialProvider> = ["google", "facebook", "apple"];

export async function linkSocial(input: {
  locale: string;
  provider: SocialProvider;
  token: string;
  tokenType: "id_token" | "access_token";
  nonce?: string | null;
  authorizationCode?: string | null;
  reauth?: Reauth;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  if (!PROVIDERS.includes(input.provider)) {
    return { ok: false, error: shopMessage(locale, "invalid"), code: "validation_error" };
  }
  try {
    const { data } = await apiLinkSocial(
      locale,
      {
        provider: input.provider,
        token: String(input.token ?? "").slice(0, 4096),
        token_type: input.tokenType === "access_token" ? "access_token" : "id_token",
        nonce: input.nonce ?? null,
        authorization_code: input.authorizationCode ?? null,
        ...reauthBody(input.reauth),
      },
      String(input.idempotencyKey),
    );
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function unlinkSocial(input: {
  locale: string;
  provider: SocialProvider;
  reauth?: Reauth;
  csrf: string;
}): Promise<ActionResult<ShopMe>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  if (!PROVIDERS.includes(input.provider)) {
    return { ok: false, error: shopMessage(locale, "invalid"), code: "validation_error" };
  }
  try {
    const { data } = await apiUnlinkSocial(locale, input.provider, reauthBody(input.reauth));
    return { ok: true, data: mapMe(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- addresses ----------------------------------------------------------- */

export interface AddressInput {
  label: string;
  text: string;
  regionCode: string;
  cityCode: string;
  comment: string;
  isDefault: boolean;
}

function addressBody(input: AddressInput): ApiAddressWrite {
  const code = (value: unknown) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return /^\d{1,16}$/.test(trimmed) ? trimmed : "";
  };
  return {
    label: String(input.label ?? "")
      .trim()
      .slice(0, 60),
    text: String(input.text ?? "").trim(),
    region_code: code(input.regionCode),
    city_code: code(input.cityCode),
    comment: String(input.comment ?? "")
      .trim()
      .slice(0, 200),
    is_default: Boolean(input.isDefault),
  };
}

export async function saveAddress(input: {
  locale: string;
  id?: number | null;
  address: AddressInput;
  idempotencyKey: string;
  csrf: string;
}): Promise<ActionResult<ShopAddress>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const body = addressBody(input.address);
    const { data } = input.id
      ? await apiUpdateAddress(locale, Number(input.id), body)
      : await apiCreateAddress(locale, body, String(input.idempotencyKey));
    return { ok: true, data: mapAddress(data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function deleteAddress(input: {
  locale: string;
  id: number;
  csrf: string;
}): Promise<ActionResult<null>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    await apiDeleteAddress(locale, Number(input.id));
    return { ok: true, data: null };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

export async function makeDefaultAddress(input: {
  locale: string;
  id: number;
  csrf: string;
}): Promise<ActionResult<ShopAddress>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    return { ok: true, data: mapAddress((await apiDefaultAddress(locale, Number(input.id))).data) };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}

/* --- delete the account -------------------------------------------------- */

/** `DELETE me/` (contract §2.2.3); on success this browser's session ends too. */
export async function deleteAccount(input: {
  locale: string;
  reauth?: Reauth;
  csrf: string;
}): Promise<ActionResult<null>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    await apiDeleteMe(locale, reauthBody(input.reauth));
  } catch (error) {
    return toShopFailure(error, locale);
  }
  await forgetSignIn();
  return { ok: true, data: null };
}

/* --- «Faol seanslar» ----------------------------------------------------- */

/**
 * `DELETE me/sessions/{id}/` — the row menu «Chiqish». Signing out this
 * browser's own row ends the session here as well (cookies cleared).
 */
export async function revokeSession(input: {
  locale: string;
  id: string;
  current: boolean;
  csrf: string;
}): Promise<ActionResult<{ signedOut: boolean }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    await apiRevokeSession(locale, String(input.id ?? ""));
  } catch (error) {
    if (!(isApiError(error) && error.status === 404)) return toShopFailure(error, locale);
  }
  if (input.current) {
    await forgetSignIn();
    return { ok: true, data: { signedOut: true } };
  }
  return { ok: true, data: { signedOut: false } };
}

/** `POST me/sessions/revoke-others/` — «Boshqa qurilmalardan chiqish». */
export async function revokeOtherSessions(input: {
  locale: string;
  csrf: string;
}): Promise<ActionResult<{ revoked: number }>> {
  const locale = localeOf(input.locale);
  const guard = await guardCustomerAction(input.csrf);
  if (!guard.ok) return guard;
  try {
    const { data } = await apiRevokeOtherSessions(locale);
    return { ok: true, data: { revoked: data.revoked } };
  } catch (error) {
    return toShopFailure(error, locale);
  }
}
