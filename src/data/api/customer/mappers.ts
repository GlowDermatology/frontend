import { isPaymentProvider } from "@/domain/order";
import type {
  ContentLanguage,
  ShopBanner,
  ShopBannerLink,
  ShopCategory,
  ShopLocation,
  ShopPage,
  ShopProduct,
  ShopProductCard,
  ShopRendition,
  ShopRenditions,
  ShopService,
  ShopSettings,
  ShopSpecialist,
} from "@/domain/shop";

import { isAllowedMediaUrl } from "../media";
import type {
  ApiClinic,
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

/**
 * An image variant URL (spec 2026-11-13-image-variants) under the same host rule as the original; `fallback`
 * (the original) when the API sends none (a backend from before the variants).
 */
export function variant(
  value: unknown,
  fallback: string | null,
  mediaHosts: ReadonlyArray<string>,
): string | null {
  return value === undefined || value === null ? fallback : optimizable(value, mediaHosts);
}

/** `content_language` (feat/customer-web); anything else, or missing, is `null`. */
export function contentLanguageOf(value: unknown): ContentLanguage | null {
  return value === "uz" || value === "ru" || value === "en" ? value : null;
}

/**
 * One screen shape (`{url, medium_url, thumbnail_url}`, backend 0bcf0a5) under the media-host
 * rule: the full-size URL must be one `next/image` may load, a variant the API leaves out falls
 * back to it, and a variant from another host drops the whole shape. Anything else (`null`, an
 * older API without the key) is "no shape": the surface shows the photo itself.
 */
export function rendition(value: unknown, mediaHosts: ReadonlyArray<string>): ShopRendition | null {
  if (typeof value !== "object" || value === null) return null;
  const shape = value as Record<string, unknown>;
  const url = optimizable(shape.url, mediaHosts);
  if (!url) return null;
  const medium = variant(shape.medium_url, url, mediaHosts);
  const thumb = variant(shape.thumbnail_url, url, mediaHosts);
  return medium && thumb ? { url, medium, thumb } : null;
}

/** `renditions` / `main_image_renditions` → both shapes, each `null` when absent or unusable. */
export function renditions(value: unknown, mediaHosts: ReadonlyArray<string>): ShopRenditions {
  const shapes =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    portrait: rendition(shapes.portrait, mediaHosts),
    square: rendition(shapes.square, mediaHosts),
  };
}

function productImages(
  api: ApiCustomerProductCard,
  mediaHosts: ReadonlyArray<string>,
): Pick<ShopProductCard, "image" | "imageThumb" | "imageMedium"> {
  const image = optimizable(api.main_image_url, mediaHosts);
  return {
    image,
    imageThumb: variant(api.main_image_thumbnail_url, image, mediaHosts),
    imageMedium: variant(api.main_image_medium_url, image, mediaHosts),
  };
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
    ...productImages(api, mediaHosts),
    imageUrl: absoluteUrl(api.main_image_url),
    renditions: renditions(api.main_image_renditions, mediaHosts),
    available,
    inStock: api.stock_status === "in_stock" && available > 0,
    brand: optionalText(api.brand),
    sku: optionalText(api.sku),
    contentLanguage: contentLanguageOf(api.content_language),
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
      if (!url) return [];
      const optimised = optimizable(url, mediaHosts);
      return [
        {
          id: image.id,
          image: optimised,
          url,
          thumb: variant(image.thumbnail_url, optimised, mediaHosts),
          alt: text(image.alt),
          renditions: renditions(image.renditions, mediaHosts),
        },
      ];
    });
  return {
    ...mapProductCard(api, mediaHosts),
    shortDescription: text(api.short_description),
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
    imageMedium: variant(api.image_medium_url, optimizable(api.image_url, mediaHosts), mediaHosts),
    imageUrl: absoluteUrl(api.image_url),
    productCount: Math.max(0, Math.trunc(api.product_count)),
    description: optionalText(api.description),
    seoTitle: optionalText(api.seo_title),
    seoDescription: optionalText(api.seo_description),
    contentLanguage: contentLanguageOf(api.content_language),
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

export function mapShopLocation(api: ApiClinic): ShopLocation {
  return {
    id: api.id,
    name: text(api.name),
    address: text(api.address),
    directions: text(api.directions),
    phone: optionalText(api.phone),
    latitude: typeof api.latitude === "number" ? api.latitude : null,
    longitude: typeof api.longitude === "number" ? api.longitude : null,
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
    photoThumb: variant(
      api.photo_thumbnail_url,
      optimizable(api.photo_url, mediaHosts),
      mediaHosts,
    ),
    photoUrl: absoluteUrl(api.photo_url),
    bio: text(api.bio),
    qualifications: text(api.qualifications),
    experienceYears:
      typeof api.experience_years === "number" && api.experience_years >= 0
        ? api.experience_years
        : null,
    locations: api.locations.map(mapShopLocation),
    services: (api.services ?? []).map((service) => ({
      id: service.id,
      name: text(service.name),
      shortName: text(service.short_name) || text(service.name),
      durationMin: service.duration_min,
      price: service.price,
    })),
    contentLanguage: contentLanguageOf(api.content_language),
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
    // Older API answers have no `delivery` block: no Yandex, BTS as `fulfilment_methods` says.
    deliveryProviders: [
      ...new Set(
        (api.delivery?.providers ?? []).filter(
          (provider): provider is "yandex" | "bts" => provider === "yandex" || provider === "bts",
        ),
      ),
    ],
    // Providers this build does not know yet are dropped (the backend lists them in its order).
    paymentProviders: [...new Set((api.payment_providers ?? []).filter(isPaymentProvider))],
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
