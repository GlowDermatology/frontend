import type { StaffMember } from "@/domain/staff";

import type { ApiStaffListItem } from "../types";
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
