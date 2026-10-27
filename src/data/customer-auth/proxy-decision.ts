import { REFRESH_LEAD_SECONDS, isAccessLive } from "@/data/auth/jwt";
import { isNumericId, isPrivateRoute, parseShopPath } from "@/features/shop/routing/routes";

import { safeShopNext } from "./next-param";

/**
 * Pure decision behind the storefront half of `src/proxy.ts` (no Next
 * imports, unit-tested per branch).
 *
 * - Public pages are anonymous and cacheable: the proxy sets no cookie on
 *   them for a visitor who only browses (no tracking cookie), mints the csrf
 *   token for a signed-in customer who lacks one, and turns a legacy numeric
 *   id URL (`/mahsulotlar/12`) into a 301 to the slug.
 * - Private pages (cart, checkout, account, orders, sign-in, booking…) get
 *   the long-lived device id and the csrf token minted when missing, and a
 *   GET whose access cookie is missing or about to lapse — while a refresh
 *   cookie exists — is bounced to the single-flight refresh route first.
 * - Anything else (POSTs, Server Actions, route handlers, assets) passes
 *   untouched: Server Actions verify the session themselves.
 */

export const SHOP_REFRESH_PATH = "/api/shop/auth/refresh";

export interface ShopProxyInput {
  method: string;
  pathname: string;
  search: string;
  mode: "mock" | "api";
  accessToken: string | undefined;
  hasRefresh: boolean;
  hasBackoff: boolean;
  hasCsrf: boolean;
  hasDeviceId: boolean;
  nowMs: number;
}

export type ShopProxyDecision =
  | { kind: "pass"; mintDeviceId: boolean; mintCsrf: boolean }
  | { kind: "refresh"; location: string; mintDeviceId: boolean; mintCsrf: boolean }
  | {
      /** A slug page (api mode): the proxy checks the entity exists, else a real 404. */
      kind: "check-slug";
      entity: "product" | "specialist" | "category";
      slug: string;
      locale: "uz" | "ru" | "en";
      mintCsrf: boolean;
    }
  | {
      kind: "legacy-id";
      entity: "product" | "specialist";
      id: string;
      locale: "uz" | "ru" | "en";
    };

const PASS: ShopProxyDecision = { kind: "pass", mintDeviceId: false, mintCsrf: false };

export function decideShopProxy(input: ShopProxyInput): ShopProxyDecision {
  if (input.method !== "GET" && input.method !== "HEAD") return PASS;
  const parsed = parseShopPath(input.pathname);
  if (!parsed) return PASS;
  const { route, locale } = parsed;

  if (!isPrivateRoute(route)) {
    if (
      input.mode === "api" &&
      (route.kind === "product" || route.kind === "specialist") &&
      isNumericId(route.slug)
    ) {
      return { kind: "legacy-id", entity: route.kind, id: route.slug, locale };
    }
    if (
      input.mode === "api" &&
      (route.kind === "product" || route.kind === "specialist" || route.kind === "category")
    ) {
      return {
        kind: "check-slug",
        entity: route.kind,
        slug: route.slug,
        locale,
        mintCsrf: input.hasRefresh && !input.hasCsrf,
      };
    }
    // A signed-in customer on a public page (add to cart, "book") needs the
    // csrf token for the island's Server Action; anonymous visitors get none.
    return { kind: "pass", mintDeviceId: false, mintCsrf: input.hasRefresh && !input.hasCsrf };
  }

  const mintDeviceId = !input.hasDeviceId;
  const mintCsrf = !input.hasCsrf;
  if (
    input.mode === "api" &&
    input.hasRefresh &&
    !input.hasBackoff &&
    !isAccessLive(input.accessToken, input.nowMs, REFRESH_LEAD_SECONDS)
  ) {
    const next = safeShopNext(input.pathname + input.search, locale);
    return {
      kind: "refresh",
      location: `${SHOP_REFRESH_PATH}?next=${encodeURIComponent(next)}`,
      mintDeviceId,
      mintCsrf,
    };
  }
  return { kind: "pass", mintDeviceId, mintCsrf };
}
