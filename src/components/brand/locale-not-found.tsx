"use client";

import { useParams } from "next/navigation";

import { isLocale } from "@/lib/i18n/locales";

import { NotFoundView } from "./not-found-view";

/** The branded 404 of the `/ru` and `/en` pages, in the language of the URL. */
export function LocaleNotFoundView() {
  const { locale } = useParams<{ locale?: string }>();
  return <NotFoundView locale={isLocale(locale) ? locale : undefined} />;
}
