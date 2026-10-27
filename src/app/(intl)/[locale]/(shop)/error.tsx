"use client";

import { useParams } from "next/navigation";

import { ShopError } from "@/features/shop/components/shop-error";

export default function IntlShopError({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useParams<{ locale: string }>();
  return <ShopError locale={locale === "ru" ? "ru" : "en"} reset={reset} />;
}
