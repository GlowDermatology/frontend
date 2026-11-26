import { describe, expect, it } from "vitest";

import type { ApiProductImage } from "../types";
import { mapImageMedia, mapImageRendition, mapProductImage } from "./products";

/** The admin `ProductImage`'s server-owned facts (backend 0bcf0a5). */
const IMAGE: ApiProductImage = {
  id: 9,
  url: "http://m/s.webp",
  thumbnail_url: "http://m/s_400.webp",
  medium_url: "http://m/s_1000.webp",
  position: 1,
  alt: {},
  width: 2000,
  height: 2000,
  source: "ai_scene",
  derived_from_id: 4,
  product_box: [0.2, 0.2, 0.8, 0.9],
  renditions: {
    portrait: {
      crop: [0.1, 0, 0.8, 1],
      mode: "auto",
      url: "http://m/s_r45.webp",
      medium_url: "http://m/s_r45_1000.webp",
      thumbnail_url: "http://m/s_r45_400.webp",
    },
    square: null,
  },
};

describe("mapImageMedia", () => {
  it("maps the size, origin, product box and shapes", () => {
    expect(mapImageMedia(IMAGE)).toEqual({
      width: 2000,
      height: 2000,
      url: "http://m/s.webp",
      mediumUrl: "http://m/s_1000.webp",
      source: "ai_scene",
      derivedFromId: "4",
      productBox: [0.2, 0.2, 0.8, 0.9],
      renditions: {
        portrait: {
          crop: [0.1, 0, 0.8, 1],
          mode: "auto",
          url: "http://m/s_r45.webp",
          mediumUrl: "http://m/s_r45_1000.webp",
          thumbnailUrl: "http://m/s_r45_400.webp",
        },
        square: null,
      },
    });
    // The tile keeps its 400 px source; the media rides along.
    expect(mapProductImage(IMAGE)).toMatchObject({ id: "9", src: "http://m/s_400.webp" });
  });

  it("is defensive about values it cannot use", () => {
    const odd = {
      ...IMAGE,
      width: -1,
      source: "drawing",
      product_box: [0.9, 0, 0.1, 1],
      renditions: { portrait: { crop: "all", mode: "?" }, square: "x" },
    } as unknown as ApiProductImage;
    const media = mapImageMedia(odd);
    expect(media.width).toBe(0);
    expect(media.source).toBe("upload");
    expect(media.productBox).toBeNull();
    expect(media.renditions.portrait).toMatchObject({ crop: null, mode: "manual", url: null });
    expect(media.renditions.square).toBeNull();
    expect(mapImageRendition(undefined)).toBeNull();
  });
});
