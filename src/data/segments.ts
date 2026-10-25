import "server-only";

import type { Segment, SegmentMember } from "@/domain/segment";

import { apiGetSegment, apiListSegments, apiSegmentMembers } from "./api/admin";
import { isApiError } from "./api/errors";
import { mapPage } from "./api/mappers/page";
import { mapSegment, mapSegmentMember } from "./api/mappers/segments";
import { requireApiToken } from "./auth";
import * as mock from "./mock/segments.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Customer groups read seam (contract §2.8 segments). Dispatches on
 * `dataSource()`: mock bodies in `./mock/segments.queries.ts` (the two seeded
 * groups), the api branch reads `segments/`, `segments/{id}/` and
 * `segments/{id}/members/` (pages of 20).
 */

export const SEGMENTS_PAGE_SIZE = 20;

/** `GET /api/v1/admin/segments/?page=` */
export async function listSegments(page: number): Promise<Page<Segment>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListSegments(token, { page, page_size: SEGMENTS_PAGE_SIZE });
    return mapPage(data, mapSegment);
  }
  return mock.listSegments(page, SEGMENTS_PAGE_SIZE);
}

/** `GET /api/v1/admin/segments/{id}/`; 404 → `null`. */
export async function getSegment(id: string): Promise<Segment | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  if ((await dataSource()) === "api") {
    if (!/^\d{1,12}$/.test(id)) return null;
    const token = await requireApiToken();
    try {
      return mapSegment((await apiGetSegment(token, id)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.getSegment(id);
}

/** `GET /api/v1/admin/segments/{id}/members/?page=` */
export async function listSegmentMembers(id: string, page: number): Promise<Page<SegmentMember>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiSegmentMembers(token, id, { page, page_size: SEGMENTS_PAGE_SIZE });
    return mapPage(data, mapSegmentMember);
  }
  return mock.listSegmentMembers(id, page, SEGMENTS_PAGE_SIZE);
}
