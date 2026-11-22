import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { MyProfileContent } from "@/features/admin/workspace/my-profile-content";

export function generateMetadata() {
  return pageMetadata("my-profile");
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyProfileContent />
    </Suspense>
  );
}
