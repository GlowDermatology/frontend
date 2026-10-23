import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/features/landing/i18n";
import { LandingPage } from "@/features/landing/landing-page";
import { buildLandingMetadata } from "@/features/landing/metadata";

export const ensureStatic = "navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) && locale !== "uz" ? buildLandingMetadata(locale) : {};
}

export default async function LocalizedHomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  // `/uz` is redirected to `/` in next.config.ts; anything else is unknown.
  if (!isLocale(locale) || locale === "uz") notFound();
  return <LandingPage locale={locale} />;
}
