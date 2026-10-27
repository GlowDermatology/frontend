import type { Metadata } from "next";
import { Suspense } from "react";

import { BannersContent } from "@/features/admin/banners/banners-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Bannerlar" };

export default function BannersPage() {
  return (
    <AdminShell section="banners">
      <Suspense fallback={<PageSkeleton />}>
        <BannersContent />
      </Suspense>
    </AdminShell>
  );
}
