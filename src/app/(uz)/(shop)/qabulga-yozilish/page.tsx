import type { Metadata } from "next";

import { BookingPage, bookingMetadata } from "@/features/shop/pages/private/booking";

/** Booking: specialist, service, date, time, confirm (private: noindex). */
export function generateMetadata(): Promise<Metadata> {
  return bookingMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/qabulga-yozilish">) {
  return <BookingPage locale={"uz"} searchParams={searchParams} />;
}
