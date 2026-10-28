import type { Metadata } from "next";

import { OrdersPage, ordersMetadata } from "@/features/shop/pages/private/orders";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({ params }: PageProps<"/[locale]/orders">): Promise<Metadata> {
  return ordersMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/orders">) {
  return <OrdersPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
