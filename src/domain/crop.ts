/**
 * Fixed-ratio crops of a product photo (the "renditions" of backend 0bcf0a5, `core/renditions.py`):
 * a 4:5 `portrait` for product cards, the product page and the cart, a 1:1 `square` for the home
 * rails, the feed and thumbnails. A crop is `[x, y, w, h]` normalised to the image (0-1 of its
 * width and height), so it holds for every variant of the photo. Pure and framework-free: the
 * admin cropper (`components/ui/crop-frame.tsx`), the renditions dialog and the mock source share
 * these rules, which mirror the backend's `auto_crop` and `check_crop` exactly.
 */

/** `[x, y, w, h]`, each 0-1 of the image's width (x, w) or height (y, h). */
export type Crop = readonly [x: number, y: number, w: number, h: number];

/** The product's box in the photo, `[x0, y0, x1, y1]` (0-1), when the backend knows it. */
export type ProductBox = readonly [x0: number, y0: number, x1: number, y1: number];

export interface ImageSize {
  width: number;
  height: number;
}

export const RENDITION_SHAPES = ["portrait", "square"] as const;
export type RenditionShape = (typeof RENDITION_SHAPES)[number];

/** Width / height of each shape in pixels. */
export const SHAPE_RATIO: Record<RenditionShape, number> = { portrait: 0.8, square: 1 };

/** Pixels of the source a crop keeps at least on its short side (`MIN_SIDE`). */
export const MIN_CROP_SIDE = 200;
/** How far a crop's pixel ratio may stray from its shape's (`RATIO_TOLERANCE`, ±2 %). */
export const CROP_RATIO_TOLERANCE = 0.02;
/** Space kept around the product box on each side, as a share of the box (`MARGIN`). */
export const AUTO_CROP_MARGIN = 0.14;
/** How far a crop may run past the image's edge and still count as inside (`check_crop` slack). */
const EDGE_SLACK = 0.002;

/** The field codes `PUT …/renditions/` answers per shape. */
export type CropProblem = "invalid_crop" | "crop_too_small";

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
/** The backend rounds normalised values to 5 decimals; so does every crop made here. */
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

function normalised(left: number, top: number, w: number, h: number, size: ImageSize): Crop {
  return [
    round5(left / size.width),
    round5(top / size.height),
    round5(w / size.width),
    round5(h / size.height),
  ];
}

