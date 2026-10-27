import type { Metadata } from "next";

import { OrderPage, orderMetadata } from "@/features/shop/pages/private/orders";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** One order; also the payment return page (`?paid=1`). */
export function generateMetadata({
  params,
}: PageProps<"/[locale]/orders/[id]">): Promise<Metadata> {
  return orderMetadata(intlLocaleFrom(params), params);
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/orders/[id]">) {
  return <OrderPage locale={intlLocaleFrom(params)} params={params} searchParams={searchParams} />;
}
