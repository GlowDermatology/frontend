import type { Metadata } from "next";

import { LegalPage, legalMetadata } from "@/features/shop/pages/legal";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  return legalMetadata(await intlLocaleFrom(params), "terms");
}

export default async function Page({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage locale={await intlLocaleFrom(params)} kind="terms" />;
}
