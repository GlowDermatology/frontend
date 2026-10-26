import type { SiteSettings, StaffAccount } from "@/domain/settings";

import type { Me } from "../auth";
import type { SettingsFormValues } from "../../settings.schema";
import type { ApiSettings, ApiSettingsPatch } from "../types";
import { actorName, idString } from "./common";

const LANGUAGES = ["uz", "ru", "en"] as const;

/** `GET settings/` (contract §2.11) → the FE domain type. */
export function mapSettings(api: ApiSettings): SiteSettings {
  return {
    reservationMinutes: api.reservation_minutes,
    supportPhone: api.support_phone,
    pickupAddress: {
      uz: api.pickup_address.uz ?? "",
      ru: api.pickup_address.ru ?? "",
      en: api.pickup_address.en ?? "",
    },
    integrationsMode: api.integrations.mode,
    updatedAt: api.updated_at,
    updatedBy: actorName(api.updated_by),
  };
}

/** The form's values for loaded settings (`null` phone → empty field). */
export function settingsFormValues(settings: SiteSettings): SettingsFormValues {
  return {
    reservationMinutes: settings.reservationMinutes,
    supportPhone: settings.supportPhone ?? "",
    pickupAddress: { ...settings.pickupAddress },
  };
}

/**
 * Body of `PATCH settings/`: only the fields that differ from the values the
 * form loaded (`baseline`), `pickup_address` as changed leaves; an emptied
 * support phone is `null`. May be empty.
 */
export function settingsPatchBody(
  baseline: SettingsFormValues,
  values: SettingsFormValues,
): ApiSettingsPatch {
  const body: ApiSettingsPatch = {};
  if (values.reservationMinutes !== baseline.reservationMinutes) {
    body.reservation_minutes = values.reservationMinutes;
  }
  if (values.supportPhone !== baseline.supportPhone) {
    body.support_phone = values.supportPhone === "" ? null : values.supportPhone;
  }
  const address: NonNullable<ApiSettingsPatch["pickup_address"]> = {};
  for (const language of LANGUAGES) {
    if (values.pickupAddress[language] !== baseline.pickupAddress[language]) {
      address[language] = values.pickupAddress[language];
    }
  }
  if (Object.keys(address).length > 0) body.pickup_address = address;
  return body;
}

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
    linkedProviders: [...me.linked_providers],
    sessionExpiresAt: me.session_expires_at || null,
    authMethod: "auth_method" in me ? (me.auth_method ?? null) : undefined,
  };
}
