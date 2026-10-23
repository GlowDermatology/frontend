import { Badge, type Tone } from "@/components/ui/badge";
import type { FulfilmentMethod, OrderStatus, PaymentProvider, PaymentStatus } from "@/domain/order";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: "To‘lov kutilmoqda", tone: "warning" },
  processing: { label: "Jarayonda", tone: "gold" },
  handed_to_courier: { label: "Kuryerga topshirildi", tone: "neutral" },
  delivered: { label: "Yetkazildi", tone: "success" },
  cancelled: { label: "Bekor qilindi", tone: "danger" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Kutilmoqda", tone: "warning" },
  paid: { label: "To‘langan", tone: "success" },
  failed: { label: "Muvaffaqiyatsiz", tone: "danger" },
  refunded: { label: "Qaytarilgan", tone: "neutral" },
};

export const PROVIDER_LABEL: Record<PaymentProvider, string> = { click: "Click", payme: "Payme" };

export const FULFILMENT_LABEL: Record<FulfilmentMethod, string> = {
  delivery: "Yetkazib berish",
  pickup: "Olib ketish",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
