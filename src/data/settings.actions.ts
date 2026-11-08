"use server";

import { z } from "zod";

import { apiMutation, fieldErrorsFrom, guardAction, sessionToken } from "./action-guard";
import { apiChangePassword } from "./api/admin";
import { apiOAuthUnlink } from "./api/auth";
import { toActionResult } from "./api/mappers/errors";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./auth/oauth";
import * as mock from "./mock/settings.actions";
import { changePasswordSchema, type ChangePasswordValues } from "./settings.schema";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Account mutations of /admin/settings: the staff password change
 * `POST auth/change-password/` (contract §2.1: revokes the other sessions;
 * the current one stays signed in; field errors come back on
 * `currentPassword` and `newPassword`) and unlinking a social sign-in
 * provider. The store settings, contacts and legal texts are edited in the
 * ops console, not through the admin API.
 */

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
