import type {
  ShopBanner,
  ShopBannerLink,
  ShopCategory,
  ShopPage,
  ShopProduct,
  ShopProductCard,
  ShopService,
  ShopSettings,
  ShopSpecialist,
} from "@/domain/shop";

import { isAllowedMediaUrl } from "../media";
import type {
  ApiCustomerBanner,
  ApiCustomerCategory,
  ApiCustomerProductCard,
  ApiCustomerProductDetail,
  ApiCustomerProductPage,
  ApiPublicSettings,
  ApiServiceOffer,
  ApiSpecialist,
} from "./types";

/**
 * Customer API → storefront view models (pure; unit-tested). Every reader is
 * defensive about the fields backend B-W1 adds (`slug`, `updated_at`,
 * `seo_*`): absent, `null` or blank means "not provided".
 */

/** A slug usable as one URL segment (lower-case words, digits and hyphens, not purely numeric). */
const SLUG = /^(?!\d+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isUsableSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && SLUG.test(value);
}

/** URL segment of an entity: its slug, or its id until the API sends slugs. */
export function segmentOf(slug: unknown, id: number): { segment: string; hasSlug: boolean } {
  return isUsableSlug(slug)
    ? { segment: slug, hasSlug: true }
    : { segment: String(id), hasSlug: false };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed.length > 0 ? trimmed : null;
}

function isoOrNull(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** An absolute http(s) URL as sent by the API, else `null`. */
export function absoluteUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The URL when `next/image` may optimise it (its host is in `GLOWDERMA_MEDIA_HOSTS`). */
export function optimizable(value: unknown, mediaHosts: ReadonlyArray<string>): string | null {
  const url = absoluteUrl(value);
  return url && isAllowedMediaUrl(url, mediaHosts) ? url : null;
}

export function mapProductCard(
  api: ApiCustomerProductCard,
  mediaHosts: ReadonlyArray<string>,
): ShopProductCard {
  const available = Math.max(0, Math.trunc(Number(api.available) || 0));
  return {
    id: api.id,
    ...segmentOf(api.slug, api.id),
    name: text(api.name),
    volume: text(api.volume),
    price: Math.max(0, Math.trunc(api.price)),
    promo: Boolean(api.promo),
    category: api.category ? { slug: api.category.slug, name: text(api.category.name) } : null,
    image: optimizable(api.main_image_url, mediaHosts),
    imageUrl: absoluteUrl(api.main_image_url),
    available,
    inStock: api.stock_status === "in_stock" && available > 0,
    brand: optionalText(api.brand),
    sku: optionalText(api.sku),
    oldPrice:
      typeof api.old_price === "number" && api.old_price > api.price
        ? Math.trunc(api.old_price)
        : null,
    updatedAt: isoOrNull(api.updated_at),
  };
}

export function mapProduct(
  api: ApiCustomerProductDetail,
  mediaHosts: ReadonlyArray<string>,
): ShopProduct {
  const images = [...(api.images ?? [])]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .flatMap((image) => {
      const url = absoluteUrl(image.url);
      return url ? [{ id: image.id, image: optimizable(url, mediaHosts), url }] : [];
    });
  return {
    ...mapProductCard(api, mediaHosts),
    description: text(api.description),
    ingredients: text(api.ingredients),
    usage: text(api.usage),
    images,
    maxQuantity: Math.max(0, Math.trunc(Number(api.max_quantity) || 0)),
    seoTitle: optionalText(api.seo_title),
    seoDescription: optionalText(api.seo_description),
  };
}

export function mapProductPage(
  api: ApiCustomerProductPage,
  mediaHosts: ReadonlyArray<string>,
): ShopPage<ShopProductCard> {
  return {
    items: api.results.map((item) => mapProductCard(item, mediaHosts)),
    total: api.count,
    page: api.page,
    pageCount: Math.max(1, api.page_count),
    pageSize: api.page_size,
  };
}

export function mapCategory(
  api: ApiCustomerCategory,
  mediaHosts: ReadonlyArray<string>,
): ShopCategory {
  return {
    slug: api.slug,
    name: text(api.name),
    image: optimizable(api.image_url, mediaHosts),
    imageUrl: absoluteUrl(api.image_url),
    productCount: Math.max(0, Math.trunc(api.product_count)),
    description: optionalText(api.description),
    seoTitle: optionalText(api.seo_title),
    seoDescription: optionalText(api.seo_description),
    updatedAt: isoOrNull(api.updated_at),
  };
}

function mapBannerLink(link: ApiCustomerBanner["link"]): ShopBannerLink {
  if (link.kind === "product" && typeof link.product_id === "number") {
    return { kind: "product", productId: link.product_id };
  }
  if (link.kind === "category" && isUsableCategorySlug(link.category)) {
    return { kind: "category", slug: link.category };
  }
  if (link.kind === "url") {
    const url = absoluteUrl(link.url);
    // Contract §2.5: always https; anything else is not followed.
    if (url && url.startsWith("https://")) return { kind: "url", url };
  }
  return { kind: "none" };
}

function isUsableCategorySlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
}

