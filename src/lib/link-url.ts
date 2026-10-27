/**
 * Client-side checks of the `https` links the admin types (contract §1.4
 * "Link URLs", §2.11 contact links). They mirror the server's rules closely
 * enough to catch typos before the round trip; the server stays the
 * authority and its field errors are shown as they come.
 */

export const LINK_URL_MESSAGE = "Havolani https:// bilan to‘liq kiriting.";

/** Banner and campaign destinations (§1.4): ≤500. */
export const LINK_URL_MAX = 500;
/** Telegram / Instagram / website links of the settings (§2.11): ≤200. */
export const CONTACT_URL_MAX = 200;

/** Whitespace, the characters the server refuses, and every control or format character. */
const FORBIDDEN = /[\s"<>`\\\p{Cc}\p{Cf}]/u;

/**
 * An absolute `https` URL without credentials and with no port other than
 * 443; the scheme is matched case-insensitively (the server stores it
 * lower-cased). `publicHost` also refuses an IP literal and a single-label
 * host such as `localhost` (the contact links of §2.11).
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

/** The host part, lower-cased, without `www.`; `null` for a value that is not a URL. */
function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const HANDLE = /^\/(\+?[A-Za-z0-9_.]{1,64})\/?$/;

/** A path of one account handle (`/name`, `/name/`, an invite `/+code`), not only dots. */
function oneHandle(value: string): boolean {
  let path: string;
  try {
    path = new URL(value).pathname;
  } catch {
    return false;
  }
  const match = HANDLE.exec(path);
  return Boolean(match && !/^\+?\.+$/.test(match[1]!));
}

export const TELEGRAM_URL_MESSAGE = "Telegram havolasi https://t.me/… ko‘rinishida bo‘lsin.";
export const INSTAGRAM_URL_MESSAGE =
  "Instagram havolasi https://instagram.com/… ko‘rinishida bo‘lsin.";

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "www.telegram.me"]);
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

/**
 * The message for a contact link of the settings (§2.11), or `null` when it
 * passes: `""` clears the link; the generic https message first, then the
 * Telegram / Instagram account rule.
 */
export function contactUrlError(
  value: string,
  kind: "telegram" | "instagram" | "website",
): string | null {
  if (value === "") return null;
  if (value.length > CONTACT_URL_MAX) return `${CONTACT_URL_MAX} belgidan oshmasin.`;
  if (!isHttpsUrl(value, { publicHost: true })) return LINK_URL_MESSAGE;
  if (kind === "website") return null;
  const host = hostOf(value);
  const hosts = kind === "telegram" ? TELEGRAM_HOSTS : INSTAGRAM_HOSTS;
  if (!host || !hosts.has(host) || !oneHandle(value)) {
    return kind === "telegram" ? TELEGRAM_URL_MESSAGE : INSTAGRAM_URL_MESSAGE;
  }
  return null;
}
