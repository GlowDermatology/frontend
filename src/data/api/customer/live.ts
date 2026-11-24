import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { publicGet } from "./client";
import type {
  ApiCatalogFeed,
  ApiClinicList,
  ApiHome,
  ApiSpecialistAvailability,
} from "./live-types";

/**
 * The live landing's anonymous reads (`publicGet`: cacheable, no visitor
 * data). Read through `src/data/shop/live.ts`; every function throws
 * `ApiError` (a 404 means the backend does not serve the endpoint yet).
 */

export function apiHome(locale: Locale) {
  return publicGet<ApiHome>("/api/v1/home/", locale);
}

export function apiCatalogFeed(
  locale: Locale,
  query: { cursor?: string | null; category?: string | null },
) {
  return publicGet<ApiCatalogFeed>("/api/v1/catalog/feed/", locale, {
    cursor: query.cursor || undefined,
    category: query.category || undefined,
  });
}

export function apiSpecialistAvailability(locale: Locale, days = 7) {
  return publicGet<ApiSpecialistAvailability>("/api/v1/specialists/availability/", locale, {
    days,
  });
}

export function apiClinics(locale: Locale) {
  return publicGet<ApiClinicList>("/api/v1/clinics/", locale);
}
