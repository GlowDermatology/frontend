import type { Metadata } from "next";
import { Suspense } from "react";

import { getSpecialist } from "@/data/clinic";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageTitles } from "@/features/admin/shell/page-metadata";
import { SpecialistDetailContent } from "@/features/admin/specialists/specialist-detail-content";

export async function generateMetadata({
  params,
}: PageProps<"/admin/specialists/[specialistId]">): Promise<Metadata> {
  const [specialist, titles] = await Promise.all([
    params.then(({ specialistId }) => getSpecialist(specialistId)),
    pageTitles(),
  ]);
  return { title: specialist?.name ?? titles.specialist };
}

export default function SpecialistPage({ params }: PageProps<"/admin/specialists/[specialistId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SpecialistDetailContent params={params} />
    </Suspense>
  );
}
