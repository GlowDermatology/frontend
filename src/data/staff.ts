import "server-only";

import type { StaffMember } from "@/domain/staff";

import { apiListStaff } from "./api/customers";
import { mapStaffMember } from "./api/mappers/staff";
import { collectAllPages } from "./api/pages";
import { requireApiToken } from "./auth";
import { dataSource } from "./source";

/**
 * Staff directory read seam (contract §2.16 `GET staff/`), the options of the
 * audit-log actor filter. The api branch loads every page of the active staff
 * (100 per page, bounded like the other whole-list reads); the demo has the
 * one administrator its audit fixtures name.
 */

const STAFF_PAGE_SIZE = 100;

const MOCK_STAFF: ReadonlyArray<StaffMember> = [
  { id: "1", name: "Administrator", email: "admin@glowderma.uz", isActive: true },
];

/** Active staff, ordered by display name (the server's order). */
export async function listStaff(): Promise<StaffMember[]> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const rows = await collectAllPages(
      async (page) => (await apiListStaff(token, { page, page_size: STAFF_PAGE_SIZE })).data,
      { pageSize: STAFF_PAGE_SIZE, path: "staff/" },
    );
    return rows.map(mapStaffMember);
  }
  return [...MOCK_STAFF];
}
