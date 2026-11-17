import { Suspense } from "react";

import { CategoriesContent } from "@/features/admin/categories/categories-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("categories");
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoriesContent />
    </Suspense>
  );
}
