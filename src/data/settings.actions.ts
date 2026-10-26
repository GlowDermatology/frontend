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

import { apiChangePassword, apiPatchSettings } from "./api/admin";
import { apiOAuthUnlink } from "./api/auth";
import { toActionResult } from "./api/mappers/errors";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./auth/oauth";
import { mapSettings, settingsPatchBody } from "./api/mappers/settings";
import * as mock from "./mock/settings.actions";
import {
  changePasswordSchema,
  settingsFormSchema,
  type ChangePasswordValues,
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
