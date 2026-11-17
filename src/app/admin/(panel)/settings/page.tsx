import { Suspense } from "react";

import { SettingsContent } from "@/features/admin/settings/settings-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("settings");
}

export default function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
