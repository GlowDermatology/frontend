import type { Route } from "next";

import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Localized storefront URLs (one source of truth for links, the language
 * switcher, canonical/hreflang URLs, the sitemaps, robots and the proxy).
 *
 * Uzbek lives at the root with Uzbek words (`/mahsulotlar/{slug}`), Russian
 * and English under their prefix with English words (`/ru/products/{slug}`),
 * so one slug serves every language and hreflang pairs are 1:1. Pure and
 * framework-free apart from the `Route` type; unit-tested.
 */

/** Public, indexable pages (W3a). */
export type PublicRoute =
  | { kind: "home" }
  | { kind: "catalog" }
  | { kind: "category"; slug: string }
  | { kind: "product"; slug: string }
  | { kind: "specialists" }
  | { kind: "specialist"; slug: string }
  | { kind: "services" }
  | { kind: "terms" }
  | { kind: "privacy" }
  | { kind: "bookingPolicy" };

/**
 * Private pages (noindex, never cached, session cookies). W3a ships
 * placeholders for `cart`, `signIn` and `booking` (the targets of the
 * add-to-cart, account and "book" seams); W3b adds the rest.
 */
export type PrivateRoute =
  | { kind: "cart" }
  | { kind: "checkout" }
  | { kind: "signIn" }
  | { kind: "account" }
  | { kind: "orders" }
  | { kind: "order"; slug: string }
  | { kind: "booking" }
  | { kind: "appointments" }
  | { kind: "cashback" }
  | { kind: "inbox" };

export type ShopRoute = PublicRoute | PrivateRoute;
export type ShopRouteKind = ShopRoute["kind"];

type StaticKind = Exclude<ShopRouteKind, "home">;

/** First path segment of each route per locale family. */
const SEGMENTS: Record<"uz" | "intl", Record<StaticKind, string>> = {
  uz: {
    catalog: "katalog",
    category: "kategoriyalar",
    product: "mahsulotlar",
    specialists: "mutaxassislar",
    specialist: "mutaxassislar",
    services: "xizmatlar",
    terms: "shartlar",
    privacy: "maxfiylik",
    bookingPolicy: "qabul-qoidalari",
    cart: "savat",
    checkout: "rasmiylashtirish",
    signIn: "kirish",
    account: "hisob",
    orders: "buyurtmalar",
    order: "buyurtmalar",
    booking: "qabulga-yozilish",
    appointments: "qabullarim",
    cashback: "cashback",
    inbox: "xabarlar",
  },
  intl: {
    catalog: "catalog",
    category: "categories",
    product: "products",
    specialists: "specialists",
    specialist: "specialists",
    services: "services",
    terms: "terms",
    privacy: "privacy",
    bookingPolicy: "booking-policy",
    cart: "cart",
    checkout: "checkout",
    signIn: "sign-in",
    account: "account",
    orders: "orders",
    order: "orders",
    booking: "book",
    appointments: "appointments",
    cashback: "cashback",
    inbox: "inbox",
  },
};

/** Routes that take a second segment (`{slug}` or an id). */
const WITH_SLUG = new Set<ShopRouteKind>(["category", "product", "specialist", "order"]);

/** List routes that share their first segment with a detail route. */
const LIST_OF: Partial<Record<ShopRouteKind, ShopRouteKind>> = {
  specialist: "specialists",
  order: "orders",
};

export const PRIVATE_KINDS: ReadonlySet<ShopRouteKind> = new Set<ShopRouteKind>([
  "cart",
  "checkout",
  "signIn",
  "account",
  "orders",
  "order",
  "booking",
  "appointments",
  "cashback",
  "inbox",
]);

export function isPrivateRoute(route: ShopRoute): route is PrivateRoute {
  return PRIVATE_KINDS.has(route.kind);
}

function family(locale: Locale): "uz" | "intl" {
  return locale === "uz" ? "uz" : "intl";
}

