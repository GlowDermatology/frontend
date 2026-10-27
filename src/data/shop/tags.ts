/**
 * Cache tags of the storefront's `"use cache"` reads, and the mapping from a
 * change in the backend or the admin ("product 12 saved") to the tags it
 * invalidates. The revalidation route (`POST /api/revalidate`) accepts
 * either form. Pure; unit-tested.
 *
 * Every tag is language-independent: one product change refreshes its uz, ru
 * and en pages together.
 */

export const shopTags = {
  /** Every product list and card (catalog, category pages, home, related, sitemaps). */
  products: "shop:products",
  product: (id: number | string) => `shop:product:${id}`,
  categories: "shop:categories",
  banners: "shop:banners",
  specialists: "shop:specialists",
  specialist: (id: number | string) => `shop:specialist:${id}`,
  services: "shop:services",
  settings: "shop:settings",
} as const;

export type ShopEntity = "product" | "category" | "banner" | "specialist" | "service" | "settings";

const ENTITIES: ReadonlyArray<ShopEntity> = [
  "product",
  "category",
  "banner",
  "specialist",
  "service",
  "settings",
];

const TAG =
  /^shop:(?:products|categories|banners|specialists|services|settings|product:\d{1,12}|specialist:\d{1,12})$/;

export function isShopTag(value: unknown): value is string {
  return typeof value === "string" && TAG.test(value);
}

/**
 * Tags a change of one entity invalidates. Lists embed what they list
 * (a product card shows its category's name; a specialist page lists the
 * services), so a change reaches every cached read that shows it.
 */
export function tagsForEntity(type: ShopEntity, id?: number): string[] {
  switch (type) {
    case "product":
      return id === undefined ? [shopTags.products] : [shopTags.products, shopTags.product(id)];
    case "category":
      // Category names and visibility appear on every product card and page.
      return [shopTags.categories, shopTags.products];
    case "banner":
      return [shopTags.banners];
    case "specialist":
      return id === undefined
        ? [shopTags.specialists, shopTags.services]
        : [shopTags.specialists, shopTags.specialist(id), shopTags.services];
    case "service":
      return [shopTags.services, shopTags.specialists];
    case "settings":
      return [shopTags.settings];
  }
}

export type RevalidationRequest = { ok: true; tags: string[] } | { ok: false; error: string };

const MAX_ITEMS = 100;

/**
 * Body of `POST /api/revalidate`:
 * `{"tags": ["shop:product:12"]}` and/or
 * `{"entities": [{"type": "product", "id": 12}, {"type": "settings"}]}`.
 * Unknown tags, types or malformed ids are refused as a whole (400), so a
 * typo on the caller's side is visible instead of silently doing nothing.
 */
export function parseRevalidationRequest(body: unknown): RevalidationRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const record = body as Record<string, unknown>;
  const tags = new Set<string>();

  if (record.tags !== undefined) {
    if (!Array.isArray(record.tags) || record.tags.length > MAX_ITEMS) {
      return { ok: false, error: "tags must be an array of at most 100 strings" };
    }
    for (const tag of record.tags) {
      if (!isShopTag(tag)) return { ok: false, error: `unknown tag: ${String(tag).slice(0, 80)}` };
      tags.add(tag);
    }
  }

  if (record.entities !== undefined) {
    if (!Array.isArray(record.entities) || record.entities.length > MAX_ITEMS) {
      return { ok: false, error: "entities must be an array of at most 100 objects" };
    }
    for (const entity of record.entities) {
      if (typeof entity !== "object" || entity === null) {
        return { ok: false, error: "each entity must be an object" };
      }
      const { type, id } = entity as Record<string, unknown>;
      if (!ENTITIES.includes(type as ShopEntity)) {
        return { ok: false, error: `unknown entity type: ${String(type).slice(0, 40)}` };
      }
      if (id !== undefined && id !== null && !(Number.isSafeInteger(id) && (id as number) > 0)) {
        return { ok: false, error: "entity id must be a positive integer" };
      }
      for (const tag of tagsForEntity(type as ShopEntity, (id as number | null) ?? undefined)) {
        tags.add(tag);
      }
    }
  }

  if (tags.size === 0) return { ok: false, error: "nothing to revalidate" };
  return { ok: true, tags: [...tags] };
}
