/**
 * Cookie names of the admin BFF session (spec "Frontend wiring › Auth").
 *
 * - `access`  — HttpOnly, Path=/admin, lifetime = access JWT TTL.
 * - `refresh` — HttpOnly, Path=/admin/auth: the browser sends it only to the
 *               refresh and logout route handlers, never to pages or actions.
 * - `csrf`    — readable double-submit token, Path=/admin. It cannot take the
 *               `__Host-` prefix because of the path, so the allowed-origins
 *               list is what protects it from sibling subdomains.
 * - `refreshBackoff` — short-lived marker that stops the proxy from bouncing
 *               to the refresh route again right after a transient failure.
 *
 * With `secure` (HTTPS deployments) the session cookies get the `__Secure-`
 * prefix, which browsers only accept over HTTPS with the Secure attribute.
 */
export function cookieNames(secure: boolean) {
  const prefix = secure ? "__Secure-" : "";
  return {
    access: `${prefix}gd_admin_access`,
    refresh: `${prefix}gd_admin_refresh`,
    csrf: "gd_csrf",
    refreshBackoff: "gd_refresh_backoff",
  } as const;
}

export type CookieNames = ReturnType<typeof cookieNames>;
