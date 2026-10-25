import type { NextConfig } from "next";

import { parseAllowedOrigins } from "./src/lib/origins";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * `GLOWDERMA_MEDIA_HOSTS`: comma-separated `host[:port]` entries that
 * `next/image` may optimise (Django's `PUBLIC_MEDIA_BASE_URL`). Empty → none.
 */
function mediaRemotePatterns(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hostname, port] = entry.split(":");
      if (!hostname) throw new Error(`GLOWDERMA_MEDIA_HOSTS: invalid entry "${entry}"`);
      return port ? { hostname, port } : { hostname };
    });
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
    return [{ source: "/uz", destination: "/", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
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
