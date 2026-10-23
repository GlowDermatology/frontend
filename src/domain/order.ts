/**
 * Orders, as modelled on the "Buyurtma holatlari" backend board.
 *
 * The five statuses are shared by the mobile app and the admin panel. Every
 * change is appended to the status history with its source (system, BTS or
 * admin). Money is an integer number of so‘m (UZS).
 */

export const ORDER_STATUSES = [
  "awaiting_payment",
  "processing",
  "handed_to_courier",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentProvider = "click" | "payme";
export type FulfilmentMethod = "delivery" | "pickup";
export type OrderChannel = "ios" | "android";
export type EventSource = "system" | "bts" | "admin";

export type CancellationReason = "reservation_expired" | "admin" | "customer_request";

/** BTS shipment state. Pickup orders never go to BTS. */
export type Shipment =
  | { state: "not_required" }
  | { state: "not_created" }
  | { state: "failed"; lastAttemptAt: string }
  | {
      state: "created";
      trackingNumber: string;
      tariff: number;
      updatedAt: string;
      via: "webhook" | "polling";
    };

export interface CustomerRef {
  id: string;
  name: string;
  /** E.164, e.g. "+998901234567". */
  phone: string;
}

export interface OrderSummary {
  id: number;
  customer: CustomerRef;
  createdAt: string;
  /** Amount charged (or to be charged) to the customer. */
  total: number;
  status: OrderStatus;
  payment: { status: PaymentStatus; provider: PaymentProvider };
  fulfilment: FulfilmentMethod;
  shipment: Shipment;
  cancellation?: { reason: CancellationReason; note?: string };
}

export interface OrderItem {
  productId: string;
  name: string;
  billzId: string;
  quantity: number;
  unitPrice: number;
  /** Promotional items earn no cashback. */
  promo: boolean;
}

export interface OrderEvent {
  at: string;
  title: string;
  source: EventSource;
  note: string;
  /** Set when the event changed the order status. */
  status?: OrderStatus;
}

export interface OrderCashbackEntry {
  kind: "debit" | "credit" | "reversal";
  amount: number;
  /** e.g. "1% × 568 000". */
  label: string;
}

export interface Order extends OrderSummary {
  channel: OrderChannel;
  address?: string;
  items: OrderItem[];
  deliveryFee: number;
  cashbackUsed: number;
  payment: OrderSummary["payment"] & { transactionId?: string; confirmedAt?: string };
  history: OrderEvent[];
  cashback: OrderCashbackEntry[];
}

export function itemsSubtotal(items: ReadonlyArray<OrderItem>): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function promoSubtotal(items: ReadonlyArray<OrderItem>): number {
  return items.filter((i) => i.promo).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/**
 * Status changes an admin may trigger by hand. Payment and BTS updates arrive
 * from integrations; these manual steps cover pickup orders and the case when
 * a BTS webhook never arrives. Cancellation has its own confirmed flow.
 */
export function manualTransitions(order: Pick<Order, "status" | "fulfilment">): OrderStatus[] {
  switch (order.status) {
    case "processing":
      return order.fulfilment === "pickup" ? ["delivered"] : ["handed_to_courier"];
    case "handed_to_courier":
      return ["delivered"];
    case "awaiting_payment":
    case "delivered":
    case "cancelled":
      return [];
  }
}

/** Orders can be cancelled until they are delivered (open question on the board for parcels already with the courier). */
export function canCancel(order: Pick<Order, "status">): boolean {
  return order.status !== "delivered" && order.status !== "cancelled";
}
