import { cookieNames } from "@/data/auth/cookie-names";

/**
 * The readable `gd_csrf` double-submit cookie, minted by `src/proxy.ts` on
 * admin GETs. Every Server Action receives it as its last argument and
 * compares it in constant time against the cookie (`verifyStaff({ csrf })`).
 * Returns `""` outside a browser or when the cookie is absent; the action then
 * fails with `code: "csrf"` and asks for a reload.
 */
export function readCsrfCookie(cookieString: string | undefined = readDocumentCookie()): string {
  if (!cookieString) return "";
  const name = cookieNames(false).csrf;
  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return safeDecode(trimmed.slice(name.length + 1));
    }
  }
  return "";
}

function readDocumentCookie(): string | undefined {
  return typeof document === "undefined" ? undefined : document.cookie;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
