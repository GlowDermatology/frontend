import { isApiError, type ApiError } from "../api/errors";
import { OAUTH_NOTICE_MAX_MESSAGE_LENGTH } from "./oauth";

/**
 * The Uzbek text the login page or the account card shows when Django
 * refuses a social sign-in or link (contract §2.1). The backend's own
 * message wins wherever it is meaningful to the admin:
 * `social_account_not_allowed` ("Bu hisob administrator sifatida ro‘yxatdan
 * o‘tmagan."), `oauth_exchange_failed`, `provider_unavailable`, the two
 * `link/` conflicts, a 404 on a provider that is not linked. A field error
 * means this server sent a body Django does not accept (a `redirect_uri`
 * that differs from the provider's `GOOGLE_OAUTH_REDIRECT_URI` /
 * `FACEBOOK_OAUTH_REDIRECT_URI`, a missing nonce): the admin cannot
 * fix that, so it reads as a failed sign-in; the callback logs the details
 * (`oauthRefusalLog`, every refusal but a 401). A message longer than a
 * notice can carry (`OAUTH_NOTICE_MAX_MESSAGE_LENGTH`) reads as a failed
 * sign-in too.
 */

export const OAUTH_FAILED_MESSAGE = "Ijtimoiy tarmoq orqali kirish amalga oshmadi.";
export const OAUTH_UNREACHABLE_MESSAGE = "API bilan bog‘lanib bo‘lmadi.";
export const OAUTH_UNEXPECTED_MESSAGE = "Kutilmagan xato.";
export const OAUTH_THROTTLED_MESSAGE = "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.";

export function oauthErrorMessage(error: unknown): string {
  if (!isApiError(error)) return OAUTH_UNEXPECTED_MESSAGE;
  if (error.status === 0) return OAUTH_UNREACHABLE_MESSAGE;
  if (error.status === 429) {
    return error.retryAfter === undefined
      ? OAUTH_THROTTLED_MESSAGE
      : `Juda ko‘p urinish. ${error.retryAfter} soniyadan so‘ng qayta urinib ko‘ring.`;
  }
  if (error.code === "validation_error") return OAUTH_FAILED_MESSAGE;
  // An answer without the contract's envelope (an edge page, a 502).
  if (error.code.startsWith("http_") || error.code === "invalid_json") {
    return error.status >= 500 ? OAUTH_UNREACHABLE_MESSAGE : OAUTH_FAILED_MESSAGE;
  }
  // A message the notice could not carry (`openNotice` drops it) would leave
  // the page without any error at all.
  const message = error.body.message;
  if (!message || message.length > OAUTH_NOTICE_MAX_MESSAGE_LENGTH) return OAUTH_FAILED_MESSAGE;
  return message;
}

/**
 * `POST auth/oauth/{provider}/link/` from a session that signed in socially
 * (or from before the backend recorded how a session signed in) is refused
 * with 403 `permission_denied` "Ruxsat yo‘q." before the provider is called
 * (contract §2.1, M2): only a password sign-in may attach an identity. The
 * backend's text does not say what to do, so the account card says it.
 */
export const OAUTH_LINK_NEEDS_PASSWORD_MESSAGE =
  "Ijtimoiy tarmoq orqali ochilgan sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.";

/** `oauthErrorMessage` for the link flow: a 403 asks for a password sign-in first. */
export function oauthLinkErrorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 403 && error.code === "permission_denied") {
    return OAUTH_LINK_NEEDS_PASSWORD_MESSAGE;
  }
  return oauthErrorMessage(error);
}

/**
 * What the callback logs about a refused exchange: provider-independent
 * diagnostics only (status, code, the field paths and codes of `errors[]`,
 * the request id) — never the authorization code or the PKCE verifier,
 * which are not part of the envelope.
 */
export function oauthRefusalLog(error: ApiError): {
  status: number;
  code: string;
  fields: string[];
  requestId: string;
} {
  return {
    status: error.status,
    code: error.code,
    fields: error.body.errors.map((item) => `${item.field ?? "-"}:${item.code}`),
    requestId: error.body.request_id,
  };
}
