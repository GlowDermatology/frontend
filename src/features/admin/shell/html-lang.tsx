"use client";

import { useLayoutEffect } from "react";

import type { Locale } from "@/lib/i18n/locales";

/**
 * Keeps `<html lang>` on the admin language after client-side changes: the head script of
 * `app/admin/layout.tsx` sets it on a full load, this effect after a language switch (the route
 * refreshes with the new locale, the document stays) and after React's development remount resets
 * the attributes of `<html>`. Renders nothing.
 */
export function HtmlLang({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    if (document.documentElement.lang !== locale) document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
