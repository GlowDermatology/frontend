import { Badge, type Tone } from "@/components/ui/badge";
import type { OrderLabels } from "@/domain/copy/orders";
import {
  PAYMENT_PROVIDER_NAME,
  type OrderStatus,
  type PaymentProvider,
  type PaymentStatus,
  type RefundState,
} from "@/domain/order";

/**
 * The shared tones of the order, payment and refund states. The words live in
 * `orderLabelsCopy` (`src/domain/copy/orders.ts`, uz / ru / en): pass the current language's
 * slice (`useCopy(orderLabelsCopy)` / `await copyFor(orderLabelsCopy)`) to the badges.
 */
export const ORDER_STATUS_META: Record<OrderStatus, { tone: Tone }> = {
  awaiting_payment: { tone: "warning" },
  processing: { tone: "gold" },
  handed_to_courier: { tone: "neutral" },
  delivered: { tone: "success" },
  cancelled: { tone: "danger" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { tone: Tone }> = {
  pending: { tone: "warning" },
  paid: { tone: "success" },
  failed: { tone: "danger" },
  refunded: { tone: "neutral" },
};

/** Provider names are brands: the same in every language. */
export const PROVIDER_LABEL: Record<PaymentProvider, string> = PAYMENT_PROVIDER_NAME;

/** Refund states (contract §5.1 labels): settled green, waiting amber, needing a person red. */
export const REFUND_TONE: Record<RefundState, Tone> = {
  requested: "warning",
  submitting: "warning",
  succeeded: "success",
  failed: "danger",
  manual_required: "warning",
  unknown: "danger",
};

type StatusLabels = Pick<OrderLabels, "status" | "paymentStatus" | "refundState">;

export function OrderStatusBadge({
  status,
  labels,
}: {
  status: OrderStatus;
  labels: StatusLabels;
}) {
  return <Badge tone={ORDER_STATUS_META[status].tone}>{labels.status[status]}</Badge>;
}

export function PaymentStatusBadge({
  status,
  labels,
}: {
  status: PaymentStatus;
  labels: StatusLabels;
}) {
  return <Badge tone={PAYMENT_STATUS_META[status].tone}>{labels.paymentStatus[status]}</Badge>;
}

export function RefundStateBadge({ state, labels }: { state: RefundState; labels: StatusLabels }) {
  return <Badge tone={REFUND_TONE[state]}>{labels.refundState[state]}</Badge>;
}
