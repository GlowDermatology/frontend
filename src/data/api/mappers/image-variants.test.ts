import { describe, expect, it } from "vitest";

import bannerFixture from "../__fixtures__/banner.json";
import categoriesFixture from "../__fixtures__/categories.json";
import order10248Fixture from "../__fixtures__/order-10248.json";
import productFixture from "../__fixtures__/product-1.json";
import specialistFixture from "../__fixtures__/specialist-2.json";
import type {
  ApiBanner,
  ApiCategory,
  ApiClinicSpecialist,
  ApiOrderDetail,
  ApiProduct,
} from "../types";
import { mapBanner } from "./banners";
import { mapCategory } from "./categories";
import { mapClinicSpecialist } from "./clinic";
import { mapOrder } from "./orders";
import { mapProduct, mapProductImage } from "./products";

// Spec 2026-11-13-image-variants: every admin slot is small (≤96 px; the product grid 160 px), so the display
// URL is the 400 px variant; the banner dialog previews at 280 px, so banners take the 1000 px variant. An API
// from before the variants keeps the original.
const ORIGINAL = "http://localhost:8001/media/x/1/a.webp";
const THUMB = "http://localhost:8001/media/x/1/a_400.webp";
const MEDIUM = "http://localhost:8001/media/x/1/a_1000.webp";

describe("admin image variants", () => {
  it("product main image and gallery use the thumbnail", () => {
    const api = {
      ...(productFixture as unknown as ApiProduct),
      main_image_url: ORIGINAL,
      main_image_thumbnail_url: THUMB,
      main_image_medium_url: MEDIUM,
    } as ApiProduct;
    expect(mapProduct(api).mainImageUrl).toBe(THUMB);
    const image = { id: 3, url: ORIGINAL, thumbnail_url: THUMB, medium_url: MEDIUM, position: 0 };
    expect(mapProductImage(image).src).toBe(THUMB);
    const old = { id: 3, url: ORIGINAL, position: 0 } as unknown as Parameters<
      typeof mapProductImage
    >[0];
    expect(mapProductImage(old).src).toBe(ORIGINAL);
  });

  it("order items use the thumbnail", () => {
    const api = order10248Fixture as unknown as ApiOrderDetail;
    const items = api.items.map((item) => ({
      ...item,
      image_url: ORIGINAL,
      image_thumbnail_url: THUMB,
    }));
    expect(mapOrder({ ...api, items } as ApiOrderDetail).items[0]?.imageUrl).toBe(THUMB);
    const old = api.items.map((item) => ({ ...item, image_thumbnail_url: null }));
    expect(mapOrder({ ...api, items: old } as ApiOrderDetail).items[0]?.imageUrl).toBe(
      api.items[0]?.image_url,
    );
  });

  it("categories and specialists use the thumbnail", () => {
    const category = (categoriesFixture as unknown as { results: ApiCategory[] })
      .results[0] as ApiCategory;
    const withImage = {
      ...category,
      image_url: ORIGINAL,
      image_thumbnail_url: THUMB,
      image_medium_url: MEDIUM,
    };
    expect(mapCategory(withImage).imageUrl).toBe(THUMB);
    expect(mapCategory({ ...category, image_url: ORIGINAL } as ApiCategory).imageUrl).toBe(
      ORIGINAL,
    );
    const specialist = {
      ...(specialistFixture as unknown as ApiClinicSpecialist),
      photo_url: ORIGINAL,
      photo_thumbnail_url: THUMB,
      photo_medium_url: MEDIUM,
    } as ApiClinicSpecialist;
    expect(mapClinicSpecialist(specialist).photoUrl).toBe(THUMB);
  });

  it("banners use the medium variant", () => {
    const banner = bannerFixture as unknown as ApiBanner;
    expect(mapBanner({ ...banner, image_medium_url: MEDIUM } as ApiBanner).imageUrl).toBe(MEDIUM);
    const old = { ...banner, image_medium_url: undefined } as unknown as ApiBanner; // an older API
    expect(mapBanner(old).imageUrl).toBe(banner.image_url);
  });
});
