import { isApiError, type ApiError } from "../api/errors";

/**
 * The Uzbek text the login page or the account card shows when Django
 * refuses a social sign-in or link (contract §2.1). The backend's own
 * message wins wherever it is meaningful to the admin:
 * `social_account_not_allowed` ("Bu hisob administrator sifatida ro‘yxatdan
 * o‘tmagan."), `oauth_exchange_failed`, `provider_unavailable`, the two
 * `link/` conflicts, a 404 on a provider that is not linked. A field error
 * means this server sent a body Django does not accept (a `redirect_uri`
 * that differs from `OAUTH_REDIRECT_URI`, a missing nonce): the admin cannot
 * fix that, so it reads as a failed sign-in; the callback logs the details
 * (`oauthRefusalLog`, every refusal but a 401).
 */

export const OAUTH_FAILED_MESSAGE = "Ijtimoiy tarmoq orqali kirish amalga oshmadi.";
export const OAUTH_UNREACHABLE_MESSAGE = "API bilan bog‘lanib bo‘lmadi.";
export const OAUTH_UNEXPECTED_MESSAGE = "Kutilmagan xato.";

export function oauthErrorMessage(error: unknown): string {
  if (!isApiError(error)) return OAUTH_UNEXPECTED_MESSAGE;
  if (error.status === 0) return OAUTH_UNREACHABLE_MESSAGE;
  if (error.status === 429) {
    return error.retryAfter === undefined
      ? "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring."
      : `Juda ko‘p urinish. ${error.retryAfter} soniyadan so‘ng qayta urinib ko‘ring.`;
  }
  if (error.code === "validation_error") return OAUTH_FAILED_MESSAGE;
  // An answer without the contract's envelope (an edge page, a 502).
  if (error.code.startsWith("http_") || error.code === "invalid_json") {
    return error.status >= 500 ? OAUTH_UNREACHABLE_MESSAGE : OAUTH_FAILED_MESSAGE;
  }
  return error.body.message || OAUTH_FAILED_MESSAGE;
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
