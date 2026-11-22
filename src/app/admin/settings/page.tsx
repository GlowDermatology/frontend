import { Suspense } from "react";

import { getMe, requireStaff } from "@/data/auth";
import { SettingsContent } from "@/features/admin/settings/settings-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { LocalizedShell } from "@/features/admin/shell/localized-shell";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("settings");
}

/**
 * Account settings, shared by both workspaces: the page sits outside the `(panel)` and
 * `(specialist)` groups and picks the caller's shell itself.
 */
async function AccountSettings({ searchParams }: PageProps<"/admin/settings">) {
  await requireStaff();
  const workspace = (await getMe())?.role === "specialist" ? "specialist" : "admin";
  return (
    <LocalizedShell workspace={workspace}>
      <SettingsContent searchParams={searchParams} workspace={workspace} />
    </LocalizedShell>
  );
}

export default function SettingsPage(props: PageProps<"/admin/settings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountSettings {...props} />
    </Suspense>
  );
}
