import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { createFormatter, type AdminFormatter } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locales";
import type { Localized } from "@/lib/i18n/localized";

import { ADMIN_LOCALE_COOKIE, parseAdminLocale } from "./admin-locale-cookie";

/**
 * The admin language on the server (DESIGN §G): the `gd_admin_language` cookie, Uzbek when absent
 * or unknown. Cached per request with React `cache()`, so a page, its metadata and its Server
 * Components read the cookie once.
 *
 * It reads `cookies()`: under Cache Components call it inside a `<Suspense>` boundary (every admin
 * page body already is, and `(panel)/layout.tsx` puts the whole shell inside one), in
 * `generateMetadata`, in Server Actions and in Route Handlers.
 */
export const getAdminLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return parseAdminLocale(store.get(ADMIN_LOCALE_COOKIE)?.value);
});

/** The current language's slice of a copy module in a Server Component / Action / Route Handler. */
export async function copyFor<T>(copy: CopySet<T>): Promise<CopySet<T>[Locale]> {
  return copy[await getAdminLocale()];
}

/** The admin formatter of the current language (`createFormatter(await getAdminLocale())`). */
export async function getFormat(): Promise<AdminFormatter> {
  return createFormatter(await getAdminLocale());
}

/** The current language's member of a `localized(...)` value (e.g. a zod schema). */
export async function getLocalized<T>(values: Localized<T>): Promise<T> {
  return values[await getAdminLocale()];
}

export {
  ADMIN_LOCALE_COOKIE,
  adminLocaleCookie,
  applyAdminLocaleCookie,
  knownAdminLocale,
  parseAdminLocale,
} from "./admin-locale-cookie";
