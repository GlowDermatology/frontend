import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { LOCALES, localePath } from "@/features/landing/i18n";

/** Fixed date keeps the sitemap static; bump it when landing content changes. */
const LAST_MODIFIED = new Date("2026-10-23T00:00:00+05:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const absolute = (path: string) => `${siteConfig.url}${path === "/" ? "" : path}`;
  const languages = Object.fromEntries(LOCALES.map((l) => [l, absolute(localePath(l))]));
  return LOCALES.map((locale) => ({
    url: absolute(localePath(locale)),
    lastModified: LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: locale === "uz" ? 1 : 0.8,
    alternates: { languages },
  }));
}
