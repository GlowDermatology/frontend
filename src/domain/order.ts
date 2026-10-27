/**
 * Orders, as modelled on the "Buyurtma holatlari" backend board.
 *
 * The five statuses are shared by the mobile app and the admin panel. Every
 * change is appended to the status history with its source (system, BTS or
 * admin). Money is an integer number of so‘m (UZS).
 */
import type { ProductArtRef } from "./product";

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
/** `web` = the customer website (backend B-W1). */
export type OrderChannel = "ios" | "android" | "web";
export type EventSource = "system" | "bts" | "admin";

export type CancellationReason = "reservation_expired" | "admin" | "customer_request";

/** BTS shipment state. Pickup orders never go to BTS. */
export type Shipment =
  | { state: "not_required" }
  | {
      state: "not_created";
      /** A BTS create message is queued or in flight (contract §2.2). */
      pending?: boolean;
    }
  | {
      state: "failed";
      lastAttemptAt: string;
      /** Number of BTS create attempts so far. */
      attempts?: number;
      pending?: boolean;
    }
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
  /** Thumbnail illustration (mock fixtures); `null` with the API. */
  art: ProductArtRef | null;
  /** Product photo snapshotted at checkout (API); rendered before `art`. */
  imageUrl?: string;
  billzId: string;
  quantity: number;
  unitPrice: number;
  /** Promotional items earn no cashback. */
  promo: boolean;
}

