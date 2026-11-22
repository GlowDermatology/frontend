import { Suspense } from "react";

import { LocalizedShell } from "@/features/admin/shell/localized-shell";
import { ShellSkeleton } from "@/features/admin/shell/shell-skeleton";

/**
 * The specialist workspace (`/admin/my-*`): the admin shell with the specialist's own navigation.
 * `LocalizedShell` is its role boundary, so any other staff role goes to `/admin`; a missing
 * session is left to each page's data boundary (`requireSpecialist()`), which redirects to sign-in.
 */
export default function SpecialistLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton workspace="specialist" />}>
      <LocalizedShell workspace="specialist">{children}</LocalizedShell>
    </Suspense>
  );
}
