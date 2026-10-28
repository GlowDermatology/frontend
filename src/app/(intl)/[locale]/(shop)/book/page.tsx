import type { Metadata } from "next";

import { BookingPage, bookingMetadata } from "@/features/shop/pages/private/booking";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** Booking: specialist, service, date, time, confirm (private: noindex). */
export function generateMetadata({ params }: PageProps<"/[locale]/book">): Promise<Metadata> {
  return bookingMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/book">) {
  return <BookingPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
