import { describe, expect, it } from "vitest";

import {
  autoCrop,
  clampCrop,
  cropFromPixels,
  cropProblem,
  cropToPixels,
  cropZoom,
  initialCrop,
  isProductBox,
  maxCropZoom,
  moveCrop,
  sameCrop,
  SHAPE_RATIO,
  zoomCrop,
  type Crop,
  type ImageSize,
} from "./crop";

const PORTRAIT = SHAPE_RATIO.portrait;
const SQUARE = SHAPE_RATIO.square;
const TALL: ImageSize = { width: 1200, height: 1600 };
const WIDE: ImageSize = { width: 1600, height: 1200 };

/** The backend's own cases (`glowderma/catalog/tests/test_renditions.py` at 0bcf0a5). */
describe("autoCrop (backend auto_crop)", () => {
  it("is the largest centred crop without a box", () => {
    expect(autoCrop(SQUARE, TALL)).toEqual([0, 0.125, 1, 0.75]);
    expect(autoCrop(PORTRAIT, WIDE)).toEqual([0.2, 0, 0.6, 1]);
  });

  it("frames the product box with its margin and stays inside", () => {
    const [x, y, w, h] = autoCrop(PORTRAIT, TALL, [0.4, 0.3, 0.6, 0.7]);
    expect(x <= 0.4 && x + w >= 0.6 && y <= 0.3 && y + h >= 0.7).toBe(true);
    expect(Math.abs((w * 1200) / (h * 1600) - 0.8)).toBeLessThan(0.01);
    // A box 0.4 of the height tall, plus 14 % each side: 0.512 of 1600 px = 819.2 px.
    expect(h * 1600).toBeCloseTo(819.2, 0);
    // A product at the edge: pushed back inside.
    const [ex, ey, ew, eh] = autoCrop(SQUARE, TALL, [0, 0, 0.2, 0.2]);
    expect([ex, ey]).toEqual([0, 0]);
    expect(ew <= 1 && eh <= 1).toBe(true);
    // A box wider than the image allows: the widest crop.
    expect(autoCrop(SQUARE, { width: 1000, height: 2000 }, [0, 0.4, 1, 0.6])[2]).toBe(1);
  });

  it("ignores a box that is not one", () => {
    expect(isProductBox([0.6, 0, 0.4, 1])).toBe(false);
    expect(isProductBox([0, 0, 1])).toBe(false);
    expect(isProductBox(null)).toBe(false);
    expect(autoCrop(SQUARE, TALL, [0.6, 0, 0.4, 1])).toEqual(autoCrop(SQUARE, TALL));
  });
});

describe("cropProblem (backend check_crop)", () => {
  it.each([
    [[0, 0, 1, 1], "invalid_crop"], // a square crop of a 3:4 image is not square
    [[0.5, 0, 0.75, 0.5625], "invalid_crop"], // outside
    ["full", "invalid_crop"],
    [[0, 0, 0.1, 0.075], "crop_too_small"],
  ] as const)("refuses %j with %s", (crop, code) => {
    expect(cropProblem(SQUARE, crop, TALL)).toBe(code);
  });

  it("accepts the backend's manual example and its auto crops", () => {
    expect(cropProblem(SQUARE, [0.1, 0.2, 0.8, 0.6], TALL)).toBeNull();
    expect(cropProblem(SQUARE, autoCrop(SQUARE, TALL), TALL)).toBeNull();
    expect(cropProblem(PORTRAIT, autoCrop(PORTRAIT, WIDE), WIDE)).toBeNull();
  });
});

