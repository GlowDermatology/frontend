import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";

import { LOCALE_INFO, LOCALES, getDictionary, localePath, type Locale } from "./i18n";

/** Alternate URLs for every language plus `x-default` (Uzbek, the primary market). */
export function languageAlternates(): Record<string, string> {
  const entries = LOCALES.map((locale) => [locale, localePath(locale)] as const);
  return { ...Object.fromEntries(entries), "x-default": localePath("uz") };
}

export function buildLandingMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  const path = localePath(locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: siteConfig.name,
    alternates: {
      canonical: path,
      languages: languageAlternates(),
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: dict.meta.title,
      description: dict.meta.description,
      url: path,
      locale: LOCALE_INFO[locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_INFO[l].ogLocale),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: dict.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
      images: ["/og.png"],
    },
    formatDetection: { telephone: false },
  };
}

export const landingViewport: Viewport = {
  themeColor: "#fbf8f2",
  colorScheme: "light",
};
