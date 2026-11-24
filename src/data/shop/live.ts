import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  apiCatalogFeed,
  apiClinics,
  apiHome,
  apiSpecialistAvailability,
} from "@/data/api/customer/live";
import {
  feedCursorOf,
  mapAvailability,
  mapClinics,
  mapFeedPage,
  mapHome,
} from "@/data/api/customer/live-mappers";
import { isApiError } from "@/data/api/errors";
import type { ShopAvailability, ShopClinic, ShopFeedPage, ShopHome } from "@/domain/shop-live";
import { serverEnv } from "@/lib/env.server";
import type { Locale } from "@/lib/i18n/locales";

import { shopTags } from "./tags";

/**
 * The live landing's reads, `"use cache"` scopes like `./catalog.ts`: one
 * anonymous API answer serves every visitor of a language until its
 * `cacheLife` (`live` 60 s, `feed` 30 s, next.config.ts) runs out or a tag
 * is revalidated. Product-bearing reads carry `shop:products`, so a product
 * edit reaches the spotlight, rails and feed at once.
 *
 * These endpoints are newer than the rest of the customer API: a 404 (a
 * backend that does not serve them yet) is a value, `null`, cached like any
 * answer, and the page hides or replaces the section. Any other failure
 * throws (not cached); the section's `settle()` turns it into the same
 * fallback.
 *
 * Callers must first check `storefrontEnabled()` (api mode).
 */

function hosts(): string[] {
  return serverEnv.mediaHosts();
}

function isNotFound(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

async function orNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function getHome(locale: Locale): Promise<ShopHome | null> {
  "use cache";
  cacheLife("live");
  cacheTag(shopTags.home, shopTags.products, shopTags.settings);
  return orNull(async () => mapHome((await apiHome(locale)).data, hosts()));
}

/** Categories are URL-safe slugs; anything else is not sent (the API would answer 400). */
export function feedCategoryOf(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value) ? value : null;
}

/** One cursor page of the discover feed (24 cards), optionally inside one category. */
export async function getFeedPage(
  locale: Locale,
  cursor: string | null,
  category: string | null,
): Promise<ShopFeedPage | null> {
  "use cache";
  cacheLife("feed");
  cacheTag(shopTags.products, shopTags.categories);
  return orNull(async () =>
    mapFeedPage(
      (
        await apiCatalogFeed(locale, {
          cursor: feedCursorOf(cursor),
          category: feedCategoryOf(category),
        })
      ).data,
      hosts(),
    ),
  );
}

export async function getAvailability(locale: Locale): Promise<ShopAvailability | null> {
  "use cache";
  cacheLife("live");
  cacheTag(shopTags.availability, shopTags.specialists);
  return orNull(async () => mapAvailability((await apiSpecialistAvailability(locale, 7)).data));
}

export async function getClinics(locale: Locale): Promise<ShopClinic[] | null> {
  "use cache";
  cacheLife("live");
  cacheTag(shopTags.clinics, shopTags.specialists);
  return orNull(async () => mapClinics((await apiClinics(locale)).data));
}
