"use server";

import type { SiteSettings } from "@/domain/settings";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { z } from "zod";

import { apiChangePassword, apiPatchSettings, apiPublishTerms } from "./api/admin";
import { apiOAuthUnlink } from "./api/auth";
import { toActionResult } from "./api/mappers/errors";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./auth/oauth";
import {
  contactsPatchBody,
  legalTextsPatchBody,
  mapSettings,
  settingsPatchBody,
} from "./api/mappers/settings";
import * as mock from "./mock/settings.actions";
import {
  changePasswordSchema,
  contactsFormSchema,
  legalTextsFormSchema,
  settingsFormSchema,
  type ChangePasswordValues,
  type ContactsFormValues,
  type LegalTextsFormValues,
  type SettingsFormValues,
} from "./settings.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Settings mutations: `PATCH settings/` with only the fields that differ
 * from the values the form loaded (contract §2.11), and the staff password
 * change `POST auth/change-password/` (§2.1: revokes the other sessions;
 * the current one stays signed in). Field errors come back on the forms'
 * names (`reservationMinutes`, `supportPhone`, `pickupAddress.uz`,
 * `currentPassword`, `newPassword`).
 */

export async function updateSettings(
  values: SettingsFormValues,
  baseline: SettingsFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<SiteSettings>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = settingsFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  // The baseline only decides what is sent; a malformed one sends every field.
  const parsedBaseline = settingsFormSchema.safeParse(baseline);
  const base = parsedBaseline.success
    ? parsedBaseline.data
    : {
        reservationMinutes: -1,
        supportPhone: "\0",
        pickupAddress: { uz: "\0", ru: "\0", en: "\0" },
      };
  if ((await dataSource()) === "api") {
    return apiMutation("updateSettings", async () => {
      try {
        const { data } = await apiPatchSettings(
          sessionToken(guard.session),
          settingsPatchBody(base, parsed.data),
          parsedKey.data,
        );
        return { ok: true, data: mapSettings(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateSettings(parsed.data);
}

/**
 * The contacts card (gap X-SET-CONTACTS): `PATCH settings/` with the changed
 * phones and links only; `""` clears a value (`null`). Field errors come
 * back on `storePhone`, `cosmetologistPhone`, `telegramUrl`, `instagramUrl`
 * and `websiteUrl`.
 */
export async function updateContacts(
  values: ContactsFormValues,
  baseline: ContactsFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<SiteSettings>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = contactsFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  // The baseline only decides what is sent; a malformed one sends every field.
  const parsedBaseline = contactsFormSchema.safeParse(baseline);
  const base: ContactsFormValues = parsedBaseline.success
    ? parsedBaseline.data
    : {
        storePhone: "\0",
        cosmetologistPhone: "\0",
        telegramUrl: "\0",
        instagramUrl: "\0",
        websiteUrl: "\0",
      };
  if ((await dataSource()) === "api") {
    return apiMutation("updateContacts", async () => {
      try {
        const { data } = await apiPatchSettings(
          sessionToken(guard.session),
          contactsPatchBody(base, parsed.data),
          parsedKey.data,
        );
        return { ok: true, data: mapSettings(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateContacts(parsed.data);
}

const UNKNOWN_TEXT = { uz: "\0", ru: "\0", en: "\0" };

/**
 * The legal texts card (gap X-SET-LEGAL): `PATCH settings/` with the changed
 * languages of the terms and privacy DRAFTS and of the booking policy.
 * Saving never publishes (`publishTerms` does). Field errors come back as
 * `terms.uz`, `privacyPolicy.ru`, `bookingPolicy.en`, …
 */
export async function updateLegalTexts(
  values: LegalTextsFormValues,
  baseline: LegalTextsFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<SiteSettings>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = legalTextsFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const parsedBaseline = legalTextsFormSchema.safeParse(baseline);
  const base: LegalTextsFormValues = parsedBaseline.success
    ? parsedBaseline.data
    : { terms: UNKNOWN_TEXT, privacyPolicy: UNKNOWN_TEXT, bookingPolicy: UNKNOWN_TEXT };
  if ((await dataSource()) === "api") {
    return apiMutation("updateLegalTexts", async () => {
      try {
        const { data } = await apiPatchSettings(
          sessionToken(guard.session),
          legalTextsPatchBody(base, parsed.data),
          parsedKey.data,
        );
        return { ok: true, data: mapSettings(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateLegalTexts(parsed.data);
}

/**
 * `POST settings/terms/publish/` (contract §2.11; `Idempotency-Key`
 * required, one per confirmation dialog): publishes the saved terms and
 * privacy drafts as a new `terms_version`, after which every customer is
 * asked to accept it again. 409 `conflict` without the Uzbek texts.
 *
 * `drafts` is used by the demo only (it keeps no saved drafts); the API
 * publishes what it stored.
 */
export async function publishTerms(
  drafts: LegalTextsFormValues & { termsVersion: string | null },
  key: string,
  csrf: string,
): Promise<ActionResult<SiteSettings>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  if ((await dataSource()) === "api") {
    return apiMutation("publishTerms", async () => {
      try {
        const { data } = await apiPublishTerms(sessionToken(guard.session), parsedKey.data);
        return { ok: true, data: mapSettings(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  const parsed = legalTextsFormSchema.safeParse(drafts);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const version =
    typeof drafts.termsVersion === "string" && /^\d{8}-\d+$/.test(drafts.termsVersion)
      ? drafts.termsVersion
      : null;
  return mock.publishTerms({ ...parsed.data, termsVersion: version });
}

/** No idempotency key: `auth/*` endpoints never store responses (§1.7). */
export async function changePassword(
  values: ChangePasswordValues,
  csrf: string,
): Promise<ActionResult<{ changed: true }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    try {
      await apiChangePassword(sessionToken(guard.session), {
        current_password: parsed.data.currentPassword,
        new_password: parsed.data.newPassword,
      });
      return { ok: true, data: { changed: true } };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return mock.changePassword(parsed.data);
}

const providerSchema = z.enum(OAUTH_PROVIDERS, { error: "Ruxsat etilmagan qiymat." });

/**
 * Unlinks the caller's Google or Facebook identity (contract §2.1
 * `DELETE auth/oauth/{provider}/` → 204, 404 when none is linked). No
 * idempotency key: `auth/*` endpoints never store responses (§1.7). Linking
 * is the OAuth redirect (`/admin/auth/oauth/{provider}/start?intent=link`),
 * not an action. The route refreshes, so the card shows `auth/me/` again.
 */
export async function unlinkSocialAccount(
  provider: string,
  csrf: string,
): Promise<ActionResult<{ unlinked: OAuthProvider }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    return apiMutation("unlinkSocialAccount", async () => {
      try {
        await apiOAuthUnlink(sessionToken(guard.session), parsed.data);
        return { ok: true, data: { unlinked: parsed.data } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.unlinkSocialAccount(parsed.data);
}
