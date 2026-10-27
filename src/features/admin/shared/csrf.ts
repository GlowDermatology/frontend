import { cookieNames } from "@/data/auth/cookie-names";
import { documentCookie, readCookie } from "@/lib/actions/action-client";

/**
 * The readable `gd_csrf` double-submit cookie, minted by `src/proxy.ts` on
 * admin GETs. Every Server Action receives it as its last argument and
 * compares it in constant time against the cookie (`verifyStaff({ csrf })`).
 * Returns `""` outside a browser or when the cookie is absent; the action then
 * fails with `code: "csrf"` and asks for a reload.
 */
export function readCsrfCookie(cookieString: string | undefined = documentCookie()): string {
  return readCookie(cookieNames(false).csrf, cookieString);
}
