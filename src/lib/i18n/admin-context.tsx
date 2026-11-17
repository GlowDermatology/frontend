"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CopySet } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The admin panel's language on the client. The provider is mounted by the admin shell (`(panel)/layout.tsx`)
 * with the locale read on the server (`getAdminLocale`). Without a provider the default is Uzbek, so components
 * rendered on their own (static-markup tests, the sign-in page before a choice) stay in the source language.
 */
const AdminLocaleContext = createContext<Locale>("uz");

export function AdminLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <AdminLocaleContext value={locale}>{children}</AdminLocaleContext>;
}

/** The admin language in a client component. */
export function useAdminLocale(): Locale {
  return useContext(AdminLocaleContext);
}

/** The current language's slice of a copy module: `const t = useCopy(ordersCopy)`. */
export function useCopy<T>(copy: CopySet<T>): CopySet<T>[Locale] {
  return copy[useContext(AdminLocaleContext)];
}
