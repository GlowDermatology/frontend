import type { Metadata } from "next";
import { Suspense } from "react";

import { getSpecialist } from "@/data/clinic";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { SpecialistDetailContent } from "@/features/admin/specialists/specialist-detail-content";

export async function generateMetadata({
  params,
}: PageProps<"/admin/specialists/[specialistId]">): Promise<Metadata> {
  const specialist = await getSpecialist((await params).specialistId);
  return { title: specialist?.name ?? "Mutaxassis" };
}

export default function SpecialistPage({ params }: PageProps<"/admin/specialists/[specialistId]">) {
  return (
    <AdminShell section="specialists">
      <Suspense fallback={<PageSkeleton />}>
        <SpecialistDetailContent params={params} />
      </Suspense>
    </AdminShell>
  );
}
