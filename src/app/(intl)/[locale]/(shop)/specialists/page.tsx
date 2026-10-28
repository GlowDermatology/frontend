import type { Metadata } from "next";

import { SpecialistsPage, specialistsMetadata } from "@/features/shop/pages/specialists";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/specialists">): Promise<Metadata> {
  return specialistsMetadata(await intlLocaleFrom(params));
}

export default async function Page({ params }: PageProps<"/[locale]/specialists">) {
  return <SpecialistsPage locale={await intlLocaleFrom(params)} />;
}
