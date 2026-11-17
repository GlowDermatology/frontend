"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";

import { serverEnv } from "@/lib/env.server";
import {
  applyAdminLocaleCookie,
  copyFor,
  getAdminLocale,
  knownAdminLocale,
} from "@/lib/i18n/admin-locale";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { guardAction, sessionToken } from "./action-guard";
import { apiFetch } from "./api/client";
import { toActionResult } from "./api/mappers/errors";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * The admin language (DESIGN §G). The signed-in member's choice is stored twice: on the account
 * (`StaffUser.language`, so it follows them to other devices and is set again at the next sign-in)
 * and in this browser's `gd_admin_language` cookie (what the panel renders from).
 */

/**
 * Settings → «Interfeys tili»: `PATCH auth/me/ {language}` (no idempotency key: `auth/*` never
 * stores responses, §1.7), then the cookie, then `refresh()` so the whole panel — shell, page and
 * metadata — re-renders in the new language in the same roundtrip. Mock mode keeps the account
 * as it is (nothing is saved) and only sets the cookie, so the switch is still demonstrable.
 * A failed `PATCH` changes nothing: the cookie is written only after the account accepted it.
 */
export async function saveAdminLanguage(
  language: string,
  csrf: string,
): Promise<ActionResult<{ language: Locale }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const locale = knownAdminLocale(language);
  if (!locale) {
    const m = await copyFor(validationCopy);
    return { ok: false, error: m.notAllowed, fieldErrors: { language: m.notAllowed } };
  }
  if ((await dataSource()) === "api") {
    try {
      // Hand-typed until the OpenAPI types carry `language` (backend §E adds it to `auth/me/`).
      await apiFetch<unknown>("/api/v1/admin/auth/me/", {
        method: "PATCH",
        body: { language: locale },
        token: sessionToken(guard.session),
        locale,
      });
    } catch (error) {
      return toActionResult(error);
    }
  }
  applyAdminLocaleCookie(await cookies(), locale, serverEnv.cookieSecure());
  refresh();
  return { ok: true, data: { language: locale } };
}

/**
 * The sign-in page's small language switcher: sets the cookie only (nobody is signed in yet; the
 * account's saved language replaces it at sign-in). No csrf: the value is one of three languages
 * and changes nothing but this browser's display. Answers the language now in effect.
 */
export async function chooseSignInLanguage(language: string): Promise<{ language: Locale }> {
  const locale = knownAdminLocale(language);
  if (!locale) return { language: await getAdminLocale() };
  applyAdminLocaleCookie(await cookies(), locale, serverEnv.cookieSecure());
  refresh();
  return { language: locale };
}
