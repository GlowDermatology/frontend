import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import type {
  ApiAddress,
  ApiAddressList,
  ApiAddressWrite,
  ApiAuthTokens,
  ApiAuthTokensOrNextStep,
  ApiCodeIssue,
  ApiEmailAttach,
  ApiLoginRequest,
  ApiMe,
  ApiMePatch,
  ApiNonce,
  ApiPasswordChange,
  ApiPhoneAttach,
  ApiReauth,
  ApiResetPasswordRequest,
  ApiRevokedSessions,
  ApiSendCodeRequest,
  ApiSessionPage,
  ApiSetPasswordRequest,
  ApiSocialCompleteRequest,
  ApiSocialLink,
  ApiSocialProvider,
  ApiSocialRequest,
  ApiVerification,
  ApiVerifyCodeRequest,
} from "./account-types";
import { customerFetch } from "./client";

/**
 * Sign-in and account endpoints (contract §2.1, §2.2; hybrid identity B-W2;
 * sessions B-W1). `auth/*` send the device headers without a bearer
 * (`auth: "device"`; `auth/login/` adds `X-GD-Device-Key`); everything under
 * `me/` is a **C** route (`auth: "session"`). Every function throws
 * `ApiError`; the Server Actions turn it into an `ActionResult`.
 */

const AUTH = "/api/v1/auth";
const ME = "/api/v1/me";

/* --- auth (no session) --------------------------------------------------- */

export function apiSendCode(locale: Locale, body: ApiSendCodeRequest) {
  return customerFetch<ApiCodeIssue>(`${AUTH}/send-code/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

export function apiVerifyCode(locale: Locale, body: ApiVerifyCodeRequest) {
  return customerFetch<ApiVerification>(`${AUTH}/verify-code/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

export function apiSetPassword(locale: Locale, body: ApiSetPasswordRequest) {
  return customerFetch<ApiAuthTokens>(`${AUTH}/set-password/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

export function apiLogin(locale: Locale, body: ApiLoginRequest) {
  return customerFetch<ApiAuthTokensOrNextStep>(`${AUTH}/login/`, {
    method: "POST",
    locale,
    auth: "device",
    withDeviceKey: true,
    body,
  });
}

export function apiResetPassword(locale: Locale, body: ApiResetPasswordRequest) {
  return customerFetch<ApiAuthTokens>(`${AUTH}/reset-password/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

export function apiSocialNonce(locale: Locale) {
  return customerFetch<ApiNonce>(`${AUTH}/social/nonce/`, { locale, auth: "device" });
}

export function apiSocialSignIn(locale: Locale, body: ApiSocialRequest) {
  return customerFetch<ApiAuthTokensOrNextStep>(`${AUTH}/social/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

export function apiSocialComplete(locale: Locale, body: ApiSocialCompleteRequest) {
  return customerFetch<ApiAuthTokens>(`${AUTH}/social/complete/`, {
    method: "POST",
    locale,
    auth: "device",
    body,
  });
}

/* --- me ------------------------------------------------------------------ */

export function apiMe(locale: Locale) {
  return customerFetch<ApiMe>(`${ME}/`, { locale, auth: "session" });
}

export function apiPatchMe(locale: Locale, body: ApiMePatch) {
  return customerFetch<ApiMe>(`${ME}/`, { method: "PATCH", locale, auth: "session", body });
}

export function apiDeleteMe(locale: Locale, body: ApiReauth) {
  return customerFetch<undefined>(`${ME}/`, { method: "DELETE", locale, auth: "session", body });
}

export function apiConsent(locale: Locale, termsVersion: string) {
  return customerFetch<ApiMe>(`${ME}/consent/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { terms_version: termsVersion },
  });
}

export function apiChangePassword(locale: Locale, body: ApiPasswordChange, idempotencyKey: string) {
  return customerFetch<ApiMe>(`${ME}/password/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
    idempotencyKey,
  });
}

export function apiPhoneCode(locale: Locale, phone: string) {
  return customerFetch<ApiCodeIssue>(`${ME}/phone/code/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { phone },
  });
}

export function apiAttachPhone(locale: Locale, body: ApiPhoneAttach) {
  return customerFetch<ApiMe>(`${ME}/phone/`, { method: "POST", locale, auth: "session", body });
}

export function apiEmailCode(locale: Locale, email: string) {
  return customerFetch<ApiCodeIssue>(`${ME}/email/code/`, {
    method: "POST",
    locale,
    auth: "session",
    body: { email },
  });
}

export function apiAttachEmail(locale: Locale, body: ApiEmailAttach) {
  return customerFetch<ApiMe>(`${ME}/email/`, { method: "POST", locale, auth: "session", body });
}

export function apiLinkSocial(locale: Locale, body: ApiSocialLink, idempotencyKey: string) {
  return customerFetch<ApiMe>(`${ME}/social/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
    idempotencyKey,
  });
}

export function apiUnlinkSocial(locale: Locale, provider: ApiSocialProvider, body: ApiReauth) {
  return customerFetch<ApiMe>(`${ME}/social/${provider}/`, {
    method: "DELETE",
    locale,
    auth: "session",
    body,
  });
}

/* --- addresses ----------------------------------------------------------- */

export function apiAddresses(locale: Locale) {
  return customerFetch<ApiAddressList>(`${ME}/addresses/`, { locale, auth: "session" });
}

export function apiCreateAddress(locale: Locale, body: ApiAddressWrite, idempotencyKey: string) {
  return customerFetch<ApiAddress>(`${ME}/addresses/`, {
    method: "POST",
    locale,
    auth: "session",
    body,
    idempotencyKey,
  });
}

export function apiUpdateAddress(locale: Locale, id: number, body: Partial<ApiAddressWrite>) {
  return customerFetch<ApiAddress>(`${ME}/addresses/${id}/`, {
    method: "PATCH",
    locale,
    auth: "session",
    body,
  });
}

export function apiDeleteAddress(locale: Locale, id: number) {
  return customerFetch<undefined>(`${ME}/addresses/${id}/`, {
    method: "DELETE",
    locale,
    auth: "session",
  });
}

export function apiDefaultAddress(locale: Locale, id: number) {
  return customerFetch<ApiAddress>(`${ME}/addresses/${id}/default/`, {
    method: "POST",
    locale,
    auth: "session",
  });
}

/* --- sessions («Faol seanslar», B-W1) ------------------------------------ */

export function apiSessions(locale: Locale, page = 1) {
  return customerFetch<ApiSessionPage>(`${ME}/sessions/`, {
    locale,
    auth: "session",
    query: { page, page_size: 50 },
  });
}

export function apiRevokeSession(locale: Locale, id: string) {
  return customerFetch<undefined>(`${ME}/sessions/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    locale,
    auth: "session",
  });
}

export function apiRevokeOtherSessions(locale: Locale) {
  return customerFetch<ApiRevokedSessions>(`${ME}/sessions/revoke-others/`, {
    method: "POST",
    locale,
    auth: "session",
  });
}