/** A small seeded generator, so the property cases are the same on every run. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const SIZES: ImageSize[] = [
  TALL,
  WIDE,
  { width: 4000, height: 600 }, // very wide
  { width: 500, height: 5000 }, // very tall
  { width: 1000, height: 1000 },
  { width: 260, height: 900 }, // short side close to the minimum
  { width: 150, height: 150 }, // smaller than the minimum
];

describe("clamp, move and zoom always give a crop the backend stores", () => {
  const next = random(42);
  for (const size of SIZES) {
    for (const [name, ratio] of Object.entries(SHAPE_RATIO)) {
      it(`${name} of ${size.width}×${size.height}`, () => {
        // An image under 200 px on its short side cannot have a valid crop: only that refusal.
        const allowed = Math.min(size.width, size.height * ratio) / Math.max(1, ratio) < 200;
        const check = (crop: Crop) => {
          const problem = cropProblem(ratio, crop, size);
          if (allowed) expect([null, "crop_too_small"]).toContain(problem);
          else expect(problem).toBeNull();
        };
        for (let i = 0; i < 60; i++) {
          const raw: Crop = [next() * 1.4 - 0.2, next() * 1.4 - 0.2, next() * 1.2, next() * 1.2];
          const clamped = clampCrop(ratio, raw, size);
          check(clamped);
          check(moveCrop(ratio, clamped, next() - 0.5, next() - 0.5, size));
          check(zoomCrop(ratio, clamped, next() * 12, size, [next(), next()]));
          check(autoCrop(ratio, size, [0.1 * next(), 0.1 * next(), 0.5 + next() / 2, 0.9]));
        }
      });
    }
  }
});

describe("clampCrop", () => {
  it("keeps a valid crop", () => {
    expect(clampCrop(SQUARE, [0.1, 0.2, 0.8, 0.6], TALL)).toEqual([0.1, 0.2, 0.8, 0.6]);
  });

  it("fixes the shape around the centre and moves it back inside", () => {
    // A 1:1 request of the whole 3:4 image: the width stays, the height follows the shape.
    expect(clampCrop(SQUARE, [0, 0, 1, 1], TALL)).toEqual([0, 0.125, 1, 0.75]);
    // Past the right edge: moved in.
    const [x, , w] = clampCrop(SQUARE, [0.6, 0.1, 0.5, 0.375], TALL);
    expect(x + w).toBeCloseTo(1, 5);
  });

  it("never goes under the minimum size, nor over the image", () => {
    const tiny = clampCrop(PORTRAIT, [0.5, 0.5, 0.01, 0.01], TALL);
    expect(cropToPixels(tiny, TALL).width).toBeGreaterThanOrEqual(200);
    expect(cropToPixels(tiny, TALL).width).toBeLessThan(200.5);
    const huge = clampCrop(PORTRAIT, [-1, -1, 5, 5], TALL);
    expect(cropToPixels(huge, TALL).width).toBeCloseTo(1200, 1);
  });

  it("turns anything else into the largest centred crop", () => {
    expect(clampCrop(SQUARE, "nope", TALL)).toEqual(autoCrop(SQUARE, TALL));
    expect(clampCrop(SQUARE, [0, 0, 0, 0], TALL)).toEqual(autoCrop(SQUARE, TALL));
  });
});

describe("move and zoom", () => {
  it("moves within the image and stops at its edge", () => {
    const start = autoCrop(SQUARE, TALL); // [0, 0.125, 1, 0.75]
    expect(moveCrop(SQUARE, start, 0, 0.05, TALL)).toEqual([0, 0.175, 1, 0.75]);
    expect(moveCrop(SQUARE, start, 0, 1, TALL)).toEqual([0, 0.25, 1, 0.75]);
    // The full width cannot move sideways.
    expect(moveCrop(SQUARE, start, 0.2, 0, TALL)[0]).toBe(0);
  });

  it("reads and sets the zoom: 1 is the largest crop, the closest keeps 200 px", () => {
    const start = autoCrop(PORTRAIT, TALL);
    expect(cropZoom(PORTRAIT, start, TALL)).toBeCloseTo(1, 5);
    expect(maxCropZoom(PORTRAIT, TALL)).toBeCloseTo(6, 2); // 1200 px / 200 px
    const closer = zoomCrop(PORTRAIT, start, 2, TALL);
    expect(cropZoom(PORTRAIT, closer, TALL)).toBeCloseTo(2, 3);
    // Around the centre by default.
    expect(closer[0] + closer[2] / 2).toBeCloseTo(start[0] + start[2] / 2, 4);
    expect(cropZoom(PORTRAIT, zoomCrop(PORTRAIT, start, 99, TALL), TALL)).toBeCloseTo(6, 2);
    expect(cropZoom(PORTRAIT, zoomCrop(PORTRAIT, closer, 0.1, TALL), TALL)).toBeCloseTo(1, 3);
  });

  it("keeps the anchor point in place", () => {
    const start: Crop = [0.2, 0.2, 0.5, 0.375];
    const anchor = [0.3, 0.3] as const;
    const zoomed = zoomCrop(SQUARE, start, 3, TALL, anchor);
    const before = [(anchor[0] - start[0]) / start[2], (anchor[1] - start[1]) / start[3]];
    const after = [(anchor[0] - zoomed[0]) / zoomed[2], (anchor[1] - zoomed[1]) / zoomed[3]];
    expect(after[0]).toBeCloseTo(before[0]!, 3);
    expect(after[1]).toBeCloseTo(before[1]!, 3);
  });

  it("has a fixed zoom on an image smaller than the minimum", () => {
    expect(maxCropZoom(SQUARE, { width: 150, height: 150 })).toBe(1);
  });
});

describe("conversions", () => {
  it("goes between pixels and normalised crops", () => {
    const pixels = { x: 120, y: 200, width: 960, height: 1200 };
    const crop = cropFromPixels(pixels, TALL);
    expect(crop).toEqual([0.1, 0.125, 0.8, 0.75]);
    expect(cropToPixels(crop, TALL)).toEqual(pixels);
  });

  it("compares to the backend's precision", () => {
    expect(sameCrop([0.1, 0.2, 0.3, 0.4], [0.100001, 0.2, 0.3, 0.4])).toBe(true);
    expect(sameCrop([0.1, 0.2, 0.3, 0.4], [0.11, 0.2, 0.3, 0.4])).toBe(false);
    expect(sameCrop(null, null)).toBe(true);
    expect(sameCrop(null, [0, 0, 1, 1])).toBe(false);
  });

  it("starts from the stored crop, else from the automatic framing", () => {
    const box = [0.4, 0.3, 0.6, 0.7] as const;
    expect(initialCrop(SQUARE, TALL, [0.1, 0.2, 0.8, 0.6], box)).toEqual([0.1, 0.2, 0.8, 0.6]);
    expect(initialCrop(SQUARE, TALL, null, box)).toEqual(autoCrop(SQUARE, TALL, box));
  });
});
