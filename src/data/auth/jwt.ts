/**
 * Reads the staff access JWT **without verifying it**. Django is the authority
 * on signatures and revocation: the Next server only needs `exp` (to know when
 * to refresh) and `sid` (for logging). Garbage input yields `null`.
 */

/** Seconds before `exp` at which the proxy sends the browser to the refresh route. */
export const REFRESH_LEAD_SECONDS = 60;

export interface AccessClaims {
  /** Expiry, seconds since the epoch. */
  exp: number;
  /** Session id (opaque). */
  sid: string | null;
  sub: string | null;
}

function decodeBase64Url(segment: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) return null;
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token: string | null | undefined): AccessClaims | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  const json = decodeBase64Url(parts[1]);
  if (json === null) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const { exp, sid, sub } = payload as Record<string, unknown>;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  return {
    exp,
    sid: typeof sid === "string" ? sid : null,
    sub: typeof sub === "string" ? sub : null,
  };
}

/** `exp` in milliseconds, or `null` when the token cannot be read. */
export function accessExpiresAtMs(token: string | null | undefined): number | null {
  const claims = decodeJwtPayload(token);
  return claims ? claims.exp * 1000 : null;
}

/**
 * Whether the token is usable for at least `leadSeconds` more seconds. With the
 * default lead of 0 this is a plain "not expired" check.
 */
export function isAccessLive(
  token: string | null | undefined,
  nowMs: number,
  leadSeconds = 0,
): boolean {
  const expiresAt = accessExpiresAtMs(token);
  return expiresAt !== null && expiresAt - leadSeconds * 1000 > nowMs;
}
