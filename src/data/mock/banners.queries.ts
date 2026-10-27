import type { Banner } from "@/domain/banner";

import { BANNERS } from "./banners";

/** Mock implementation of `src/data/banners.ts`. */
export async function getBanners(): Promise<Banner[]> {
  return [...BANNERS].sort((a, b) => a.position - b.position);
}

/** Rows of the banners export (same order as the list). */
export async function exportBanners(): Promise<Banner[]> {
  return getBanners();
}
