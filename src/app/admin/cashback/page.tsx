import type { Metadata } from "next";
import { Suspense } from "react";

import { CashbackContent } from "@/features/admin/cashback/cashback-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Cashback sozlamalari" };

export default function CashbackSettingsPage() {
  return (
    <AdminShell section="cashback">
      <Suspense fallback={<PageSkeleton />}>
        <CashbackContent />
      </Suspense>
    </AdminShell>
  );
}
