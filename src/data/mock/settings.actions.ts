import type { SiteSettings } from "@/domain/settings";

import { referenceNow } from "../config";
import type { ChangePasswordValues, SettingsFormValues } from "../settings.schema";
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
