import type { Metadata } from "next";

import { ServicesPage, servicesMetadata } from "@/features/shop/pages/services";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services">): Promise<Metadata> {
  return servicesMetadata(await intlLocaleFrom(params));
}

export default async function Page({ params }: PageProps<"/[locale]/services">) {
  return <ServicesPage locale={await intlLocaleFrom(params)} />;
}
