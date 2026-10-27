import type { Route } from "next";

import type { Locale } from "@/lib/i18n/locales";
import { parseShopPath, shopPath } from "@/features/shop/routing/routes";

/**
 * Validation of the `next` parameter of the customer refresh route, the
 * sign-in page and the logout route: only a relative storefront path is
 * accepted (`/`, `/ru/products/x?y=1`), so a crafted link can never bounce a
 * customer off-site or into the admin panel. Anything else becomes the home
 * page of `fallbackLocale`.
 */

const MAX_LENGTH = 2048;
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

export function safeShopNext(value: unknown, fallbackLocale: Locale = "uz"): Route {
  const fallback = shopPath(fallbackLocale, { kind: "home" });
  const input = Array.isArray(value) ? value[0] : value;
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_LENGTH) {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f-\u009f\\]/.test(input)) return fallback;
  if (!input.startsWith("/") || input.startsWith("//")) return fallback;
  let encoded: string;
  try {
    // Header-safe: everything outside printable ASCII (and `"`) percent-encoded.
    encoded = input.replace(/[^\x21-\x7e]|"/gu, (char) => encodeURIComponent(char));
  } catch {
    return fallback;
  }
  if (encoded.length > MAX_LENGTH) return fallback;
  const withoutFragment = encoded.split("#")[0] ?? "";
  const queryStart = withoutFragment.indexOf("?");
  const path = queryStart === -1 ? withoutFragment : withoutFragment.slice(0, queryStart);
  if (path.split("/").some((segment) => DOT_SEGMENT.test(segment))) return fallback;
  const parsed = parseShopPath(path);
  // The sign-in page itself is never a destination after signing in.
  if (!parsed || parsed.route.kind === "signIn") return fallback;
  return withoutFragment as Route;
}
