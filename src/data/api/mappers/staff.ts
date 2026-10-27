import type {
  StaffAccountRow,
  StaffCredentials,
  StaffListQuery,
  StaffMember,
} from "@/domain/staff";

import type { ApiStaffCredentials, ApiStaffListItem, ApiStaffMember } from "../types";
import { idString } from "./common";

/** `StaffListItem` (contract §2.16) → the actor filter option. */
export function mapStaffMember(api: ApiStaffListItem): StaffMember {
  return {
    id: idString(api.id),
    name: api.display_name || api.email,
    email: api.email,
    isActive: api.is_active,
  };
}

/**
 * A `StaffListItem` with the manager columns, or a `StaffMember` → the staff
 * screen's row. The manager columns are `null` for a caller who is not a
 * manager (the screen is not shown then); they read as empty here.
 */
export function mapStaffRow(api: ApiStaffListItem | ApiStaffMember): StaffAccountRow {
  return {
    id: idString(api.id),
    displayName: api.display_name || api.email,
    email: api.email,
    fullName: api.full_name ?? "",
    isActive: api.is_active,
    isManager: api.is_manager ?? false,
    lastLoginAt: api.last_login_at ?? null,
    linkedProviders: [...(api.linked_providers ?? [])],
    createdAt: api.created_at ?? null,
  };
}

export function mapStaffCredentials(api: ApiStaffCredentials): StaffCredentials {
  return { staff: mapStaffRow(api.staff), temporaryPassword: api.temporary_password || null };
}

/** The screen's URL query → `GET staff/` parameters (`search`, `is_active`, `page`, `page_size`). */
export function staffListParams(query: StaffListQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    is_active: query.status === "active",
    page: query.page,
    page_size: query.pageSize,
  };
  if (query.q) params.search = query.q;
  return params;
}
