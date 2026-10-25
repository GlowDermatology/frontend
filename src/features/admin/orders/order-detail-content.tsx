import { notFound } from "next/navigation";

import { requireStaff } from "@/data/auth";
import { referenceNow } from "@/data/config";
import { getOrder } from "@/data/orders";

import { OrderDetailView } from "./order-detail-view";

export async function OrderDetailContent({ params }: { params: Promise<{ orderId: string }> }) {
  await requireStaff();
  const { orderId } = await params;
  const id = /^\d+$/.test(orderId) ? Number(orderId) : Number.NaN;
  const order = Number.isSafeInteger(id) ? await getOrder(id) : null;
  if (!order) notFound();

  return <OrderDetailView initialOrder={order} now={referenceNow().toISOString()} />;
}
