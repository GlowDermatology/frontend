import "../../globals.css";

import { PREFIXED_LOCALES, isLocale } from "@/features/landing/i18n";
import { landingViewport } from "@/features/landing/metadata";
import { SiteDocument } from "@/features/landing/site-document";

export const viewport = landingViewport;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

/**
 * Root layout for `/ru` and `/en`; `locale` is a root param, so `<html lang>`
 * stays static. Unknown values still get a valid document here: the page
 * calls `notFound()`, which a root layout could not render itself.
 */
export default async function LocaleRootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  return <SiteDocument locale={isLocale(locale) ? locale : "en"}>{children}</SiteDocument>;
}
