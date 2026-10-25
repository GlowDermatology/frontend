import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoriesContent } from "@/features/admin/categories/categories-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Kategoriyalar" };

export default function CategoriesPage() {
  return (
    <AdminShell section="categories">
      <Suspense fallback={<PageSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </AdminShell>
  );
}