function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** A slug segment as it may appear in a path (percent-encoded, never empty). */
function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

/** Path (no origin, no query) of a route in a language. */
export function shopPath(locale: Locale, route: ShopRoute): Route {
  if (route.kind === "home") return (prefix(locale) || "/") as Route;
  const first = SEGMENTS[family(locale)][route.kind];
  const base = `${prefix(locale)}/${first}`;
  if ("slug" in route) return `${base}/${encodeSegment(route.slug)}` as Route;
  return base as Route;
}

export type QueryInput = Record<string, string | number | boolean | null | undefined>;

/** `shopPath` plus a query string; empty, `null`, `undefined` and `false` values are left out. */
export function shopHref(locale: Locale, route: ShopRoute, query?: QueryInput): Route {
  const path = shopPath(locale, route);
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, value === true ? "1" : String(value));
  }
  const search = params.toString();
  return (search ? `${path}?${search}` : path) as Route;
}

export interface ParsedShopPath {
  locale: Locale;
  route: ShopRoute;
}

function decodeSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > 0 && decoded.length <= 200 ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * The storefront route of a pathname, or `null` when it is not one (admin,
 * API routes, assets, unknown words, too many segments). A trailing slash is
 * ignored.
 */
export function parseShopPath(pathname: string): ParsedShopPath | null {
  const segments = pathname.split("/").filter(Boolean);
  let locale: Locale = DEFAULT_LOCALE;
  const first = segments[0];
  if (first !== undefined && first !== DEFAULT_LOCALE && isLocale(first)) {
    locale = first;
    segments.shift();
  }
  if (segments.length === 0) return { locale, route: { kind: "home" } };
  if (segments.length > 2) return null;

  const [head, tail] = segments as [string, string | undefined];
  const table = SEGMENTS[family(locale)];
  const kinds = (Object.keys(table) as StaticKind[]).filter((kind) => table[kind] === head);
  if (kinds.length === 0) return null;

  if (tail === undefined) {
    const kind = kinds.find((candidate) => !WITH_SLUG.has(candidate));
    if (!kind) return null;
    return { locale, route: { kind } as ShopRoute };
  }
  const kind = kinds.find((candidate) => WITH_SLUG.has(candidate));
  const slug = decodeSegment(tail);
  if (!kind || slug === null) return null;
  return { locale, route: { kind, slug } as ShopRoute };
}

/** The list page a detail route belongs to (`specialist` → `specialists`). */
export function listKindOf(kind: ShopRouteKind): ShopRouteKind | undefined {
  return LIST_OF[kind];
}

/**
 * The same page in another language: `/mahsulotlar/x` ↔ `/ru/products/x`.
 * Unknown paths fall back to that language's home page.
 */
export function equivalentPath(pathname: string, target: Locale): Route {
  const parsed = parseShopPath(pathname);
  return shopPath(target, parsed ? parsed.route : { kind: "home" });
}

/** Every language's path for one route (hreflang alternates, sitemaps). */
export function alternatePaths(route: ShopRoute): Record<Locale, Route> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, shopPath(locale, route)])) as Record<
    Locale,
    Route
  >;
}

/** First segments of every private route in every language, for robots.txt. */
export function privatePathPrefixes(): string[] {
  const out = new Set<string>();
  for (const locale of LOCALES) {
    for (const kind of PRIVATE_KINDS) {
      const route = (WITH_SLUG.has(kind) ? { kind, slug: "x" } : { kind }) as ShopRoute;
      const path = shopPath(locale, route);
      out.add(WITH_SLUG.has(kind) ? path.slice(0, path.lastIndexOf("/")) : path);
    }
  }
  return [...out].sort();
}

/** Whether a slug parameter is a legacy numeric id (`/mahsulotlar/12` → 301 to the slug). */
export function isNumericId(segment: string): boolean {
  return /^[1-9]\d{0,9}$/.test(segment);
}