/** Whether `size` is a usable image size (both sides known and positive). */
export function isKnownSize(size: ImageSize | null | undefined): size is ImageSize {
  return (
    !!size &&
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

/** Whether `box` is a product box the backend would frame (`_valid_box`). */
export function isProductBox(box: unknown): box is ProductBox {
  if (!Array.isArray(box) || box.length !== 4) return false;
  if (!box.every((value) => typeof value === "number" && Number.isFinite(value))) return false;
  const [x0, y0, x1, y1] = box as number[];
  return 0 <= x0! && x0! < x1! && x1! <= 1 && 0 <= y0! && y0! < y1! && y1! <= 1;
}

/** Whether `value` has a crop's shape (four finite numbers); says nothing about its bounds. */
export function isCropTuple(value: unknown): value is Crop {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

/** The widest crop of `ratio` that fits the image, in pixels. */
export function largestCropWidth(ratio: number, size: ImageSize): number {
  return Math.min(size.width, size.height * ratio);
}

/**
 * The narrowest crop of `ratio` the backend accepts (its short side `MIN_CROP_SIDE` px), in
 * pixels; the largest crop when the image itself is smaller (the server then refuses it with
 * `crop_too_small`, and the dialog says so).
 */
export function smallestCropWidth(ratio: number, size: ImageSize): number {
  // A tenth of a pixel over the minimum, so rounding to 5 decimals never drops under it.
  const side = MIN_CROP_SIDE + 0.1;
  const width = ratio <= 1 ? side : side * ratio;
  return Math.min(width, largestCropWidth(ratio, size));
}

/**
 * The backend's automatic crop (`auto_crop`): the product box with `AUTO_CROP_MARGIN` around it,
 * centred on the box and kept inside the image; without a box, the largest centred crop.
 */
export function autoCrop(ratio: number, size: ImageSize, box?: unknown): Crop {
  const { width, height } = size;
  if (!isProductBox(box)) {
    const cropW = Math.min(width, height * ratio);
    const cropH = cropW / ratio;
    return normalised((width - cropW) / 2, (height - cropH) / 2, cropW, cropH, size);
  }
  const [x0, y0, x1, y1] = box;
  const boxW = (x1 - x0) * width;
  const boxH = (y1 - y0) * height;
  const needW = boxW * (1 + 2 * AUTO_CROP_MARGIN);
  const needH = boxH * (1 + 2 * AUTO_CROP_MARGIN);
  let cropW = Math.max(needW, needH * ratio);
  let cropH = cropW / ratio;
  if (cropW > width) {
    cropW = width;
    cropH = width / ratio;
  }
  if (cropH > height) {
    cropH = height;
    cropW = height * ratio;
  }
  const cx = ((x0 + x1) / 2) * width;
  const cy = ((y0 + y1) / 2) * height;
  const left = clamp(cx - cropW / 2, 0, width - cropW);
  const top = clamp(cy - cropH / 2, 0, height - cropH);
  return normalised(left, top, cropW, cropH, size);
}

/**
 * Why the backend would refuse `crop` for `ratio` (`check_crop`): `invalid_crop` when it is not
 * four numbers, leaves the image or has the wrong shape (±2 % in pixels), `crop_too_small` when
 * its short side keeps fewer than `MIN_CROP_SIDE` px; `null` when it would be stored.
 */
export function cropProblem(ratio: number, crop: unknown, size: ImageSize): CropProblem | null {
  if (!isCropTuple(crop)) return "invalid_crop";
  const [x, y, w, h] = crop;
  if (
    w <= 0 ||
    h <= 0 ||
    x < -EDGE_SLACK ||
    y < -EDGE_SLACK ||
    x + w > 1 + EDGE_SLACK ||
    y + h > 1 + EDGE_SLACK
  ) {
    return "invalid_crop";
  }
  const pixelW = w * size.width;
  const pixelH = h * size.height;
  if (Math.abs(pixelW / pixelH - ratio) > CROP_RATIO_TOLERANCE * ratio) return "invalid_crop";
  if (Math.min(pixelW, pixelH) < MIN_CROP_SIDE) return "crop_too_small";
  return null;
}

/**
 * `crop` made valid for `ratio`: its width kept between `smallestCropWidth` and
 * `largestCropWidth`, its height following the shape exactly, its centre kept where possible
 * and the whole crop moved inside the image. Anything that is not a crop becomes the largest
 * centred one.
 */
export function clampCrop(ratio: number, crop: unknown, size: ImageSize): Crop {
  if (!isCropTuple(crop) || crop[2] <= 0) return autoCrop(ratio, size);
  const [x, y, w] = crop;
  const maxW = largestCropWidth(ratio, size);
  const minW = smallestCropWidth(ratio, size);
  const cropW = clamp(w * size.width, minW, maxW);
  const cropH = cropW / ratio;
  const cx = (x + w / 2) * size.width;
  const cy = (y + crop[3] / 2) * size.height;
  const left = clamp(cx - cropW / 2, 0, size.width - cropW);
  const top = clamp(cy - cropH / 2, 0, size.height - cropH);
  return normalised(left, top, cropW, cropH, size);
}

/** `crop` moved by `dx`, `dy` (0-1 of the image), kept inside it. */
export function moveCrop(ratio: number, crop: Crop, dx: number, dy: number, size: ImageSize): Crop {
  return clampCrop(ratio, [crop[0] + dx, crop[1] + dy, crop[2], crop[3]], size);
}

/** The zoom of `crop`: 1 = the largest crop of the image, higher = a closer crop. */
export function cropZoom(ratio: number, crop: Crop, size: ImageSize): number {
  const width = crop[2] * size.width;
  return width > 0 ? largestCropWidth(ratio, size) / width : 1;
}

/** The closest zoom the backend allows (the smallest crop), at least 1. */
export function maxCropZoom(ratio: number, size: ImageSize): number {
  return Math.max(1, largestCropWidth(ratio, size) / smallestCropWidth(ratio, size));
}

/**
 * `crop` at `zoom` (clamped to 1 … `maxCropZoom`). `anchor` (0-1 of the image) is the point that
 * stays where it is on screen, e.g. under the pointer; the crop's centre by default.
 */
export function zoomCrop(
  ratio: number,
  crop: Crop,
  zoom: number,
  size: ImageSize,
  anchor?: readonly [number, number],
): Crop {
  const [x, y, w, h] = crop;
  const level = clamp(Number.isFinite(zoom) ? zoom : 1, 1, maxCropZoom(ratio, size));
  const nextW = largestCropWidth(ratio, size) / level / size.width;
  const nextH = (nextW * size.width) / ratio / size.height;
  const [ax, ay] = anchor ?? [x + w / 2, y + h / 2];
  const rx = w > 0 ? (ax - x) / w : 0.5;
  const ry = h > 0 ? (ay - y) / h : 0.5;
  return clampCrop(ratio, [ax - rx * nextW, ay - ry * nextH, nextW, nextH], size);
}

/** Whether two crops are the same to the backend's precision. */
export function sameCrop(a: Crop | null | undefined, b: Crop | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.every((value, index) => Math.abs(value - b[index]!) < 1e-4);
}

/** `crop` in pixels of `size`. */
export function cropToPixels(
  crop: Crop,
  size: ImageSize,
): { x: number; y: number; width: number; height: number } {
  return {
    x: crop[0] * size.width,
    y: crop[1] * size.height,
    width: crop[2] * size.width,
    height: crop[3] * size.height,
  };
}

/** A pixel rectangle of `size` as a normalised crop. */
export function cropFromPixels(
  pixels: { x: number; y: number; width: number; height: number },
  size: ImageSize,
): Crop {
  return normalised(pixels.x, pixels.y, pixels.width, pixels.height, size);
}

/**
 * Where a shape's cropper starts: the stored crop (made valid) when there is one, else the
 * backend's automatic framing (`autoCrop`, on the product box when known).
 */
export function initialCrop(
  ratio: number,
  size: ImageSize,
  stored: Crop | null | undefined,
  box?: unknown,
): Crop {
  return stored ? clampCrop(ratio, stored, size) : autoCrop(ratio, size, box);
}
