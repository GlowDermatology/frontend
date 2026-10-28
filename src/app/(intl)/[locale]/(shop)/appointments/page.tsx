import type { Metadata } from "next";

import { AppointmentsPage, appointmentsMetadata } from "@/features/shop/pages/private/booking";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** The customer's upcoming and past appointments (private). */
export function generateMetadata({
  params,
}: PageProps<"/[locale]/appointments">): Promise<Metadata> {
  return appointmentsMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/appointments">) {
  return <AppointmentsPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
