import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { publicGet } from "./client";
import type { ApiServiceList, ApiSpecialist, ApiSpecialistList } from "./types";

/**
 * Specialists and services (contract §2.11, public part). Slots and booking
 * (`specialists/{id}/slots/`, `appointments/`) live in `./commerce.ts`. Throws `ApiError`.
 */

export function apiSpecialists(locale: Locale) {
  return publicGet<ApiSpecialistList>("/api/v1/specialists/", locale);
}

/** `GET specialists/{id}/`; with B-W1 the same path also takes the slug. 404 when inactive. */
export function apiSpecialist(locale: Locale, idOrSlug: string) {
  return publicGet<ApiSpecialist>(`/api/v1/specialists/${encodeURIComponent(idOrSlug)}/`, locale);
}

export function apiServices(locale: Locale) {
  return publicGet<ApiServiceList>("/api/v1/services/", locale);
}
