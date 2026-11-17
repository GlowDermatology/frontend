import "server-only";

import type { Metadata } from "next";

import { copyFor } from "@/lib/i18n/admin-locale";

import { shellCopy, type ShellCopy } from "./copy";

type Titles = ShellCopy["titles"];
/** The fixed page titles (`titles.orders`, `titles.newProduct`, …), not the functions. */
export type PageTitleKey = {
  [K in keyof Titles]: Titles[K] extends string ? K : never;
}[keyof Titles];

/**
 * `generateMetadata` of a page with a fixed title, in the admin language (DESIGN §G). The root
 * layout's template adds " — Glow Derma Admin". It reads the locale cookie, which is fine: every
 * admin page streams its body anyway, so the metadata streams with it.
 *
 * ```ts
 * export function generateMetadata() {
 *   return pageMetadata("orders");
 * }
 * ```
 */
export async function pageMetadata(key: PageTitleKey): Promise<Metadata> {
  return { title: (await copyFor(shellCopy)).titles[key] };
}

/** The page titles of the admin language, for `generateMetadata` with a dynamic title. */
export async function pageTitles(): Promise<Titles> {
  return (await copyFor(shellCopy)).titles;
}
