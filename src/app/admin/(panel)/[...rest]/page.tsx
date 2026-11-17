import { notFound } from "next/navigation";

import { pageMetadata } from "@/features/admin/shell/page-metadata";

/**
 * The page only ever throws `notFound()`, so there is nothing for the dev-time instant-navigation
 * validation to render (it would report "an error prevented the target segment from rendering").
 */
export const instant = false;

export function generateMetadata() {
  return pageMetadata("notFound");
}

/**
 * Any `/admin/…` address that matches no page: the localized 404 inside the shell
 * (`(panel)/not-found.tsx`), so the navigation stays available.
 */
export default function UnknownAdminPage(): never {
  notFound();
}
