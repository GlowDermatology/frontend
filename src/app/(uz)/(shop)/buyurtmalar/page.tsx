import type { Metadata } from "next";

import { OrdersPage, ordersMetadata } from "@/features/shop/pages/private/orders";

export function generateMetadata(): Promise<Metadata> {
  return ordersMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/buyurtmalar">) {
  return <OrdersPage locale="uz" searchParams={searchParams} />;
}
