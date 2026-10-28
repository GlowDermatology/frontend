import type { Metadata } from "next";

import { SpecialistPage, specialistMetadata } from "@/features/shop/pages/specialists";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({
  params,
}: PageProps<"/[locale]/specialists/[slug]">): Promise<Metadata> {
  return specialistMetadata(intlLocaleFrom(params), params);
}

export default function Page({ params }: PageProps<"/[locale]/specialists/[slug]">) {
  return <SpecialistPage locale={intlLocaleFrom(params)} params={params} />;
}
