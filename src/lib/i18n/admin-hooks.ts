import { useSyncExternalStore } from "react";

import { createFormatter, type AdminFormatter } from "@/lib/format";
import { useAdminLocale } from "@/lib/i18n/admin-context";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import type { Localized } from "@/lib/i18n/localized";

/**
 * Client-component hooks of the admin i18n (DESIGN §G), next to `useCopy` / `useAdminLocale` from
 * `admin-context.tsx`. They read the `AdminLocaleProvider` mounted by the panel shell; without one
 * (static-markup tests, pages outside the shell) the language is Uzbek.
 */

/** The admin formatter of the current language: `const fmt = useFormat(); fmt.som(total)`. */
export function useFormat(): AdminFormatter {
  return createFormatter(useAdminLocale());
}

/** The current language's member of a `localized(...)` value: `useLocalized(productSchemas)`. */
export function useLocalized<T>(values: Localized<T>): T {
  return values[useAdminLocale()];
}

const noSubscribe = () => () => {};
const documentLocale = (): Locale => {
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : "uz";
};
const serverLocale = (): Locale => "uz";

/**
 * The admin language for client components rendered OUTSIDE the panel shell (the admin root
 * `error.tsx`, the sign-in pages): `<html lang>`, which the head script set from the cookie before
 * the first paint. Renders Uzbek on the server and during hydration, then the document's language.
 */
export function useDocumentAdminLocale(): Locale {
  return useSyncExternalStore(noSubscribe, documentLocale, serverLocale);
}
