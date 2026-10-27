import {
  hasVisibleText,
  nextTermsVersion,
  PUBLISH_NEEDS_UZ_MESSAGE,
  type SiteSettings,
} from "@/domain/settings";
import { toLocalIsoDate } from "@/lib/format";

import type { OAuthProvider } from "../auth/oauth";
import { referenceNow } from "../config";
import type {
  ChangePasswordValues,
  ContactsFormValues,
  LegalTextsFormValues,
  SettingsFormValues,
} from "../settings.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { MOCK_SETTINGS } from "./settings";

/**
 * Mock implementation of `src/data/settings.actions.ts`. Nothing is kept: the
 * answer is the fixture with the submitted values, and the password change
 * only applies the backend's "different from the current one" rule.
 */

export async function updateSettings(
  values: SettingsFormValues,
): Promise<ActionResult<SiteSettings>> {
  await delay(400);
  return {
    ok: true,
    data: {
      ...MOCK_SETTINGS,
      reservationMinutes: values.reservationMinutes,
      supportPhone: values.supportPhone || null,
      pickupAddress: { ...values.pickupAddress },
      updatedAt: referenceNow().toISOString(),
      updatedBy: "Administrator",
    },
  };
}

/** `PATCH settings/` of the contacts card; `""` clears a value like the API's `null`. */
export async function updateContacts(
  values: ContactsFormValues,
): Promise<ActionResult<SiteSettings>> {
  await delay(400);
  return {
    ok: true,
    data: {
      ...MOCK_SETTINGS,
      storePhone: values.storePhone || null,
      cosmetologistPhone: values.cosmetologistPhone || null,
      telegramUrl: values.telegramUrl || null,
      instagramUrl: values.instagramUrl || null,
      websiteUrl: values.websiteUrl || null,
      updatedAt: referenceNow().toISOString(),
      updatedBy: "Administrator",
    },
  };
}

/** The server's normalisation of a legal text (§2.11): trimmed, LF, invisible-only → `""`. */
function normalText(value: string): string {
  const text = value.replace(/\r\n?/g, "\n").trim();
  return hasVisibleText(text) ? text : "";
}

function normalTexts(texts: LegalTextsFormValues["terms"]): LegalTextsFormValues["terms"] {
  return { uz: normalText(texts.uz), ru: normalText(texts.ru), en: normalText(texts.en) };
}

/**
 * `PATCH settings/` of the legal texts card. Saving never publishes: the
 * answer flags unpublished changes when a terms / privacy draft differs from
 * the fixture's (published) texts. Nothing is kept.
 */
export async function updateLegalTexts(
  values: LegalTextsFormValues,
): Promise<ActionResult<SiteSettings>> {
  await delay(400);
  const terms = normalTexts(values.terms);
  const privacyPolicy = normalTexts(values.privacyPolicy);
  const unpublished =
    JSON.stringify([terms, privacyPolicy]) !==
    JSON.stringify([MOCK_SETTINGS.terms, MOCK_SETTINGS.privacyPolicy]);
  return {
    ok: true,
    data: {
      ...MOCK_SETTINGS,
      terms,
      privacyPolicy,
      bookingPolicy: normalTexts(values.bookingPolicy),
      termsUnpublishedChanges: unpublished,
      updatedAt: referenceNow().toISOString(),
      updatedBy: "Administrator",
    },
  };
}

/**
 * `POST settings/terms/publish/` against the drafts the card holds (the
 * demo keeps no saved drafts): 409 without the Uzbek terms or privacy text,
 * otherwise the next version of the Tashkent day.
 */
export async function publishTerms(
  drafts: Pick<SiteSettings, "terms" | "privacyPolicy" | "bookingPolicy" | "termsVersion">,
): Promise<ActionResult<SiteSettings>> {
  await delay(500);
  if (!hasVisibleText(drafts.terms.uz) || !hasVisibleText(drafts.privacyPolicy.uz)) {
    return { ok: false, error: PUBLISH_NEEDS_UZ_MESSAGE, code: "conflict" };
  }
  const now = referenceNow();
  return {
    ok: true,
    data: {
      ...MOCK_SETTINGS,
      terms: { ...drafts.terms },
      privacyPolicy: { ...drafts.privacyPolicy },
      bookingPolicy: { ...drafts.bookingPolicy },
      termsVersion: nextTermsVersion(drafts.termsVersion, toLocalIsoDate(now)),
      termsUpdatedAt: now.toISOString(),
      termsUnpublishedChanges: false,
      updatedAt: now.toISOString(),
      updatedBy: "Administrator",
    },
  };
}

export async function changePassword(
  values: ChangePasswordValues,
): Promise<ActionResult<{ changed: true }>> {
  await delay(400);
  if (values.newPassword === values.currentPassword) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { newPassword: "Yangi parol eskisidan farq qilsin." },
    };
  }
  return { ok: true, data: { changed: true } };
}

/** The demo account's linked providers (`MOCK_ME.linked_providers` in `src/data/auth.ts`). */
const MOCK_LINKED: readonly string[] = [];

/**
 * `DELETE auth/oauth/{provider}/`: the demo account links nothing, so like
 * the backend this answers 404 for a provider that is not linked; nothing is
 * kept either way.
 */
export async function unlinkSocialAccount(
  provider: OAuthProvider,
): Promise<ActionResult<{ unlinked: OAuthProvider }>> {
  await delay(300);
  if (!MOCK_LINKED.includes(provider)) {
    return { ok: false, error: "Topilmadi.", code: "not_found" };
  }
  return { ok: true, data: { unlinked: provider } };
}
