import type { NextConfig } from "next";

import { mapTileOrigins } from "./src/lib/map-tiles";
import { mediaRemotePatterns } from "./src/lib/media-hosts";
import { parseAllowedOrigins } from "./src/lib/origins";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** Storefront pages override the header above (the later match wins). */
const STOREFRONT_PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(self)";

/**
 * Content-Security-Policy of the storefront pages (everything but /admin).
 * Partial Prerendering serves a static shell, so per-request nonces (and
 * `'strict-dynamic'`) are not possible: scripts are limited to this origin
 * plus the social sign-in SDKs, with `'unsafe-inline'` for Next's inline
 * RSC payload; no `eval` outside development, no plugins, no framing, forms
 * post only here. Images load through `/_next/image` (same origin), except
 * the address map's tiles: exactly the origin(s) of `NEXT_PUBLIC_MAP_TILE_URL`
 * (OpenStreetMap by default), parsed by the same helper the map uses.
 */
function storefrontCsp(dev: boolean): string {
  const tiles = mapTileOrigins(process.env.NEXT_PUBLIC_MAP_TILE_URL);
  const sdk = {
    script: [
      "https://accounts.google.com",
      "https://connect.facebook.net",
      "https://appleid.cdn-apple.com",
    ],
    frame: ["https://accounts.google.com", "https://*.facebook.com", "https://appleid.apple.com"],
    connect: [
      "https://accounts.google.com",
      "https://*.facebook.com",
      "https://graph.facebook.com",
      "https://appleid.apple.com",
    ],
  };
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} ${sdk.script.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    `img-src 'self' data: blob: https://*.googleusercontent.com https://*.fbcdn.net https://*.facebook.com ${tiles.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${sdk.connect.join(" ")}${dev ? " ws: wss:" : ""}`,
    `frame-src ${sdk.frame.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Next's default HTML-limited bots (metadata blocks the render instead of
 * streaming into <body>) plus the link-preview crawlers common in
 * Uzbekistan (Telegram) and the search engines that render JavaScript only
 * partially (Yandex, Bing, Baidu), so every crawler gets <title>, canonical,
 * hreflang and Open Graph in the <head> of the first response.
 */
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Viber|Pinterest|SemrushBot|AhrefsBot|PetalBot|Mail\.RU_Bot/i;

const nextConfig: NextConfig = {
  // Self-contained server (`.next/standalone/server.js`) for the Docker image.
  // It embeds this config as evaluated by `next build`, so every
  // process.env read in this file is a build-time value (Docker build args).
  output: "standalone",
  // Version-skew protection across releases: a browser holding pages from
  // the previous image gets a hard navigation instead of "Failed to find
  // Server Action". The commit SHA comes from the Docker build arg.
  deploymentId: process.env.GLOWDERMA_BUILD_SHA || undefined,
  cacheComponents: true,
  partialPrefetching: true,
  // Storefront `"use cache"` lifetimes (src/data/shop/catalog.ts); staff
  // changes reach the pages earlier through tags (POST /api/revalidate).
  cacheLife: {
    // Products, categories, banners: prices and stock move during the day.
    catalog: { stale: 60, revalidate: 300, expire: 86_400 },
    // Specialists, services, settings and legal texts.
    content: { stale: 300, revalidate: 3_600, expire: 604_800 },
    // The live home (`home/`, free slots, clinics open now): the API caches them 60 s.
    live: { stale: 30, revalidate: 60, expire: 3_600 },
    // The discover feed's cursor pages: the API caches them 30 s.
    feed: { stale: 30, revalidate: 30, expire: 3_600 },
  },
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // The OG image routes read the vendored Cormorant WOFF files at runtime.
  outputFileTracingIncludes: {
    "/og/**": ["./src/features/shop/og/fonts/*"],
  },
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    remotePatterns: mediaRemotePatterns(process.env.GLOWDERMA_MEDIA_HOSTS),
    // The optimizer refuses upstream hosts that resolve to a private IP
    // (SSRF guard). Local development talks to Django on localhost, so the
    // guard is lifted only when GLOWDERMA_MEDIA_ALLOW_LOCAL=true is set
    // explicitly; production media hosts are public and never need it.
    dangerouslyAllowLocalIP: process.env.GLOWDERMA_MEDIA_ALLOW_LOCAL === "true",
  },
  experimental: {
    // Revalidated pages stay in memory: the container's root filesystem is read-only (only .next/cache is a
    // tmpfs), and one replica serves each environment. A restart regenerates them from the build's prerenders.
    isrFlushToDisk: false,
    // Branded 404 for unmatched URLs: the app has three root layouts
    // (Uzbek landing, /ru and /en, admin), so there is no single layout to
    // compose a global not-found page from.
    globalNotFound: true,
    serverActions: {
      // Product images: up to 5 MB per file plus multipart overhead.
      bodySizeLimit: "6mb",
      // Exact host[:port] entries only (shared parser, wildcards rejected):
      // together with SameSite=Strict cookies and the gd_csrf double-submit
      // token this is the CSRF boundary of every Server Action.
      allowedOrigins: parseAllowedOrigins(process.env.GLOWDERMA_ALLOWED_ORIGINS),
    },
  },
  async redirects() {
    // Uzbek is the default language and lives at `/`.
    return [
      { source: "/uz", destination: "/", permanent: true },
      // The payment return URL (backend PAYMENT_WEB_RETURN_URL) keeps the Uzbek
      // word for every language: `/ru/buyurtmalar/{id}?paid=1` → `/ru/orders/{id}?paid=1`.
      {
        source: "/:locale(ru|en)/buyurtmalar/:id",
        destination: "/:locale/orders/:id",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Storefront pages only: the admin panel keeps its own headers.
        source: "/((?!admin(?:/|$)|_next/static|_next/image).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: storefrontCsp(process.env.NODE_ENV === "development"),
          },
          // "Joylashuvimni aniqlash" in the address form: geolocation for this
          // origin only (no frames); the admin panel keeps `geolocation=()`.
          { key: "Permissions-Policy", value: STOREFRONT_PERMISSIONS_POLICY },
        ],
      },
      // Streamed (partially prerendered) responses must reach the browser
      // chunk by chunk; nginx honours this header and stops buffering.
      { source: "/:path*", headers: [{ key: "X-Accel-Buffering", value: "no" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // The e-mailed password link page (DESIGN §E): no Referer to anything it loads or links
      // (the proxy sets the same on its answers and on the redirect that strips the token).
      {
        source: "/admin/set-password",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
