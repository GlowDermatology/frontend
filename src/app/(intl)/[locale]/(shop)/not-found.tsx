"use client";

import { useParams } from "next/navigation";

import { ShopNotFound } from "@/features/shop/pages/errors";

export default function IntlShopNotFound() {
  const { locale } = useParams<{ locale: string }>();
  return <ShopNotFound locale={locale === "ru" ? "ru" : "en"} />;
}