export interface OrderEvent {
  /** API event id (the host row's id once folded); absent in older fixtures. */
  id?: number;
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

export const REFUND_STATES = [
  "requested",
  "submitting",
  "succeeded",
  "failed",
  "manual_required",
  "unknown",
] as const;

export type RefundState = (typeof REFUND_STATES)[number];

/**
 * Why a refund was created `manual_required` (contract §4
 * `refund_requested.manual_reason`, M2): Payme refunds are cabinet refunds;
 * a Click payment without a Click payment id (`no_paydoc`, seeded or legacy
 * rows) or a Click port that is fake under the production settings
 * (`fake_mode`) is paid out by hand and closed with "Qaytarildi".
 */
export const MANUAL_REFUND_REASONS = ["payme", "no_paydoc", "fake_mode"] as const;
export type ManualRefundReason = (typeof MANUAL_REFUND_REASONS)[number];

/** A refund of the order's payment (contract §2.2 `Refund`). */
export interface Refund {
  id: number;
  state: RefundState;
  provider: PaymentProvider;
  amount: number;
  requestedAt: string;
  updatedAt: string;
  /** Set once the refund succeeded. */
  completedAt?: string;
  /**
   * Why the refund is (or was) `manual_required`: the refund's own
   * `manual_reason` (M3, in `orders/{id}/` `refunds[]` and the `payments/`
   * rows; it stays after the refund is resolved), else — for a refund the
   * API answers without one — the `refund_requested` event's `manual_reason`
   * (order detail only, since only it reads the history). Absent for a
   * refund that was never manual.
   */
  manualReason?: ManualRefundReason;
}

/**
 * Short, provider-neutral names of the refund states, for the payments
 * filter and the state badges. `manual_required` is a Click refund too since
 * M2, so its name does not say Payme; the instruction is `refundStateLine`.
 */
export const REFUND_STATE_LABEL: Record<RefundState, string> = {
  requested: "Qaytarish so‘raldi",
  submitting: "Qaytarilmoqda",
  succeeded: "Qaytarildi",
  failed: "Qaytarib bo‘lmadi",
  manual_required: "Qo‘lda qaytarish kerak",
  unknown: "Holat noma’lum · tekshiring",
};

/** The §5.1 line of a `manual_required` refund, by provider (never assume Payme). */
export const MANUAL_REFUND_LINE: Record<PaymentProvider, string> = {
  payme: "Payme kabinetida qaytarish kerak",
  click: "Mijozga qo‘lda to‘lang, so‘ng «Qaytarildi» deb belgilang",
};

/**
 * The refund state line (contract §5.1 "Refund state", §7 item 3; also the
 * `Qaytarish` column of the payments export): chosen by state, and for
 * `manual_required` by `manual_reason` and provider — the Payme cabinet line
 * only for reason `payme` (or, without a reason, a Payme refund), the Click
 * payout line otherwise, since a `manual_required` refund is a Click one
 * when Click cannot return the money itself. Never assumes Payme.
 */
export function refundStateLine(
  refund: Pick<Refund, "state" | "provider"> & { manualReason?: ManualRefundReason },
): string {
  if (refund.state !== "manual_required") return REFUND_STATE_LABEL[refund.state];
  const payme =
    refund.manualReason === "payme" || (!refund.manualReason && refund.provider === "payme");
  return MANUAL_REFUND_LINE[payme ? "payme" : "click"];
}

/**
 * The note suffix of a manual `refund_requested` row by `manual_reason`
 * (contract §5.1, without the leading " · ").
 */
export const MANUAL_REFUND_NOTE: Record<ManualRefundReason, string> = {
  payme: "Payme kabinetida qo‘lda qaytariladi",
  no_paydoc: "Click to‘lov raqami yo‘q · qo‘lda to‘lanadi",
  fake_mode: "Click sinov rejimida · qo‘lda to‘lanadi",
};

/**
 * Why a refund that still needs a payout is paid by hand, when its line does
 * not already say so: a `manual_required` Click refund without a Click
 * payment id or with Click in test mode (§5.1 note). A Payme refund's line
 * already names the Payme cabinet, so it has no note.
 */
export function manualRefundNote(
  refund: Pick<Refund, "state"> & { manualReason?: ManualRefundReason },
): string | null {
  if (refund.state !== "manual_required" || !refund.manualReason) return null;
  return refund.manualReason === "payme" ? null : MANUAL_REFUND_NOTE[refund.manualReason];
}

/**
 * `Refund.manual_reason` (M3) → the reason; `null` (never manual) or a value
 * this build does not know → `undefined`. Unlike `manualRefundReason`, an
 * absent value is not read as Payme: the refund object states it.
 */
export function refundManualReason(value: unknown): ManualRefundReason | undefined {
  return MANUAL_REFUND_REASONS.find((reason) => reason === value);
}

/**
 * `refund_requested.data.manual_reason` → the reason: absent or `null` (M1
 * rows, written before the field existed) reads as `"payme"` (§4); an
 * unknown value is `null`, so the screen says only that the refund is manual.
 */
export function manualRefundReason(value: unknown): ManualRefundReason | null {
  if (value === undefined || value === null) return "payme";
  return MANUAL_REFUND_REASONS.find((reason) => reason === value) ?? null;
}

/** Refund states an admin has to act on (dashboard `refunds_needing_action`). */
export const REFUND_STATES_NEEDING_ACTION: ReadonlyArray<RefundState> = [
  "failed",
  "unknown",
  "manual_required",
];

export interface CashbackHold {
  amount: number;
  state: "active" | "captured" | "released";
  expiresAt: string;
}

/** What the admin may do with the order now (contract §2.2 `available_actions`). */
export interface OrderActions {
  transitions: OrderStatus[];
  cancel: boolean;
  retryShipment: boolean;
}

export interface Order extends OrderSummary {
  channel: OrderChannel;
  address?: string;
  items: OrderItem[];
  deliveryFee: number;
  cashbackUsed: number;
  payment: OrderSummary["payment"] & {
    transactionId?: string;
    confirmedAt?: string;
    /** Amount charged (API `payment.amount`); equals `total`. */
    amount?: number;
  };
  /** Newest first. */
  refunds: Refund[];
  cashbackHold?: CashbackHold;
  history: OrderEvent[];
  cashback: OrderCashbackEntry[];
  /** From the API in api mode; derived with `orderActions()` from the fixtures in mock mode. */
  availableActions: OrderActions;
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

/**
 * The contract's `available_actions` rules (§2.2), for the mock fixtures: the
 * manual transitions, cancel while the order is open, and a BTS retry for a
 * paid delivery order whose automatic hand-off failed and is not in flight.
 */
export function orderActions(
  order: Pick<Order, "status" | "fulfilment" | "shipment">,
): OrderActions {
  return {
    transitions: manualTransitions(order),
    cancel: canCancel(order),
    retryShipment:
      order.fulfilment === "delivery" &&
      order.status === "processing" &&
      order.shipment.state === "failed" &&
      !order.shipment.pending,
  };
}

/** Whether a BTS create message is queued or in flight for the order. */
export function shipmentPending(shipment: Shipment): boolean {
  return (shipment.state === "failed" || shipment.state === "not_created") && !!shipment.pending;
}
