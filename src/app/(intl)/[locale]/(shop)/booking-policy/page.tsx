import type { Metadata } from "next";

import { LegalPage, legalMetadata } from "@/features/shop/pages/legal";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/booking-policy">): Promise<Metadata> {
  return legalMetadata(await intlLocaleFrom(params), "bookingPolicy");
}

export default async function Page({ params }: PageProps<"/[locale]/booking-policy">) {
  return <LegalPage locale={await intlLocaleFrom(params)} kind="bookingPolicy" />;
}
