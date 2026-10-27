/**
 * View models of the customer's private storefront pages (W3b): account,
 * cart, checkout, orders, cashback, booking, inbox and sessions. Mapped from
 * the customer API in `src/data/api/customer/account-mappers.ts`. Labels the
 * API renders (`status_label`, timeline titles, ledger titles) are already in
 * the page's language (contract §1.4, §4, §5); money is integer so‘m;
 * datetimes are ISO strings.
 */

export type ShopLanguage = "uz" | "ru" | "en";
export type SocialProvider = "google" | "facebook" | "apple";
export const SOCIAL_PROVIDERS: ReadonlyArray<SocialProvider> = ["google", "facebook", "apple"];

export interface ShopAddress {
  id: number;
  label: string;
  text: string;
  regionCode: string;
  cityCode: string;
  comment: string;
  isDefault: boolean;
}

export interface ShopMe {
  id: number;
  /** E.164 or `null` until a phone is attached (hybrid identity, B-W2). */
  phone: string | null;
  email: string | null;
  name: string;
  language: ShopLanguage;
  hasPassword: boolean;
  linkedProviders: SocialProvider[];
  registeredAt: string;
  consent: {
    acceptedVersion: string | null;
    currentVersion: string | null;
    updateRequired: boolean;
  };
  defaultAddress: ShopAddress | null;
}

export type CartLineStatus = "ok" | "insufficient" | "out_of_stock" | "unavailable";

export interface ShopCartLine {
  productId: number;
  name: string;
  volume: string;
  image: string | null;
  unitPrice: number;
  promo: boolean;
  quantity: number;
  lineTotal: number;
  available: number;
  maxQuantity: number;
  maxReached: boolean;
  status: CartLineStatus;
  priceChanged: boolean;
  previousPrice: number | null;
}

export interface ShopCart {
  lines: ShopCartLine[];
  itemCount: number;
  quantityTotal: number;
  itemsSubtotal: number;
  promoSubtotal: number;
  hasProblems: boolean;
  cashbackAvailable: number;
  cashbackMaxPickup: number;
  lastChange: {
    productId: number;
    requested: number;
    quantity: number;
    maxReached: boolean;
  } | null;
}

export type Fulfilment = "delivery" | "pickup";
export type PaymentProvider = "click" | "payme";

export interface ShopRegion {
  code: string;
  name: string;
  cities: ReadonlyArray<{ code: string; name: string }>;
}

export interface ShopQuote {
  fulfilment: Fulfilment;
  deliveryFee: number;
  itemsSubtotal: number;
  cashbackMax: number;
  cashbackToUse: number;
  expectedTotal: number;
  pickupAddress: string | null;
}

export type OrderStatus =
  "awaiting_payment" | "processing" | "handed_to_courier" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ShopOrderSummary {
  id: number;
  createdAt: string;
  status: OrderStatus;
  statusLabel: string;
  fulfilment: Fulfilment;
  total: number;
  itemCount: number;
  previewImages: string[];
  payment: {
    status: PaymentStatus;
    statusLabel: string;
    provider: PaymentProvider;
    inProgress: boolean;
  };
  payBy: string | null;
  trackingNumber: string | null;
}

export interface ShopProgressStep {
  step: string;
  label: string;
  state: "done" | "current" | "upcoming" | "skipped";
  at: string | null;
}

export interface ShopTimelineEntry {
  type: string;
  at: string;
  title: string;
  subtitle: string | null;
}

export interface ShopOrder extends ShopOrderSummary {
  fulfilmentLabel: string;
  items: ReadonlyArray<{
    productId: number;
    name: string;
    image: string | null;
    quantity: number;
    unitPrice: number;
    promo: boolean;
    lineTotal: number;
  }>;
  itemsSubtotal: number;
  promoSubtotal: number;
  deliveryFee: number;
  cashbackUsed: number;
  address: string | null;
  addressComment: string | null;
  pickupAddress: string | null;
  customerNote: string | null;
  paymentDetail: {
    amount: number;
    confirmedAt: string | null;
    inProgressLabel: string | null;
  };
  refund: { stateLabel: string; amount: number; completed: boolean } | null;
  shipment: { carrier: string; trackingNumber: string; trackingUrl: string | null } | null;
  cashback: { used: number; earned: number; earnedState: "none" | "credited" | "reversed" };
  cancellation: { reason: string; label: string } | null;
  progress: ShopProgressStep[];
  timeline: ShopTimelineEntry[];
  actions: { pay: boolean; cancel: boolean; reorder: boolean };
}

export interface ShopPayLink {
  orderId: number;
  provider: PaymentProvider;
  amount: number;
  webUrl: string;
}

export interface ShopCashbackBand {
  from: number;
  to: number | null;
  /** "1.00" as the API sends it. */
  percent: string;
}

export interface ShopCashback {
  balance: number;
  held: number;
  available: number;
  negative: boolean;
  lifetimeTotal: number;
  tier: ShopCashbackBand | null;
  nextTier: { percent: string; from: number; remaining: number; progress: number } | null;
  tiers: ShopCashbackBand[];
  holds: ReadonlyArray<{ orderId: number; amount: number; expiresAt: string }>;
}

export interface ShopLedgerItem {
  id: number;
  at: string;
  kind: "credit" | "debit" | "adjustment" | "reversal";
  amount: number;
  balanceAfter: number;
  title: string;
  subtitle: string | null;
  orderId: number | null;
}

export interface ShopQrToken {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
  refreshInSeconds: number;
}

export interface ShopSession {
  id: string;
  device: string;
  platform: "ios" | "android" | "web" | null;
  location: string;
  createdAt: string;
  updatedAt: string;
  current: boolean;
}

export type AppointmentStatus = "requested" | "confirmed" | "rejected" | "attended" | "cancelled";

export interface ShopAppointment {
  id: number;
  status: AppointmentStatus;
  statusLabel: string;
  specialist: { id: number; name: string; roleLabel: string; photo: string | null };
  service: { id: number; name: string };
  location: { name: string; address: string; phone: string | null };
  start: string;
  end: string;
  durationMin: number;
  price: number;
  note: string | null;
  canCancel: boolean;
  cancelledBy: "customer" | "admin" | null;
}

export interface ShopSlots {
  date: string;
  durationMin: number;
  price: number;
  workingHours: { start: string; end: string } | null;
  slots: ReadonlyArray<{ start: string; end: string; startAt: string }>;
}

/** Where an inbox item leads (contract §2.12); external links are https only. */
export type InboxTarget =
  | { kind: "order"; orderId: number }
  | { kind: "appointment"; appointmentId: number }
  | { kind: "product"; productId: number }
  | { kind: "url"; url: string }
  | { kind: "none" };

export interface ShopInboxItem {
  id: number;
  kind: "promo" | "general" | "order_status" | "appointment";
  title: string;
  body: string;
  image: string | null;
  target: InboxTarget;
  createdAt: string;
  read: boolean;
}

/** Header summary of the signed-in customer (name, badges). */
export interface ShopHeaderSummary {
  signedIn: boolean;
  name: string | null;
  cartQuantity: number;
  unread: number;
}
