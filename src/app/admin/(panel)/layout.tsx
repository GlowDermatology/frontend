import { Suspense } from "react";

import { LocalizedShell } from "@/features/admin/shell/localized-shell";
import { ShellSkeleton } from "@/features/admin/shell/shell-skeleton";

/**
 * The admin panel's shell, shared by every page of the `(panel)` group (URLs unchanged; the sign-in
 * and `auth/*` routes stay outside it). The shell is localized from the `gd_admin_language`
 * cookie, a request-time read, so it streams inside this boundary: the prerendered static shell is
 * `ShellSkeleton`, and the pages' own `<Suspense>` boundaries stream their data within it.
 */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <LocalizedShell workspace="admin">{children}</LocalizedShell>
    </Suspense>
  );
}
