import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { shopHref, type QueryInput, type ShopRoute } from "../routing/routes";

/**
 * Metadata of every storefront page (pure; unit-tested): one unique title
 * and description, the canonical URL, hreflang alternates for uz/ru/en plus
 * `x-default` (Uzbek, the primary market), Open Graph and Twitter cards.
 * Private pages pass `noindex`.
 */

export const DESCRIPTION_MAX = 160;
const TITLE_SUFFIX = " | Glow Derma";

/** Cuts a description at a word boundary below `max` characters, with an ellipsis. */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  // Non-breaking spaces (inside prices: "185\u00a0000\u00a0so‘m") are kept.
  const flat = text.replace(/[^\S\u00a0]+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/u, "");
  return `${base}…`;
}

/** "Serum" → "Serum | Glow Derma"; a title that already names the brand is kept. */
export function pageTitle(title: string): string {
  return /glow derma/i.test(title) ? title : `${title}${TITLE_SUFFIX}`;
}

export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface ShopMetadataInput {
  locale: Locale;
  route: ShopRoute;
  title: string;
  description: string;
  /** Query kept in the canonical and alternates (only `page` on paginated lists). */
  query?: QueryInput;
  images?: ReadonlyArray<OgImage>;
  noindex?: boolean;
  /** Whether the page exists in every language (all storefront pages do). */
  alternates?: boolean;
  /** `og:type`; a product page says `product` (U14). */
  ogType?: "website" | "product" | "profile";
}

export function absoluteUrl(path: string): string {
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

/** hreflang map: every language's URL plus `x-default` → Uzbek. */
export function languageAlternates(route: ShopRoute, query?: QueryInput): Record<string, string> {
  const entries = LOCALES.map((locale) => [locale, shopHref(locale, route, query)] as const);
  return {
    ...Object.fromEntries(entries),
    "x-default": shopHref(DEFAULT_LOCALE, route, query),
  };
}

export function buildShopMetadata(input: ShopMetadataInput): Metadata {
  const title = pageTitle(input.title);
  const description = clampDescription(input.description);
  const canonical = shopHref(input.locale, input.route, input.query);
  const images = input.images?.map((image) => ({ ...image }));
  return {
    metadataBase: new URL(siteConfig.url),
    title: { absolute: title },
    description,
    applicationName: siteConfig.name,
    alternates: {
      canonical,
      languages:
        input.alternates === false ? undefined : languageAlternates(input.route, input.query),
    },
    robots: input.noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      // Next validates og:type against its own list, which has no "product":
      // a product page leaves it out here and sends it through `other`.
      ...(input.ogType === "product" ? {} : { type: input.ogType ?? "website" }),
      siteName: siteConfig.name,
      title,
      description,
      url: canonical,
      locale: LOCALE_INFO[input.locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== input.locale).map(
        (l) => LOCALE_INFO[l].ogLocale,
      ),
      images,
    },
    twitter: {
      card: images && images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((image) => image.url),
    },
    formatDetection: { telephone: false },
    // `<meta name="og:type">`: Open Graph parsers read `name` as well as `property`.
    ...(input.ogType === "product" ? { other: { "og:type": "product" } } : {}),
  };
}
