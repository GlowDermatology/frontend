import type { Metadata } from "next";

import { AppointmentsPage, appointmentsMetadata } from "@/features/shop/pages/private/booking";

/** The customer's upcoming and past appointments (private). */
export function generateMetadata(): Promise<Metadata> {
  return appointmentsMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/qabullarim">) {
  return <AppointmentsPage locale={"uz"} searchParams={searchParams} />;
}
