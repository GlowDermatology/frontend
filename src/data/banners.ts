import "server-only";

import { cache } from "react";

import type { Banner } from "@/domain/banner";

import { apiListBanners } from "./api/catalog";
import { collectAllPages } from "./api/pages";
import { mapBanner } from "./api/mappers";
import { requireApiToken } from "./auth";
import * as mock from "./mock/banners.queries";
import { dataSource } from "./source";

/**
 * Banners read seam (contract §2.5). The home screen shows a handful of
 * banners, so the list is loaded whole, ordered by `position`.
 */

const PAGE_SIZE = 50;

/** `GET /api/v1/admin/banners/?page_size=50` (every page, bounded, ordered by position). */
export const getBanners = cache(async (): Promise<Banner[]> => {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const rows = await collectAllPages(
      async (page) => (await apiListBanners(token, { page, page_size: PAGE_SIZE })).data,
      { pageSize: PAGE_SIZE, path: "banners/" },
    );
    return rows.map(mapBanner).sort((a, b) => a.position - b.position);
  }
  return mock.getBanners();
});
