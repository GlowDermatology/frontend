"use client";

import { useParams } from "next/navigation";

import { ShopErrorPage } from "@/features/shop/components/shop-error";

/** Branded "try again" for the Russian and English home pages. */
export default function IntlError({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useParams<{ locale: string }>();
  return <ShopErrorPage locale={locale === "ru" ? "ru" : "en"} reset={reset} />;
}
