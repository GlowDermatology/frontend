import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomeSwitch, homeSwitchMetadata } from "@/features/shop/pages/home-switch";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) && locale !== "uz" ? homeSwitchMetadata(locale) : {};
}

/** `/ru`, `/en`: the storefront home in api mode, the static landing in mock mode. */
export default async function LocalizedHomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  // `/uz` is redirected to `/` in next.config.ts; anything else is unknown.
  if (!isLocale(locale) || locale === "uz") notFound();
  return <HomeSwitch locale={locale} />;
}
