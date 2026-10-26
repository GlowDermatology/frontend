import type { SiteSettings } from "@/domain/settings";

import type { OAuthProvider } from "../auth/oauth";
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
