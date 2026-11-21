import { Suspense } from "react";

import { getMe, requireStaff } from "@/data/auth";
import { MyScheduleFrame } from "@/features/admin/my-schedule/frame";
import { SettingsContent } from "@/features/admin/settings/settings-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { LocalizedShell } from "@/features/admin/shell/localized-shell";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("settings");
}

async function AccountSettings({ searchParams }: PageProps<"/admin/settings">) {
  await requireStaff();
  const specialist = (await getMe())?.role === "specialist";
  const Shell = specialist ? MyScheduleFrame : LocalizedShell;
  return (
    <Shell>
      <SettingsContent searchParams={searchParams} specialist={specialist} />
    </Shell>
  );
}

export default function SettingsPage(props: PageProps<"/admin/settings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountSettings {...props} />
    </Suspense>
  );
}
