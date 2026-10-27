import { notFound } from "next/navigation";

import { requireStaff } from "@/data/auth";
import { requestNow } from "@/data/now";
import { getOrder } from "@/data/orders";

import { OrderDetailView } from "./order-detail-view";

export async function OrderDetailContent({ params }: { params: Promise<{ orderId: string }> }) {
  await requireStaff();
  const { orderId } = await params;
  const id = /^\d+$/.test(orderId) ? Number(orderId) : Number.NaN;
  const [order, now] = await Promise.all([
    Number.isSafeInteger(id) ? getOrder(id) : null,
    requestNow(),
  ]);
  if (!order) notFound();

  return <OrderDetailView initialOrder={order} now={now.toISOString()} />;
}
