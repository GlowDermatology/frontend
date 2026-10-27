import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Double-submit CSRF token: a per-session random value kept in the readable
 * `gd_csrf` cookie and presented back by every Server Action (as an argument)
 * and every POST route handler (`X-CSRF-Token` header or `csrf` form field).
 */

/** 32 random bytes, base64url (43 characters). */
export function mintCsrf(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Constant-time comparison of the cookie value with the presented token. Both
 * must be non-empty strings of equal length; `timingSafeEqual` throws on
 * different lengths, so that case is answered first (length is not secret).
 */
export function csrfMatches(cookieValue: unknown, presented: unknown): boolean {
  if (typeof cookieValue !== "string" || typeof presented !== "string") return false;
  if (cookieValue.length === 0 || presented.length === 0) return false;
  const a = Buffer.from(cookieValue, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
