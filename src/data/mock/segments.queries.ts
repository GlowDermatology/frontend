import type { Segment, SegmentMember } from "@/domain/segment";

import { emptyPage, paginate, type Page } from "../types";
import { MOCK_MEMBERS, MOCK_SEGMENTS } from "./segments";

/** Mock implementation of `src/data/segments.ts`. */

export async function listSegments(page: number, pageSize: number): Promise<Page<Segment>> {
  return paginate(MOCK_SEGMENTS, page, pageSize);
}

export async function getSegment(id: string): Promise<Segment | null> {
  return MOCK_SEGMENTS.find((segment) => segment.id === id) ?? null;
}

export async function listSegmentMembers(
  id: string,
  page: number,
  pageSize: number,
): Promise<Page<SegmentMember>> {
  const entry = MOCK_MEMBERS[id];
  return entry ? paginate(entry.members, page, pageSize) : emptyPage(pageSize);
}

/** Export rows (contract §1.8 `guruhlar` / `guruh-azolari`). */
export async function exportSegments(): Promise<ReadonlyArray<Segment>> {
  return MOCK_SEGMENTS;
}

export async function exportSegmentMembers(id: string): Promise<ReadonlyArray<SegmentMember>> {
  return MOCK_MEMBERS[id]?.members ?? [];
}
