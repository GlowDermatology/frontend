import type { Metadata } from "next";
import { Suspense } from "react";

import { storefrontEnabled } from "@/data/shop/mode";
import { LandingPage } from "@/features/landing/landing-page";
import { buildLandingMetadata } from "@/features/landing/metadata";
import type { Locale } from "@/lib/i18n/locales";

import { ShopChrome } from "../components/shop-chrome";
import { ShopHome, homeMetadata } from "./home";

/**
 * `/`, `/ru`, `/en`: the live storefront in api mode, the static marketing
 * landing in mock mode (the storefront has no fixtures). The choice reads
 * `GLOWDERMA_DATA_SOURCE` per request (`connection()`), so one build serves
 * both modes; the landing is still fully server-rendered, inside this
 * page's dynamic hole.
 */
async function Switch({ locale }: { locale: Locale }) {
  if (!(await storefrontEnabled())) return <LandingPage locale={locale} />;
  return (
    <ShopChrome locale={locale}>
      <ShopHome locale={locale} />
    </ShopChrome>
  );
}

export function HomeSwitch({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="min-h-dvh bg-surface" />}>
      <Switch locale={locale} />
    </Suspense>
  );
}

export async function homeSwitchMetadata(locale: Locale): Promise<Metadata> {
  return (await storefrontEnabled()) ? homeMetadata(locale) : buildLandingMetadata(locale);
}
