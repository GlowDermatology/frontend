/**
 * Cookies of the customer (storefront) BFF session — separate names from the
 * admin session (`src/data/auth/cookie-names.ts`), so a staff member who also
 * shops keeps both sessions apart.
 *
 * Every cookie is `SameSite=Lax` and `Path=/`: the storefront spans `/`,
 * `/ru` and `/en`, and Lax lets a customer arriving from a search result or a
 * payment provider's redirect (a cross-site top-level GET) keep their
 * session. Mutations are protected by the double-submit `csrf` token and the
 * allowed-origins check, not by SameSite.
 *
 * - `access`   — HttpOnly, the customer access JWT (15 min, contract §1.2).
 * - `refresh`  — HttpOnly, the rotating refresh token (60 days sliding,
 *                §2.1.6); read by the refresh and logout route handlers and
 *                by the session DAL, never exposed to scripts.
 * - `csrf`     — readable double-submit token.
 * - `deviceId` — HttpOnly, long-lived (400 days, the browser maximum): this
 *                browser's `X-GD-Device-Id` (an identifier, not a secret,
 *                §1.2/§6.8). Minted by the proxy on the first private page.
 * - `deviceKey`— HttpOnly, long-lived: the `device_key` from `AuthTokens`
 *                (§1.9), sent as `X-GD-Device-Key` on `auth/login/` only, so a
 *                known browser skips the SMS step. A secret.
 * - `signedIn` — readable hint `1` while a session exists, so the static
 *                header can show "Hisob" instead of "Kirish" without
 *                rendering per request. Never trusted on the server.
 * - `refreshBackoff` — short marker that stops the proxy from bouncing to
 *                the refresh route again right after a transient failure.
 *
 * With `secure` (HTTPS) the HttpOnly session cookies get the `__Secure-`
 * prefix, which browsers accept only over HTTPS with the Secure attribute.
 */
export function customerCookieNames(secure: boolean) {
  const prefix = secure ? "__Secure-" : "";
  return {
    access: `${prefix}gd_cust_access`,
    refresh: `${prefix}gd_cust_refresh`,
    csrf: "gd_cust_csrf",
    deviceId: `${prefix}gd_dev_id`,
    deviceKey: `${prefix}gd_dev_key`,
    signedIn: "gd_cust_in",
    refreshBackoff: "gd_cust_refresh_backoff",
  } as const;
}

export type CustomerCookieNames = ReturnType<typeof customerCookieNames>;
