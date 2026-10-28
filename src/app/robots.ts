import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Crawl rules: only the admin panel and the BFF route handlers are
 * disallowed. The private storefront pages (cart, checkout, account, orders,
 * sign-in…) send `noindex` instead: a crawler must be allowed to fetch them
 * to see it, and a disallowed URL linked from elsewhere could still be
 * indexed without its content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
