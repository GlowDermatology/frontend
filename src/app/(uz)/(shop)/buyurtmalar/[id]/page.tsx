import type { Metadata } from "next";

import { OrderPage, orderMetadata } from "@/features/shop/pages/private/orders";

/** One order; also the payment return page (`?paid=1`, backend PAYMENT_WEB_RETURN_URL). */
export function generateMetadata({ params }: PageProps<"/buyurtmalar/[id]">): Promise<Metadata> {
  return orderMetadata("uz", params);
}

export default function Page({ params, searchParams }: PageProps<"/buyurtmalar/[id]">) {
  return <OrderPage locale="uz" params={params} searchParams={searchParams} />;
}
