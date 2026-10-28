import type { ShopCategory, ShopProductCard, ShopSpecialist } from "@/domain/shop";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n/locales";

import { alternatePaths, type ShopRoute } from "../routing/routes";

/**
 * Sitemap XML (pure; unit-tested). `/sitemap.xml` is an index of one file
 * per type and language (`/sitemaps/products-ru.xml`), each URL with its
 * hreflang alternates and, where the API provides `updated_at`, `lastmod`.
 */

export const SITEMAP_TYPES = ["pages", "categories", "products", "specialists"] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];

export interface SitemapEntry {
  route: ShopRoute;
  lastmod?: string | null;
  image?: string | null;
}

export function parseSitemapName(name: string): { type: SitemapType; locale: Locale } | null {
  const match = /^([a-z]+)-([a-z]{2})\.xml$/.exec(name);
  if (!match) return null;
  const [, type, locale] = match;
  if (!(SITEMAP_TYPES as ReadonlyArray<string>).includes(type!) || !isLocale(locale)) return null;
  return { type: type as SitemapType, locale };
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : new Date(at).toISOString();
}

export function sitemapIndexXml(origin: string, lastmod?: string): string {
  const items = SITEMAP_TYPES.flatMap((type) =>
    LOCALES.map(
      (locale) =>
        `<sitemap><loc>${escapeXml(`${origin}/sitemaps/${type}-${locale}.xml`)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }</sitemap>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join("")}</sitemapindex>\n`;
}

/** `locales`: one sitemap per language, or several listed together (mock mode's landing). */
export function urlsetXml(
  origin: string,
  locales: Locale | ReadonlyArray<Locale>,
  entries: ReadonlyArray<SitemapEntry>,
): string {
  const list: ReadonlyArray<Locale> = typeof locales === "string" ? [locales] : locales;
  const abs = (path: string) => (path === "/" ? origin : `${origin}${path}`);
  const urls = list.flatMap((locale) =>
    entries.map((entry) => {
      const paths = alternatePaths(entry.route);
      const links = [
        ...LOCALES.map(
          (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(abs(paths[l]))}"/>`,
        ),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(abs(paths.uz))}"/>`,
      ].join("");
      const lastmod = isoDate(entry.lastmod);
      const image = entry.image
        ? `<image:image><image:loc>${escapeXml(entry.image)}</image:loc></image:image>`
        : "";
      return `<url><loc>${escapeXml(abs(paths[locale]))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${links}${image}</url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join("")}</urlset>\n`;
}

export function pageEntries(): SitemapEntry[] {
  return (
    ["home", "catalog", "specialists", "services", "terms", "privacy", "bookingPolicy"] as const
  ).map((kind) => ({ route: { kind } }));
}

export function categoryEntries(categories: ReadonlyArray<ShopCategory>): SitemapEntry[] {
  return categories.map((category) => ({
    route: { kind: "category", slug: category.slug },
    lastmod: category.updatedAt,
    image: category.imageUrl,
  }));
}

export function productEntries(products: ReadonlyArray<ShopProductCard>): SitemapEntry[] {
  return products.map((product) => ({
    route: { kind: "product", slug: product.segment },
    lastmod: product.updatedAt,
    image: product.imageUrl,
  }));
}

export function specialistEntries(specialists: ReadonlyArray<ShopSpecialist>): SitemapEntry[] {
  return specialists.map((specialist) => ({
    route: { kind: "specialist", slug: specialist.segment },
    lastmod: specialist.updatedAt,
    image: specialist.photoUrl,
  }));
}
