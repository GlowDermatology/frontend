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
/** `yandex` = a Yandex Delivery status update (Yandex Delivery plan §3.1). */
export type EventSource = "system" | "bts" | "admin" | "yandex";

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

/* --- Carrier view (Yandex Delivery plan §3.10, admin `OrderDelivery`) --- */

export const DELIVERY_PROVIDERS = ["bts", "yandex"] as const;
export type DeliveryProvider = (typeof DELIVERY_PROVIDERS)[number];

/** Yandex Standard = Yandex class `courier`, Express = `express` (owner decision). */
export const DELIVERY_METHODS = ["standard", "express"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

/** The finer progress of a Yandex shipment; the order status stays the coarse one. */
export const SHIPMENT_STAGES = [
  "awaiting_dispatch",
  "courier_requested",
  "courier_assigned",
  "courier_arrived",
  "in_transit",
  "at_destination",
  "delivered",
  "returning",
  "returned",
  "cancelled",
  "failed",
] as const;
export type ShipmentStage = (typeof SHIPMENT_STAGES)[number];

/** The exception queue's kinds (plan §3.9); staff open only `incident`. */
export const DELIVERY_ISSUE_KINDS = [
  "dispatch_failed",
  "dispatch_unknown",
  "dispatch_review",
  "delivery_failed",
  "return_pending",
  "preparation_overdue",
  "cancel_incomplete",
  "parcel_unaccounted",
  "incident",
] as const;
export type DeliveryIssueKind = (typeof DELIVERY_ISSUE_KINDS)[number];

/** One open issue of the order (`DeliveryIssueRef`); the queue has the whole row. */
export interface DeliveryIssueRef {
  id: number;
  kind: DeliveryIssueKind;
  /** Free-form machine code (`performer_not_found`, `staff_report`, …). */
  code: string;
  urgent: boolean;
  openedAt: string;
}

/**
 * The order's carrier view (admin `delivery`). A BTS order carries only
 * `provider` and `openIssues` (every other key `null`); amounts are the
 * server's so‘m, never computed here; the courier's phone is never sent.
 */
export interface OrderDelivery {
  provider: DeliveryProvider;
  method: DeliveryMethod | null;
  stage: ShipmentStage | null;
  promisedFrom: string | null;
  promisedTo: string | null;
  /** The delivery fee the checkout quote charged the customer. */
  quoteFee: number | null;
  /** Yandex's estimate the quote was computed from. */
  carrierPrice: number | null;
  /** The binding offer of the current courier claim (VAT included). */
  offerPrice: number | null;
  approvedPrice: number | null;
  /** Yandex's final prices of every claim of the shipment, summed. */
  carrierCostTotal: number | null;
  costDifference: number | null;
  parcelWeightG: number | null;
  preparedAt: string | null;
  courierName: string | null;
  courierVehicle: string | null;
  trackingUrl: string | null;
  /** Yandex's claim status, verbatim. */
  claimStatus: string | null;
  claimNumber: number | null;
  failureCode: string | null;
  /** Urgent first, then oldest first. */
  openIssues: DeliveryIssueRef[];
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
  /**
   * The carrier view: `null` for a pickup order; absent when the API
   * predates Yandex Delivery (the screens then treat a delivery as BTS).
   */
  delivery?: OrderDelivery | null;
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
  /**
   * Yandex Delivery: `POST orders/{id}/dispatch/` would be accepted now.
   * Absent when the API predates the key (phase 2 backends) and for BTS /
   * pickup orders in the demo; the screen offers the dialog only on `true`.
   */
  dispatch?: boolean;
  /**
   * Yandex Delivery: the parcel is returning / returned and its return is
   * not confirmed yet (`POST orders/{id}/confirm-return/`). Absent like
   * `dispatch`.
   */
  confirmReturn?: boolean;
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

/** Stages at which a Yandex shipment waits for staff to call a courier (again). */
export const DISPATCHABLE_STAGES: ReadonlyArray<ShipmentStage> = [
  "awaiting_dispatch",
  "failed",
  "returned",
];

/** Whether the order goes (or went) with a Yandex courier. */
export function isYandexDelivery(order: Pick<OrderSummary, "delivery">): boolean {
  return order.delivery?.provider === "yandex";
}

/** Stages of a parcel on its way back to, or back at, the warehouse. */
export const RETURN_STAGES: ReadonlyArray<ShipmentStage> = ["returning", "returned"];

/**
 * The contract's `available_actions` rules (§2.2), for the mock fixtures: the
 * manual transitions, cancel while the order is open, and a BTS retry for a
 * paid delivery order whose automatic hand-off failed and is not in flight.
 * A Yandex order (plan decision 8, §3.8) has no BTS retry and no manual
 * transition except `handed_to_courier → delivered` while a
 * `parcel_unaccounted` issue is open; it can be cancelled while open (the
 * cancel is carrier-aware on the server); `dispatch` says whether a courier
 * could be called now and `confirmReturn` whether a returning / returned
 * parcel can be confirmed back (the demo keeps no confirmation, so a
 * returned parcel counts as unconfirmed).
 */
export function orderActions(
  order: Pick<Order, "status" | "fulfilment" | "shipment"> & Pick<OrderSummary, "delivery">,
): OrderActions {
  const delivery = order.delivery;
  if (delivery?.provider === "yandex") {
    const waiting = delivery.stage !== null && DISPATCHABLE_STAGES.includes(delivery.stage);
    const unaccounted = delivery.openIssues.some((issue) => issue.kind === "parcel_unaccounted");
    return {
      transitions:
        unaccounted && order.status === "handed_to_courier" && order.fulfilment === "delivery"
          ? ["delivered"]
          : [],
      cancel: canCancel(order),
      retryShipment: false,
      dispatch:
        waiting &&
        (order.status === "processing" ||
          (order.status === "handed_to_courier" && delivery.stage === "returned")),
      confirmReturn: delivery.stage !== null && RETURN_STAGES.includes(delivery.stage),
    };
  }
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

/* --- Carrier labels (Uzbek, as the backend's enum labels) --- */

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  standard: "Standard",
  express: "Express",
};

export const SHIPMENT_STAGE_LABEL: Record<ShipmentStage, string> = {
  awaiting_dispatch: "Kuryer chaqirilishini kutmoqda",
  courier_requested: "Kuryer qidirilmoqda",
  courier_assigned: "Kuryer biriktirildi",
  courier_arrived: "Kuryer omborga keldi",
  in_transit: "Yo‘lda",
  at_destination: "Kuryer manzilda",
  delivered: "Topshirildi",
  returning: "Omborga qaytarilmoqda",
  returned: "Omborga qaytdi",
  cancelled: "Bekor qilindi",
  failed: "Kuryer topilmadi yoki xato",
};

export const DELIVERY_ISSUE_KIND_LABEL: Record<DeliveryIssueKind, string> = {
  dispatch_failed: "Kuryer chaqirilmadi",
  dispatch_unknown: "Kuryer chaqiruvi noaniq",
  dispatch_review: "Narxni tasdiqlash kerak",
  delivery_failed: "Yetkazib bo‘lmadi",
  return_pending: "Qaytish kutilmoqda",
  preparation_overdue: "Tayyorlash kechikdi",
  cancel_incomplete: "Bekor qilish tugallanmadi",
  parcel_unaccounted: "Jo‘natma nazoratdan chiqdi",
  incident: "Hodisa",
};

/** Kind of an API value this build may not know yet: shown as its code. */
export function issueKindLabel(kind: string): string {
  return (DELIVERY_ISSUE_KIND_LABEL as Record<string, string>)[kind] ?? kind;
}

/**
 * Who carries the order, for the list and the cards: "Yandex Standard",
 * "Yandex Express", "Yandex" (method unknown), "BTS", or "Olib ketish" for
 * pickup. An order from an API without `delivery` is a BTS delivery.
 */
export function carrierLabel(order: Pick<OrderSummary, "fulfilment" | "delivery">): string {
  if (order.fulfilment === "pickup") return "Olib ketish";
  const delivery = order.delivery;
  if (delivery?.provider !== "yandex") return "BTS";
  return delivery.method ? `Yandex ${DELIVERY_METHOD_LABEL[delivery.method]}` : "Yandex";
}

/** The order's open urgent issues (the card and the list mark them in red). */
export function urgentIssues(delivery: OrderDelivery | null | undefined): DeliveryIssueRef[] {
  return delivery ? delivery.openIssues.filter((issue) => issue.urgent) : [];
}
