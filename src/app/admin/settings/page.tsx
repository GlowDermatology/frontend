import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsContent } from "@/features/admin/settings/settings-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Sozlamalar" };

export default function SettingsPage() {
  return (
    <AdminShell section="settings">
      <Suspense fallback={<PageSkeleton />}>
        <SettingsContent />
      </Suspense>
    </AdminShell>
  );
}
