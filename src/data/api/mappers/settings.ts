import type { StaffAccount } from "@/domain/settings";

import type { Me } from "../auth";
import { idString } from "./common";

/**
 * `GET auth/me/` → the account card. `auth_method` (M3) keeps an absent key
 * (a backend before M3) apart from an explicit `null` (a session opened
 * before the backend recorded it): only the latter stops the link flow.
 */
export function mapStaffAccount(me: Me): StaffAccount {
  return {
    id: idString(me.id),
    email: me.email,
    displayName: me.display_name,
    isManager: Boolean(me.is_manager || me.is_superuser),
    linkedProviders: [...me.linked_providers],
    sessionExpiresAt: me.session_expires_at || null,
    authMethod: "auth_method" in me ? (me.auth_method ?? null) : undefined,
  };
}
