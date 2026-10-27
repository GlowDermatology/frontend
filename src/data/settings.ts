import "server-only";

import type { SiteSettings, StaffAccount } from "@/domain/settings";

import { apiGetSettings } from "./api/admin";
import { mapSettings, mapStaffAccount } from "./api/mappers/settings";
import { getMe, requireApiToken } from "./auth";
import { MOCK_SETTINGS } from "./mock/settings";
import { dataSource } from "./source";

/** Settings read seam (contract §2.11 `GET settings/`, §2.1 `GET auth/me/`). */

export async function getSettings(): Promise<SiteSettings> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapSettings((await apiGetSettings(token)).data);
  }
  return MOCK_SETTINGS;
}

/** The signed-in staff member, for the account card; `null` when `auth/me/` failed. */
export async function getStaffAccount(): Promise<StaffAccount | null> {
  const me = await getMe();
  return me ? mapStaffAccount(me) : null;
}
