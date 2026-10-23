/**
 * Site-wide settings. Values the business has not provided yet are left
 * undefined; the UI then falls back to the in-page anchors used in the design,
 * so nothing links to an invented destination.
 */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Glow Derma",
  /** Absolute origin used for canonical URLs, hreflang and Open Graph. */
  url: resolveSiteUrl(),
  links: {
    appStore: undefined as string | undefined,
    googlePlay: undefined as string | undefined,
    telegram: undefined as string | undefined,
    instagram: undefined as string | undefined,
    phone: undefined as string | undefined,
    privacyPolicy: undefined as string | undefined,
    termsOfUse: undefined as string | undefined,
  },
} as const;

/** In-page anchors (section ids) shared by navigation and sections. */
export const SECTION_IDS = {
  top: "top",
  main: "asosiy",
  catalog: "katalog",
  cashback: "cashback",
  qr: "qr",
  specialists: "mutaxassislar",
  delivery: "yetkazib-berish",
  download: "yuklab-olish",
} as const;
