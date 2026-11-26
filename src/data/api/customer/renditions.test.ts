import { describe, expect, it } from "vitest";

import { mapCartLine } from "./account-mappers";
import type { ApiCart } from "./account-types";
import { mapProduct, mapProductCard, rendition, renditions } from "./mappers";
import type { ApiCustomerProductCard, ApiCustomerProductDetail } from "./types";

/**
 * Screen shapes of a product photo (backend 0bcf0a5): `main_image_renditions` on cards and cart
 * lines, `images[].renditions` on the product page. A shape is used only when it is there and
 * every URL passes the media-host rule; otherwise the surface falls back to the photo itself.
 */
const HOSTS = ["media.glowderma.uz"];
const R = "https://media.glowderma.uz/media/products/1/a";
const PORTRAIT = {
  url: `${R}_r45-1.webp`,
  medium_url: `${R}_r45-1_1000.webp`,
  thumbnail_url: `${R}_r45-1_400.webp`,
};
const SQUARE = {
  url: `${R}_r11-1.webp`,
  medium_url: `${R}_r11-1_1000.webp`,
  thumbnail_url: `${R}_r11-1_400.webp`,
};
const MAPPED_PORTRAIT = {
  url: PORTRAIT.url,
  medium: PORTRAIT.medium_url,
  thumb: PORTRAIT.thumbnail_url,
};

const card = {
  id: 1,
  name: "Serum",
  volume: "30 ml",
  price: 185000,
  promo: false,
  category: null,
  main_image_url: `${R}.jpg`,
  main_image_thumbnail_url: `${R}_400.webp`,
  main_image_medium_url: `${R}_1000.webp`,
  main_image_renditions: { portrait: PORTRAIT, square: SQUARE },
  available: 3,
  stock_status: "in_stock",
  in_cart_quantity: 0,
} as unknown as ApiCustomerProductCard;

describe("rendition", () => {
  it("maps a shape's three URLs", () => {
    expect(rendition(PORTRAIT, HOSTS)).toEqual(MAPPED_PORTRAIT);
  });

  it("is absent for null, a missing key or anything that is not a shape", () => {
    expect(rendition(null, HOSTS)).toBeNull();
    expect(rendition(undefined, HOSTS)).toBeNull();
    expect(rendition("https://media.glowderma.uz/a.webp", HOSTS)).toBeNull();
    expect(renditions(undefined, HOSTS)).toEqual({ portrait: null, square: null });
    expect(renditions({ portrait: null }, HOSTS)).toEqual({ portrait: null, square: null });
  });

  it("is absent when a URL comes from a host next/image may not load", () => {
    expect(rendition({ ...PORTRAIT, url: "https://other.uz/a.webp" }, HOSTS)).toBeNull();
    expect(rendition({ ...PORTRAIT, medium_url: "https://other.uz/a.webp" }, HOSTS)).toBeNull();
    expect(rendition({ ...PORTRAIT, thumbnail_url: "javascript:alert(1)" }, HOSTS)).toBeNull();
  });

  it("falls back to the full-size URL for a variant the API leaves out", () => {
    expect(rendition({ url: PORTRAIT.url }, HOSTS)).toEqual({
      url: PORTRAIT.url,
      medium: PORTRAIT.url,
      thumb: PORTRAIT.url,
    });
  });
});

describe("cards, product page and cart", () => {
  it("cards carry the main image's shapes and keep the photo's own fields", () => {
    const mapped = mapProductCard(card, HOSTS);
    expect(mapped.renditions.portrait).toEqual(MAPPED_PORTRAIT);
    expect(mapped.renditions.square?.medium).toBe(SQUARE.medium_url);
    expect(mapped.imageMedium).toBe(`${R}_1000.webp`);
  });

  it("a card from an older API, or with a shape not set, falls back", () => {
    const { main_image_renditions: _, ...older } = card as unknown as Record<string, unknown>;
    void _;
    expect(mapProductCard(older as unknown as ApiCustomerProductCard, HOSTS).renditions).toEqual({
      portrait: null,
      square: null,
    });
    const portraitOnly = mapProductCard(
      { ...card, main_image_renditions: { portrait: PORTRAIT, square: null } },
      HOSTS,
    );
    expect(portraitOnly.renditions.square).toBeNull();
    expect(portraitOnly.renditions.portrait).not.toBeNull();
  });

  it("each gallery photo carries its own shapes", () => {
    const detail = {
      ...card,
      description: "",
      ingredients: "",
      usage: "",
      max_quantity: 3,
      images: [
        { id: 8, url: `${R}.jpg`, position: 1, renditions: { portrait: null, square: SQUARE } },
        { id: 7, url: `${R}.jpg`, position: 0 },
      ],
    } as unknown as ApiCustomerProductDetail;
    const images = mapProduct(detail, HOSTS).images;
    expect(images.map((image) => image.id)).toEqual([7, 8]);
    expect(images[0]?.renditions).toEqual({ portrait: null, square: null });
    expect(images[1]?.renditions.square?.thumb).toBe(SQUARE.thumbnail_url);
  });

  it("cart lines carry the main image's shapes, the thumbnail stays the fallback", () => {
    const line = {
      product_id: 4,
      name: "Krem",
      volume: "50 ml",
      main_image_url: `${R}.jpg`,
      main_image_thumbnail_url: `${R}_400.webp`,
      main_image_medium_url: `${R}_1000.webp`,
      main_image_renditions: { portrait: PORTRAIT, square: null },
      unit_price: 1000,
      promo: false,
      quantity: 1,
      line_total: 1000,
      available: 1,
      max_quantity: 1,
      max_reached: false,
      status: "ok",
      price_changed: false,
      previous_price: null,
    } as ApiCart["items"][number];
    const mapped = mapCartLine(line, HOSTS);
    expect(mapped.renditions.portrait?.thumb).toBe(PORTRAIT.thumbnail_url);
    expect(mapped.image).toBe(`${R}_400.webp`);
    const foreign = mapCartLine(
      {
        ...line,
        main_image_renditions: { portrait: { ...PORTRAIT, url: "https://x.uz/a" }, square: null },
      },
      HOSTS,
    );
    expect(foreign.renditions.portrait).toBeNull();
  });
});
