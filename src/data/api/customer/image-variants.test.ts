import { describe, expect, it } from "vitest";

import { mapCart, mapInboxItem, mapOrder } from "./account-mappers";
import type { ApiCart, ApiInboxItem, ApiOrderDetail } from "./account-types";
import { mapCategory, mapProduct, mapProductCard, mapSpecialist } from "./mappers";
import type {
  ApiCustomerCategory,
  ApiCustomerProductCard,
  ApiCustomerProductDetail,
  ApiSpecialist,
} from "./types";

// Spec 2026-11-13-image-variants: lists and cards load the 400 px / 1000 px WebP variants.
const HOSTS = ["media.glowderma.uz"];
const M = "https://media.glowderma.uz/media/products/1/a";
const ORIGINAL = `${M}.jpg`;
const THUMB = `${M}_400.webp`;
const MEDIUM = `${M}_1000.webp`;

const card = {
  id: 1,
  name: "Serum",
  volume: "30 ml",
  price: 185000,
  promo: false,
  category: null,
  main_image_url: ORIGINAL,
  main_image_thumbnail_url: THUMB,
  main_image_medium_url: MEDIUM,
  available: 3,
  stock_status: "in_stock",
  in_cart_quantity: 0,
} as unknown as ApiCustomerProductCard;

function withoutVariants<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !/_(thumbnail|medium)_url$|^(thumbnail|medium)_url$/.test(key),
    ),
  ) as T;
}

describe("product card variants", () => {
  it("maps the variant URLs", () => {
    const mapped = mapProductCard(card, HOSTS);
    expect(mapped.image).toBe(ORIGINAL);
    expect(mapped.imageThumb).toBe(THUMB);
    expect(mapped.imageMedium).toBe(MEDIUM);
  });

  it("falls back to the original when the API sends no variants", () => {
    const mapped = mapProductCard(withoutVariants(card), HOSTS);
    expect(mapped.imageThumb).toBe(ORIGINAL);
    expect(mapped.imageMedium).toBe(ORIGINAL);
  });

  it("drops a variant from a host next/image may not load", () => {
    const mapped = mapProductCard(
      { ...card, main_image_thumbnail_url: "https://other.uz/a_400.webp" },
      HOSTS,
    );
    expect(mapped.imageThumb).toBeNull();
  });

  it("gives each gallery photo its thumbnail", () => {
    const detail = {
      ...card,
      description: "",
      ingredients: "",
      usage: "",
      max_quantity: 3,
      images: [{ id: 7, url: ORIGINAL, thumbnail_url: THUMB, medium_url: MEDIUM, position: 0 }],
    } as unknown as ApiCustomerProductDetail;
    expect(mapProduct(detail, HOSTS).images[0]).toEqual({
      id: 7,
      image: ORIGINAL,
      url: ORIGINAL,
      thumb: THUMB,
    });
    const old = {
      ...detail,
      images: [{ id: 7, url: ORIGINAL, position: 0 }],
    } as unknown as ApiCustomerProductDetail;
    expect(mapProduct(old, HOSTS).images[0]?.thumb).toBe(ORIGINAL);
  });
});

describe("category and specialist variants", () => {
  it("maps the category card image to its medium variant", () => {
    const category = {
      slug: "serums",
      name: "Serumlar",
      image_url: ORIGINAL,
      image_thumbnail_url: THUMB,
      image_medium_url: MEDIUM,
      product_count: 1,
    } as unknown as ApiCustomerCategory;
    expect(mapCategory(category, HOSTS).imageMedium).toBe(MEDIUM);
    expect(mapCategory(withoutVariants(category), HOSTS).imageMedium).toBe(ORIGINAL);
  });

  it("maps the specialist photo thumbnail", () => {
    const specialist = {
      id: 1,
      name: "Nodira",
      role: "dermatologist",
      role_label: "Dermatolog",
      photo_url: ORIGINAL,
      photo_thumbnail_url: THUMB,
      photo_medium_url: MEDIUM,
      bio: "",
      qualifications: "",
      experience_years: null,
      location: { name: "", address: "" },
      services: [],
      slot_step_min: 30,
    } as unknown as ApiSpecialist;
    expect(mapSpecialist(specialist, HOSTS).photoThumb).toBe(THUMB);
    expect(mapSpecialist(withoutVariants(specialist), HOSTS).photoThumb).toBe(ORIGINAL);
  });
});

describe("small slots use the thumbnail", () => {
  it("cart lines", () => {
    const cart = {
      items: [{ ...card, product_id: 1, unit_price: 1, quantity: 1, line_total: 1, status: "ok" }],
      item_count: 1,
      quantity_total: 1,
      items_subtotal: 1,
      promo_subtotal: 0,
      has_problems: false,
      cashback: { available: 0, max_usable_pickup: 0 },
      updated_at: null,
      last_change: null,
    } as unknown as ApiCart;
    expect(mapCart(cart, HOSTS).lines[0]?.image).toBe(THUMB);
  });

  it("order items and previews", () => {
    const order = {
      id: 1,
      status: "processing",
      items: [
        {
          product_id: 1,
          name: "Serum",
          image_url: ORIGINAL,
          image_thumbnail_url: THUMB,
          image_medium_url: MEDIUM,
          quantity: 1,
          unit_price: 1,
          promo: false,
          line_total: 1,
        },
      ],
      preview_images: [ORIGINAL],
      preview_thumbnail_images: [THUMB],
      payment: { status: "paid", status_label: "", provider: "click", in_progress: false },
      timeline: [],
      progress: [],
      actions: { pay: false, cancel: false, reorder: false },
    } as unknown as ApiOrderDetail;
    const mapped = mapOrder(order, HOSTS);
    expect(mapped.items[0]?.image).toBe(THUMB);
    expect(mapped.previewImages).toEqual([THUMB]);
    const old = { ...order, preview_thumbnail_images: undefined } as unknown as ApiOrderDetail;
    expect(mapOrder(old, HOSTS).previewImages).toEqual([ORIGINAL]);
  });

  it("inbox items", () => {
    const item = {
      id: 1,
      kind: "campaign",
      title: "",
      body: "",
      image_url: ORIGINAL,
      image_thumbnail_url: THUMB,
      image_medium_url: MEDIUM,
      link: { kind: "none" },
      created_at: "2026-11-14T10:00:00+05:00",
      read_at: null,
    } as unknown as ApiInboxItem;
    expect(mapInboxItem(item, HOSTS).image).toBe(THUMB);
    expect(mapInboxItem(withoutVariants(item), HOSTS).image).toBe(ORIGINAL);
  });
});
