import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { privatePathPrefixes } from "@/features/shop/routing/routes";

/**
 * Crawl rules: the admin panel, the BFF route handlers and every private
 * storefront page (cart, checkout, account, orders, sign-in, booking… in all
 * three languages) are disallowed; those pages also send `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", ...privatePathPrefixes()],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
