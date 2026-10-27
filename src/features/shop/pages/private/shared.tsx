import "server-only";

import { notFound } from "next/navigation";

import { storefrontEnabled } from "@/data/shop/mode";
import { requireCustomer } from "@/data/shop/private";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Helpers of the private page modules (`./*.tsx`): the route files pass the
 * locale (a value for `/…`, a promise from `params` for `/ru/…`, `/en/…`)
 * and the search params; every private body checks the storefront mode and
 * the session inside its Suspense boundary.
 */

export type LocaleInput = Locale | Promise<Locale>;
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function pageNumber(value: string | string[] | undefined): number {
  const number = Number(first(value));
  return Number.isInteger(number) && number >= 1 && number <= 10_000 ? number : 1;
}

/**
 * The prologue of a private page body: mock mode has no storefront (404),
 * and a visitor without a live session goes through the refresh route or to
 * sign in, with `next` = this page.
 */
export async function privateGate(locale: Locale, next: string): Promise<void> {
  if (!(await storefrontEnabled())) notFound();
  await requireCustomer(locale, next);
}
