import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  NO_RENDITIONS,
  type ShopProduct,
  type ShopProductCard,
  type ShopRenditions,
} from "@/domain/shop";

import { getShopDictionary } from "../content";
import { LiveProductCard } from "../home/live-card";
import { ProductCard } from "./product-card";
import { ProductGallery } from "./product-gallery";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/data/shop/commerce.actions", () => ({}));

/**
 * Which photo each surface shows (backend 0bcf0a5 renditions): the 4:5 shape on product cards
 * and the product page's slides, the 1:1 shape on the home cards and gallery thumbnails, the
 * photo itself while a shape is not set.
 */
const M = "https://media.glowderma.uz/media/products/1/a";
const shape = (tag: string) => ({
  url: `${M}_${tag}.webp`,
  medium: `${M}_${tag}_1000.webp`,
  thumb: `${M}_${tag}_400.webp`,
});
const BOTH: ShopRenditions = { portrait: shape("r45"), square: shape("r11") };

function product(renditions: ShopRenditions): ShopProductCard {
  return {
    id: 1,
    segment: "serum",
    hasSlug: true,
    name: "Serum",
    volume: "30 ml",
    price: 185000,
    promo: false,
    category: null,
    image: `${M}.jpg`,
    imageThumb: `${M}_400.webp`,
    imageMedium: `${M}_1000.webp`,
    imageUrl: `${M}.jpg`,
    renditions,
    available: 3,
    inStock: true,
    brand: null,
    sku: null,
    contentLanguage: null,
    oldPrice: null,
    updatedAt: null,
  };
}

/** The `next/image` URLs in the markup, decoded back to the source URLs. */
const sources = (html: string) =>
  [...html.matchAll(/url=([^&"]+)/g)].map((match) => decodeURIComponent(match[1]!));

const dict = getShopDictionary("uz");

describe("storefront surfaces and renditions", () => {
  it("a product card shows the 4:5 shape, else the 1000 px photo", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product: product(BOTH), locale: "uz", dict }),
    );
    expect(sources(html)).toContain(BOTH.portrait!.medium);
    const plain = renderToStaticMarkup(
      createElement(ProductCard, { product: product(NO_RENDITIONS), locale: "uz", dict }),
    );
    expect(sources(plain)).toContain(`${M}_1000.webp`);
  });

  it("a live home card fills its 4:5 frame: the 4:5 shape, else the photo itself, never padded", () => {
    const props = { locale: "uz" as const, onlineSalesEnabled: false, cashback: null };
    const html = renderToStaticMarkup(
      createElement(LiveProductCard, { ...props, product: product(BOTH) }),
    );
    expect(sources(html)).toContain(BOTH.portrait!.medium);
    expect(html).toContain("aspect-product");
    expect(html).toContain("object-cover");
    expect(html).not.toContain("object-contain");
    const plain = renderToStaticMarkup(
      createElement(LiveProductCard, { ...props, product: product(NO_RENDITIONS) }),
    );
    expect(sources(plain)).toContain(`${M}_1000.webp`);
    expect(plain).toContain("object-cover");
    expect(plain).not.toContain("object-contain");
  });

  it("the gallery: 4:5 full-size slides, 1:1 thumbnails, the photo where a shape is missing", () => {
    const gallery: ShopProduct = {
      ...product(BOTH),
      shortDescription: "",
      description: "",
      ingredients: "",
      usage: "",
      maxQuantity: 3,
      seoTitle: null,
      seoDescription: null,
      images: [
        {
          id: 1,
          image: `${M}.jpg`,
          url: `${M}.jpg`,
          thumb: `${M}_400.webp`,
          alt: "",
          renditions: BOTH,
        },
        {
          id: 2,
          image: `${M}-2.jpg`,
          url: `${M}-2.jpg`,
          thumb: `${M}-2_400.webp`,
          alt: "",
          renditions: NO_RENDITIONS,
        },
      ],
    };
    const found = sources(
      renderToStaticMarkup(createElement(ProductGallery, { product: gallery, dict })),
    );
    expect(found).toContain(BOTH.portrait!.url);
    expect(found).toContain(BOTH.square!.thumb);
    expect(found).toContain(`${M}-2.jpg`);
    expect(found).toContain(`${M}-2_400.webp`);
    expect(found).not.toContain(`${M}.jpg`);
  });
});
