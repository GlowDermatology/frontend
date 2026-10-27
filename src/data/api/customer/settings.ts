import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { publicGet } from "./client";
import type { ApiPublicSettings } from "./types";

/** `GET settings/public/` (contract §2.4): contacts, legal texts, what can be sold online. */
export function apiPublicSettings(locale: Locale) {
  return publicGet<ApiPublicSettings>("/api/v1/settings/public/", locale);
}
