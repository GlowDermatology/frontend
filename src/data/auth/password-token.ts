import type { CookieSink, SessionCookie } from "./cookies";

/**
 * The e-mailed password link (DESIGN §E): `{ADMIN_PANEL_URL}/set-password?token=…`. The proxy
 * moves the token out of the address bar into an HttpOnly cookie scoped to the page and answers a
 * 303 to the bare `/admin/set-password`, so the token is not left in the history, the address bar,
 * a screenshot or a `Referer`; the page reads it server-side (check) and the page's Server Action
 * sends it (set). Pure (no `server-only`, no Next imports): the proxy bundle uses it.
 */

export const SET_PASSWORD_PATH = "/admin/set-password";

/** `secrets.token_urlsafe(32)` is 43 characters; the backend accepts up to 128. */
export const PASSWORD_TOKEN_MAX_LENGTH = 128;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** Long enough to read the page and type a password twice; the link itself lives longer. */
export const PASSWORD_TOKEN_COOKIE_MAX_AGE = 2 * 60 * 60;

export function passwordTokenCookieName(secure: boolean): string {
  return `${secure ? "__Secure-" : ""}gd_password_token`;
}

/** A token as the backend issues it (base64url, 16–128 characters); anything else is dropped. */
export function isPasswordToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * The token cookie: HttpOnly, `Path=/admin/set-password` (only this page and its Server Action
 * see it) and `SameSite=Lax`, because the link arrives as a cross-site top-level GET from a mail
 * client and the 303 that stores it is followed in the same navigation.
 */
export function passwordTokenCookie(input: { secure: boolean; token: string }): SessionCookie {
  return {
    name: passwordTokenCookieName(input.secure),
    value: input.token,
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "lax",
      path: SET_PASSWORD_PATH,
      maxAge: PASSWORD_TOKEN_COOKIE_MAX_AGE,
    },
  };
}

/** Expires the token cookie (after the password was set, or when a malformed link arrives). */
export function clearPasswordTokenCookie(sink: CookieSink, secure: boolean): void {
  sink.set(passwordTokenCookieName(secure), "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: SET_PASSWORD_PATH,
    maxAge: 0,
  });
}

/** `?token=` of the link, else `null` (a token present but malformed reads as `""`). */
export function tokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has("token")) return null;
  const value = params.get("token") ?? "";
  return isPasswordToken(value) ? value : "";
}
