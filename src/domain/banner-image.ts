import type { Crop } from "./crop";

/**
 * AI banner images (admin contract §2.20.8, backend 75015f8): a home-screen banner's picture
 * made by the scene provider, with 1–3 catalog products in a scene (`products`, each from its
 * main photo, never redrawn) or a scene alone (`scene`). The picture is exactly 2.15:1, the
 * app's banner, which shows all of it; the website's 2:1 banner shows its middle (`webCrop`).
 * It is text-free: the website and the app draw the title over its lower left.
 */

export type BannerImageMode = "products" | "scene";
export const BANNER_IMAGE_MODES: ReadonlyArray<BannerImageMode> = ["products", "scene"];

export const BANNER_IMAGE_MAX_PRODUCTS = 3;

/** Width / height of the app's banner (mobile `banner_carousel.dart`) and of the generated picture. */
export const BANNER_APP_RATIO = 2.15;
/** Width / height of the website's banner (`--aspect-banner`). */
export const BANNER_WEB_RATIO = 2;
/** The website's window of a 2.15:1 picture when the server sent none: its middle 2:1. */
export const BANNER_WEB_CROP: Crop = [
  (1 - BANNER_WEB_RATIO / BANNER_APP_RATIO) / 2,
  0,
  BANNER_WEB_RATIO / BANNER_APP_RATIO,
  1,
];

/**
 * Titles longer than this wrap to a third line on a phone and run over the products: the dialog
 * suggests a shorter one (nothing is refused).
 */
export const BANNER_TITLE_COMFORT = 32;

export interface BannerImageProduct {
  id: string;
  name: string;
}

/** A banner image job's own facts (`SceneJob.banner`). */
export interface SceneBannerInfo {
  mode: BannerImageMode;
  /** In the order staff picked them; the first is the main one (the tallest). */
  products: BannerImageProduct[];
  /** The product whose photo could not be used (`banner_product_photo_unusable`). */
  failedProduct: BannerImageProduct | null;
  webCrop: Crop;
  acceptedBannerId: string | null;
}

/** What starting a banner image asks for: an AI template or a typed scene. */
export interface BannerImageRequest {
  mode: BannerImageMode;
  productIds: string[];
  templateId?: string;
  customPrompt?: string;
}

/** The error codes that point at a product's photo (the dialog then names the product). */
export function isProductPhotoProblem(code: string | undefined): boolean {
  return code === "banner_product_photo_unusable" || code === "scene_source_changed";
}
