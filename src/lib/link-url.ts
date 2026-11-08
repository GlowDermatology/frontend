/**
 * Client-side checks of the `https` links the admin types (contract §1.4
 * "Link URLs"). They mirror the server's rules closely enough to catch typos
 * before the round trip; the server stays the authority and its field errors
 * are shown as they come.
 */

export const LINK_URL_MESSAGE = "Havolani https:// bilan to‘liq kiriting.";

/** Banner and campaign destinations (§1.4): ≤500. */
export const LINK_URL_MAX = 500;

/** Whitespace, the characters the server refuses, and every control or format character. */
const FORBIDDEN = /[\s"<>`\\\p{Cc}\p{Cf}]/u;

/**
 * An absolute `https` URL without credentials and with no port other than
 * 443; the scheme is matched case-insensitively (the server stores it
 * lower-cased). `publicHost` also refuses an IP literal and a single-label
 * host such as `localhost`.
 */
export function isHttpsUrl(value: string, options: { publicHost?: boolean } = {}): boolean {
  if (FORBIDDEN.test(value)) return false;
  if (!/^https:\/\//i.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || !url.hostname) return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  if (options.publicHost) {
    const host = url.hostname;
    if (host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
    if (!host.includes(".")) return false;
  }
  return true;
}
