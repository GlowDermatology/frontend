import "server-only";

import type { StaffAccount } from "@/domain/settings";

import { mapStaffAccount } from "./api/mappers/settings";
import { getMe } from "./auth";

/**
 * Account read seam of /admin/settings (contract §2.1 `GET auth/me/`). The
 * store settings, contacts and legal texts are edited in the ops console
 * (`GLOWDERMA_OPS_CONSOLE_URL`), not here.
 */

/** The signed-in staff member, for the account card; `null` when `auth/me/` failed. */
export async function getStaffAccount(): Promise<StaffAccount | null> {
  const me = await getMe();
  return me ? mapStaffAccount(me) : null;
}
