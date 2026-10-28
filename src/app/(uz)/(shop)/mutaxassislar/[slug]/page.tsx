import type { Metadata } from "next";

import { SpecialistPage, specialistMetadata } from "@/features/shop/pages/specialists";

export function generateMetadata({
  params,
}: PageProps<"/mutaxassislar/[slug]">): Promise<Metadata> {
  return specialistMetadata("uz", params);
}

export default function Page({ params }: PageProps<"/mutaxassislar/[slug]">) {
  return <SpecialistPage locale="uz" params={params} />;
}
