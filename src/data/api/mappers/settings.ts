import type { SiteSettings, StaffAccount } from "@/domain/settings";

import type { Me } from "../auth";
import type {
  ContactsFormValues,
  LegalTextsFormValues,
  SettingsFormValues,
} from "../../settings.schema";
import type { ApiSettings, ApiSettingsPatch } from "../types";
import { actorName, idString } from "./common";

const LANGUAGES = ["uz", "ru", "en"] as const;

type I18n = { uz?: string | null; ru?: string | null; en?: string | null } | null | undefined;

function i18n(value: I18n): Record<(typeof LANGUAGES)[number], string> {
  return { uz: value?.uz ?? "", ru: value?.ru ?? "", en: value?.en ?? "" };
}

/** `GET settings/` (contract §2.11) → the FE domain type. */
export function mapSettings(api: ApiSettings): SiteSettings {
  return {
    reservationMinutes: api.reservation_minutes,
    supportPhone: api.support_phone,
    pickupAddress: i18n(api.pickup_address),
    storePhone: api.store_phone ?? null,
    cosmetologistPhone: api.cosmetologist_phone ?? null,
    telegramUrl: api.telegram_url ?? null,
    instagramUrl: api.instagram_url ?? null,
    websiteUrl: api.website_url ?? null,
    terms: i18n(api.terms),
    privacyPolicy: i18n(api.privacy_policy),
    bookingPolicy: i18n(api.booking_policy),
    termsVersion: api.terms_version ?? null,
    termsUpdatedAt: api.terms_updated_at ?? null,
    termsUnpublishedChanges: api.terms_unpublished_changes ?? false,
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

/** The contacts card's values for loaded settings (`null` → empty field). */
export function contactsFormValues(settings: SiteSettings): ContactsFormValues {
  return {
    storePhone: settings.storePhone ?? "",
    cosmetologistPhone: settings.cosmetologistPhone ?? "",
    telegramUrl: settings.telegramUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    websiteUrl: settings.websiteUrl ?? "",
  };
}

const CONTACT_FIELDS = [
  ["storePhone", "store_phone"],
  ["cosmetologistPhone", "cosmetologist_phone"],
  ["telegramUrl", "telegram_url"],
  ["instagramUrl", "instagram_url"],
  ["websiteUrl", "website_url"],
] as const;

/** `PATCH settings/` of the contacts card: the changed values only, `""` → `null`. */
export function contactsPatchBody(
  baseline: ContactsFormValues,
  values: ContactsFormValues,
): ApiSettingsPatch {
  const body: ApiSettingsPatch = {};
  for (const [field, key] of CONTACT_FIELDS) {
    if (values[field] !== baseline[field]) body[key] = values[field] === "" ? null : values[field];
  }
  return body;
}

/** The legal texts card's values for loaded settings. */
export function legalTextsFormValues(settings: SiteSettings): LegalTextsFormValues {
  return {
    terms: { ...settings.terms },
    privacyPolicy: { ...settings.privacyPolicy },
    bookingPolicy: { ...settings.bookingPolicy },
  };
}

const LEGAL_FIELDS = [
  ["terms", "terms"],
  ["privacyPolicy", "privacy_policy"],
  ["bookingPolicy", "booking_policy"],
] as const;

/** `PATCH settings/` of the legal texts card: only the changed languages of each text. */
export function legalTextsPatchBody(
  baseline: LegalTextsFormValues,
  values: LegalTextsFormValues,
): ApiSettingsPatch {
  const body: ApiSettingsPatch = {};
  for (const [field, key] of LEGAL_FIELDS) {
    const leaves: Partial<Record<(typeof LANGUAGES)[number], string>> = {};
    for (const language of LANGUAGES) {
      if (values[field][language] !== baseline[field][language]) {
        leaves[language] = values[field][language];
      }
    }
    if (Object.keys(leaves).length > 0) body[key] = leaves;
  }
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
    isManager: Boolean(me.is_manager || me.is_superuser),
    linkedProviders: [...me.linked_providers],
    sessionExpiresAt: me.session_expires_at || null,
    authMethod: "auth_method" in me ? (me.auth_method ?? null) : undefined,
  };
}
