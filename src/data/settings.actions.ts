"use server";

import type { SiteSettings } from "@/domain/settings";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiChangePassword, apiPatchSettings } from "./api/admin";
import { toActionResult } from "./api/mappers/errors";
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
