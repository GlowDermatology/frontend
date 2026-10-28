import { connection } from "next/server";

import { siteConfig } from "@/config/site";
import { LOCALES } from "@/lib/i18n/locales";
import { storefrontEnabled } from "@/data/shop/mode";
import { sitemapIndexXml, urlsetXml } from "@/features/shop/seo/sitemap";

/**
 * `/sitemap.xml`. Api mode: an index of per-type, per-language sitemaps
 * (`/sitemaps/{pages|categories|products|specialists}-{uz|ru|en}.xml`).
 * Mock mode: the landing's three home pages, as before the storefront.
 */
export async function GET() {
  await connection();
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=600",
  };
  if (!(await storefrontEnabled())) {
    return new Response(
      urlsetXml(siteConfig.url, LOCALES, [
        { route: { kind: "home" }, lastmod: "2026-10-23T00:00:00+05:00" },
      ]),
      { headers },
    );
  }
  return new Response(sitemapIndexXml(siteConfig.url), { headers });
}
