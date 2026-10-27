import { describe, expect, it } from "vitest";

import { parseRevalidationRequest, tagsForEntity } from "@/data/shop/tags";

import { buildCustomerHeaders, sanitizeUserAgent } from "./client";
import {
  mapBanner,
  mapCategory,
  mapProduct,
  mapProductCard,
  mapService,
  mapSettings,
  mapSpecialist,
  segmentOf,
} from "./mappers";
import type {
  ApiCustomerBanner,
  ApiCustomerProductCard,
  ApiCustomerProductDetail,
  ApiPublicSettings,
  ApiSpecialist,
} from "./types";

const HOSTS = ["media.glowderma.uz"];

describe("buildCustomerHeaders", () => {
  it("sends the secret, the language and nothing personal for public reads", () => {
    const headers = buildCustomerHeaders({ secret: "s3cret", locale: "ru" });
    expect(Object.fromEntries(headers.entries())).toEqual({
      accept: "application/json",
      "accept-language": "ru",
      "x-gd-internal-secret": "s3cret",
    });
  });

  it("forwards the visitor and the device for request-bound calls", () => {
    const headers = buildCustomerHeaders({
      secret: "s",
      locale: "uz",
      clientIp: "203.0.113.7",
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130",
      device: { id: "web_abcdefghijklmnopqrstuv", key: "k".repeat(43) },
      accessToken: "jwt",
      idempotencyKey: "0d7f4b0c-5a5e-4f0e-9a43-6c1e9b2f8a11",
      json: true,
    });
    expect(headers.get("x-gd-client-ip")).toBe("203.0.113.7");
    expect(headers.get("x-gd-client-ua")).toBe("Mozilla/5.0 (Windows NT 10.0) Chrome/130");
    expect(headers.get("x-gd-platform")).toBe("web");
    expect(headers.get("x-gd-device-id")).toBe("web_abcdefghijklmnopqrstuv");
    expect(headers.get("x-gd-device-key")).toBe("k".repeat(43));
    expect(headers.get("authorization")).toBe("Bearer jwt");
    expect(headers.get("idempotency-key")).toBe("0d7f4b0c-5a5e-4f0e-9a43-6c1e9b2f8a11");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("drops a malformed device id or key instead of sending it", () => {
    const headers = buildCustomerHeaders({
      secret: "s",
      locale: "uz",
      device: { id: "bad id", key: "short" },
    });
    expect(headers.has("x-gd-platform")).toBe(false);
    expect(headers.has("x-gd-device-id")).toBe(false);
    const keyless = buildCustomerHeaders({
      secret: "s",
      locale: "uz",
      device: { id: "web_abcdefghijklmnopqrstuv", key: "short" },
    });
    expect(keyless.get("x-gd-device-id")).toBe("web_abcdefghijklmnopqrstuv");
    expect(keyless.has("x-gd-device-key")).toBe(false);
  });

  it("sanitizes and bounds the forwarded user agent", () => {
    expect(sanitizeUserAgent("A\nB\u0000C")).toBe("ABC");
    expect(sanitizeUserAgent("x".repeat(2000))).toHaveLength(512);
    expect(sanitizeUserAgent("")).toBeUndefined();
    expect(sanitizeUserAgent(null)).toBeUndefined();
  });
});

const card: ApiCustomerProductCard = {
  id: 1,
  name: " Gialuron kislotali serum ",
  volume: "30 ml",
  price: 185000,
  promo: false,
  category: { slug: "serums", name: "Serumlar" },
  main_image_url: "https://media.glowderma.uz/products/1/a.webp",
  available: 12,
  stock_status: "in_stock",
  in_cart_quantity: 0,
};

describe("mapProductCard", () => {
  it("keeps an old price only when it is above the current one", () => {
    expect(mapProductCard({ ...card, promo: true, old_price: 220000 }, HOSTS).oldPrice).toBe(
      220000,
    );
    expect(mapProductCard({ ...card, old_price: 100 }, HOSTS).oldPrice).toBeNull();
    expect(mapProductCard(card, HOSTS).oldPrice).toBeNull();
  });

  it("maps an M2 card (no slug yet): the id is the URL segment", () => {
    expect(mapProductCard(card, HOSTS)).toEqual({
      id: 1,
      segment: "1",
      hasSlug: false,
      name: "Gialuron kislotali serum",
      volume: "30 ml",
      price: 185000,
      promo: false,
      category: { slug: "serums", name: "Serumlar" },
      image: "https://media.glowderma.uz/products/1/a.webp",
      imageUrl: "https://media.glowderma.uz/products/1/a.webp",
      available: 12,
      inStock: true,
      brand: null,
      sku: null,
      oldPrice: null,
      updatedAt: null,
    });
  });

  it("uses B-W1's slug and updated_at when present", () => {
    const mapped = mapProductCard(
      { ...card, slug: "gialuron-serum", updated_at: "2026-10-20T10:00:00+05:00" },
      HOSTS,
    );
    expect(mapped.segment).toBe("gialuron-serum");
    expect(mapped.hasSlug).toBe(true);
    expect(mapped.updatedAt).toBe("2026-10-20T10:00:00+05:00");
  });

  it("keeps an image from another host for metadata but not for next/image", () => {
    const mapped = mapProductCard(
      { ...card, main_image_url: "https://cdn.other.uz/a.webp" },
      HOSTS,
    );
    expect(mapped.image).toBeNull();
    expect(mapped.imageUrl).toBe("https://cdn.other.uz/a.webp");
    expect(
      mapProductCard({ ...card, main_image_url: "javascript:alert(1)" }, HOSTS).imageUrl,
    ).toBeNull();
  });

  it("is out of stock when the status says so or nothing is available", () => {
    expect(mapProductCard({ ...card, stock_status: "out_of_stock" }, HOSTS).inStock).toBe(false);
    expect(mapProductCard({ ...card, available: 0 }, HOSTS).inStock).toBe(false);
  });
});

describe("segmentOf", () => {
  it("accepts kebab-case slugs only, never a purely numeric one", () => {
    expect(segmentOf("spf-50-krem", 4)).toEqual({ segment: "spf-50-krem", hasSlug: true });
    expect(segmentOf("123", 4)).toEqual({ segment: "4", hasSlug: false });
    expect(segmentOf("Bad Slug", 4)).toEqual({ segment: "4", hasSlug: false });
    expect(segmentOf("", 4)).toEqual({ segment: "4", hasSlug: false });
    expect(segmentOf(null, 4)).toEqual({ segment: "4", hasSlug: false });
  });
});

describe("mapProduct", () => {
  it("orders the gallery and reads the optional SEO fields", () => {
    const detail: ApiCustomerProductDetail = {
      ...card,
      description: "Namlik",
      ingredients: "",
      usage: " Kuniga 2 marta ",
      images: [
        { id: 9, url: "https://media.glowderma.uz/b.webp", position: 1 },
        { id: 8, url: "https://media.glowderma.uz/a.webp", position: 0 },
        { id: 7, url: "not a url", position: 2 },
      ],
      max_quantity: 10,
      seo_title: "  ",
      seo_description: "Eng yaxshi serum",
    };
    const mapped = mapProduct(detail, HOSTS);
    expect(mapped.images.map((image) => image.id)).toEqual([8, 9]);
    expect(mapped.usage).toBe("Kuniga 2 marta");
    expect(mapped.seoTitle).toBeNull();
    expect(mapped.seoDescription).toBe("Eng yaxshi serum");
    expect(mapped.maxQuantity).toBe(10);
  });
});

describe("mapCategory / mapBanner", () => {
  it("maps a category with its optional fields", () => {
    expect(
      mapCategory({ slug: "serums", name: "Serumlar", image_url: null, product_count: 20 }, HOSTS),
    ).toMatchObject({
      slug: "serums",
      name: "Serumlar",
      image: null,
      productCount: 20,
      seoTitle: null,
    });
  });

  it("follows only https URL links and well-formed targets", () => {
    const banner: ApiCustomerBanner = {
      id: 3,
      title: "Kuzgi chegirmalar",
      image_url: "https://media.glowderma.uz/b.webp",
      image_width: 0,
      image_height: 0,
      link: { kind: "url", product_id: null, category: null, url: "http://glowderma.uz/aksiya" },
    };
    expect(mapBanner(banner, HOSTS)).toMatchObject({
      link: { kind: "none" },
      width: 1200,
      height: 600,
    });
    expect(
      mapBanner({ ...banner, link: { ...banner.link, url: "https://glowderma.uz/aksiya" } }, HOSTS)
        .link,
    ).toEqual({ kind: "url", url: "https://glowderma.uz/aksiya" });
    expect(
      mapBanner(
        { ...banner, link: { kind: "product", product_id: 4, category: null, url: null } },
        HOSTS,
      ).link,
    ).toEqual({ kind: "product", productId: 4 });
    expect(
      mapBanner(
        { ...banner, link: { kind: "category", product_id: null, category: "../x", url: null } },
        HOSTS,
      ).link,
    ).toEqual({ kind: "none" });
  });
});

describe("mapSpecialist / mapService / mapSettings", () => {
  const specialist: ApiSpecialist = {
    id: 1,
    name: "Nodira Rahimova",
    role: "dermatologist",
    role_label: "Dermatolog",
    photo_url: null,
    bio: "",
    qualifications: "",
    experience_years: 8,
    location: {
      id: 1,
      name: "Glow Derma klinikasi",
      address: "Toshkent",
      phone: "+998712000000",
      latitude: 41.3,
      longitude: 69.2,
    },
    services: [{ id: 1, name: "Konsultatsiya", short_name: "", duration_min: 30, price: 150000 }],
    slot_step_min: 30,
  };

  it("maps a specialist; the short name falls back to the name", () => {
    const mapped = mapSpecialist(specialist, HOSTS);
    expect(mapped.segment).toBe("1");
    expect(mapped.services[0]).toEqual({
      id: 1,
      name: "Konsultatsiya",
      shortName: "Konsultatsiya",
      durationMin: 30,
      price: 150000,
    });
    expect(mapped.location.latitude).toBe(41.3);
    expect(mapSpecialist({ ...specialist, slug: "nodira-rahimova" }, HOSTS).segment).toBe(
      "nodira-rahimova",
    );
  });

  it("never lets a price range run backwards", () => {
    expect(
      mapService({
        id: 1,
        name: "Konsultatsiya",
        short_name: "K",
        description: "",
        category: "dermatology",
        category_label: "Dermatologiya",
        duration_min: 30,
        price_from: 150000,
        price_to: 120000,
        specialist_ids: [1],
      }).priceTo,
    ).toBe(150000);
  });

  it("keeps only https links and known enum values from the settings", () => {
    const settings = {
      support_phone: "+998712000000",
      store_phone: null,
      cosmetologist_phone: "",
      telegram_url: "https://t.me/glowderma",
      instagram_url: "http://instagram.com/x",
      website_url: null,
      pickup_address: "Toshkent",
      privacy_policy: "P",
      terms: "T",
      booking_policy: "",
      terms_version: "20261001-1",
      terms_updated_at: "2026-10-01T10:15:00+05:00",
      reservation_minutes: 15,
      payment_providers: ["click", "payme"],
      online_sales_enabled: true,
      fulfilment_methods: ["delivery", "pickup"],
      min_app_version: { ios: "1.0.0", android: "1.0.0" },
      store_urls: { ios: "https://apps.apple.com/x", android: "" },
    } as ApiPublicSettings;
    const mapped = mapSettings(settings);
    expect(mapped.telegramUrl).toBe("https://t.me/glowderma");
    expect(mapped.instagramUrl).toBeNull();
    expect(mapped.cosmetologistPhone).toBeNull();
    expect(mapped.storeUrls).toEqual({ ios: "https://apps.apple.com/x", android: null });
    expect(mapped.fulfilmentMethods).toEqual(["delivery", "pickup"]);
  });
});

describe("revalidation tags", () => {
  it("maps entity changes to every read that shows them", () => {
    expect(tagsForEntity("product", 12)).toEqual(["shop:products", "shop:product:12"]);
    expect(tagsForEntity("category")).toEqual(["shop:categories", "shop:products"]);
    expect(tagsForEntity("specialist", 3)).toEqual([
      "shop:specialists",
      "shop:specialist:3",
      "shop:services",
    ]);
    expect(tagsForEntity("settings")).toEqual(["shop:settings"]);
  });

  it("parses tags and entities, deduplicated", () => {
    expect(
      parseRevalidationRequest({
        tags: ["shop:banners", "shop:product:12"],
        entities: [{ type: "product", id: 12 }, { type: "banner" }],
      }),
    ).toEqual({ ok: true, tags: ["shop:banners", "shop:product:12", "shop:products"] });
  });

  it("refuses unknown tags, types and ids as a whole", () => {
    expect(parseRevalidationRequest({ tags: ["admin:all"] }).ok).toBe(false);
    expect(parseRevalidationRequest({ entities: [{ type: "order" }] }).ok).toBe(false);
    expect(parseRevalidationRequest({ entities: [{ type: "product", id: "12" }] }).ok).toBe(false);
    expect(parseRevalidationRequest({ entities: [{ type: "product", id: -1 }] }).ok).toBe(false);
    expect(parseRevalidationRequest({}).ok).toBe(false);
    expect(parseRevalidationRequest([]).ok).toBe(false);
    expect(parseRevalidationRequest({ tags: Array(101).fill("shop:banners") }).ok).toBe(false);
  });
});
