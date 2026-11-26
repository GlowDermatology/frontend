import {
  autoCrop,
  initialCrop,
  isKnownSize,
  RENDITION_SHAPES,
  sameCrop,
  SHAPE_RATIO,
  type Crop,
  type ImageSize,
  type RenditionShape,
} from "@/domain/crop";
import type { ProductImageMedia, RenditionChanges } from "@/domain/product";

/**
 * The renditions dialog's state, framework-free: per shape what the admin wants (a crop, the
 * server's automatic framing, or removing the stored shape) and whether they touched it. Only
 * touched shapes that differ from what is stored are sent; a shape left alone is left out of the
 * PUT (kept), never `null` (removed). An untouched proposal on a shape that has no rendition yet
 * is not sent either: opening the dialog and saving never creates shapes nobody looked at.
 */

export type ShapeIntent = "crop" | "auto" | "remove";

export interface ShapeState {
  intent: ShapeIntent;
  /** What the cropper shows: the crop to send, or the automatic proposal. */
  crop: Crop;
  touched: boolean;
}

export type DialogShapes = Record<RenditionShape, ShapeState>;

/** The photo's size, when the API knows it. */
export function mediaSize(media: ProductImageMedia): ImageSize | null {
  const size = { width: media.width, height: media.height };
  return isKnownSize(size) ? size : null;
}

/** Where each cropper starts: the stored crop, else the automatic framing (product box or centred). */
export function initialShapes(media: ProductImageMedia): DialogShapes {
  const size = mediaSize(media) ?? { width: 1, height: 1 };
  const out = {} as DialogShapes;
  for (const shape of RENDITION_SHAPES) {
    const stored = media.renditions[shape];
    out[shape] = {
      intent: "crop",
      crop: initialCrop(SHAPE_RATIO[shape], size, stored?.crop ?? null, media.productBox),
      touched: false,
    };
  }
  return out;
}

/** The admin moved or zoomed a crop: it is theirs now. */
export function moved(state: ShapeState, crop: Crop): ShapeState {
  return { intent: "crop", crop, touched: true };
}

/** «Avtomatik»: the server frames it; the cropper previews the same framing. */
export function chooseAuto(
  shape: RenditionShape,
  media: ProductImageMedia,
  state: ShapeState,
): ShapeState {
  const size = mediaSize(media);
  return {
    intent: "auto",
    crop: size ? autoCrop(SHAPE_RATIO[shape], size, media.productBox) : state.crop,
    touched: true,
  };
}

/** «Olib tashlash» (only offered while a shape is stored). */
export function chooseRemove(state: ShapeState): ShapeState {
  return { ...state, intent: "remove", touched: true };
}

/** Back to cropping by hand from «Avtomatik» / «Olib tashlash». */
export function chooseManual(state: ShapeState): ShapeState {
  return { ...state, intent: "crop", touched: true };
}

/** The PUT body: only the touched shapes that would change something on the server. */
export function renditionChanges(shapes: DialogShapes, media: ProductImageMedia): RenditionChanges {
  const changes: RenditionChanges = {};
  for (const shape of RENDITION_SHAPES) {
    const state = shapes[shape];
    const stored = media.renditions[shape];
    if (!state.touched) continue;
    if (state.intent === "remove") {
      if (stored) changes[shape] = null;
    } else if (state.intent === "auto") {
      changes[shape] = "auto";
    } else if (!stored || stored.mode === "auto" || !sameCrop(stored.crop, state.crop)) {
      changes[shape] = state.crop;
    }
  }
  return changes;
}
