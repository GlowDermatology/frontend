import { passwordDataCopy } from "@/domain/copy/password";
import { settingsDataCopy } from "@/domain/copy/settings";
import { copyFor } from "@/lib/i18n/admin-locale";

import type { OAuthProvider } from "../auth/oauth";
import type { ChangePasswordValues } from "../settings.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/settings.actions.ts`. Nothing is kept: the
 * password change only applies the backend's "different from the current
 * one" rule. Refusals in the admin language, like the backend's.
 */

export async function changePassword(
  values: ChangePasswordValues,
): Promise<ActionResult<{ changed: true }>> {
  await delay(400);
  if (values.newPassword === values.currentPassword) {
    const m = await copyFor(passwordDataCopy);
    return {
      ok: false,
      error: m.checkFields,
      code: "validation_error",
      fieldErrors: { newPassword: m.sameAsCurrent },
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
    const m = await copyFor(settingsDataCopy);
    return { ok: false, error: m.notFound, code: "not_found" };
  }
  return { ok: true, data: { unlinked: provider } };
}