export function mapBanner(api: ApiCustomerBanner, mediaHosts: ReadonlyArray<string>): ShopBanner {
  return {
    id: api.id,
    title: text(api.title),
    image: optimizable(api.image_url, mediaHosts),
    width: api.image_width > 0 ? api.image_width : 1200,
    height: api.image_height > 0 ? api.image_height : 600,
    link: mapBannerLink(api.link),
  };
}

export function mapSpecialist(
  api: ApiSpecialist,
  mediaHosts: ReadonlyArray<string>,
): ShopSpecialist {
  return {
    id: api.id,
    ...segmentOf(api.slug, api.id),
    name: text(api.name),
    role: api.role,
    roleLabel: text(api.role_label),
    photo: optimizable(api.photo_url, mediaHosts),
    photoUrl: absoluteUrl(api.photo_url),
    bio: text(api.bio),
    qualifications: text(api.qualifications),
    experienceYears:
      typeof api.experience_years === "number" && api.experience_years >= 0
        ? api.experience_years
        : null,
    location: {
      name: text(api.location?.name),
      address: text(api.location?.address),
      phone: optionalText(api.location?.phone),
      latitude: typeof api.location?.latitude === "number" ? api.location.latitude : null,
      longitude: typeof api.location?.longitude === "number" ? api.location.longitude : null,
    },
    services: (api.services ?? []).map((service) => ({
      id: service.id,
      name: text(service.name),
      shortName: text(service.short_name) || text(service.name),
      durationMin: service.duration_min,
      price: service.price,
    })),
    updatedAt: isoOrNull(api.updated_at),
  };
}

export function mapService(api: ApiServiceOffer): ShopService {
  return {
    id: api.id,
    name: text(api.name),
    shortName: text(api.short_name) || text(api.name),
    description: text(api.description),
    category: api.category,
    categoryLabel: text(api.category_label),
    durationMin: api.duration_min,
    priceFrom: api.price_from,
    priceTo: Math.max(api.price_to, api.price_from),
    specialistIds: api.specialist_ids ?? [],
  };
}

export function mapSettings(api: ApiPublicSettings): ShopSettings {
  return {
    supportPhone: optionalText(api.support_phone),
    storePhone: optionalText(api.store_phone),
    cosmetologistPhone: optionalText(api.cosmetologist_phone),
    telegramUrl: httpsOrNull(api.telegram_url),
    instagramUrl: httpsOrNull(api.instagram_url),
    websiteUrl: httpsOrNull(api.website_url),
    pickupAddress: text(api.pickup_address),
    terms: text(api.terms),
    privacyPolicy: text(api.privacy_policy),
    bookingPolicy: text(api.booking_policy),
    termsVersion: optionalText(api.terms_version),
    termsUpdatedAt: isoOrNull(api.terms_updated_at),
    onlineSalesEnabled: Boolean(api.online_sales_enabled),
    fulfilmentMethods: (api.fulfilment_methods ?? []).filter(
      (method): method is "delivery" | "pickup" => method === "delivery" || method === "pickup",
    ),
    paymentProviders: (api.payment_providers ?? []).filter(
      (provider): provider is "click" | "payme" => provider === "click" || provider === "payme",
    ),
    storeUrls: {
      ios: httpsOrNull(api.store_urls?.ios),
      android: httpsOrNull(api.store_urls?.android),
    },
  };
}

function httpsOrNull(value: unknown): string | null {
  const url = absoluteUrl(value);
  return url && url.startsWith("https://") ? url : null;
}
