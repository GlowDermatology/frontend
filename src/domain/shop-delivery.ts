/**
 * Home delivery on the storefront (Yandex Delivery plan §3.4, §4): the
 * options checkout offers (Yandex Standard / Express, BTS), the quote the
 * order is placed with, and the carrier view of an order. Every price, ETA
 * window and label comes from the server (`delivery/calculate/`, the order
 * detail); nothing here computes a fee. Framework-free and unit-tested.
 */

export type DeliveryProvider = "yandex" | "bts";
export const DELIVERY_PROVIDERS: ReadonlyArray<DeliveryProvider> = ["yandex", "bts"];

export type DeliveryMethod = "standard" | "express";
export const DELIVERY_METHODS: ReadonlyArray<DeliveryMethod> = ["standard", "express"];

/** Why an option cannot be chosen (`options[].unavailable_reason`). */
export type DeliveryUnavailableReason =
  | "coordinates_required"
  | "provider_unavailable"
  | "out_of_zone"
  | "method_disabled"
  | "too_heavy"
  | "warehouse_closed"
  | "dispatch_suspended"
  | "not_configured";
export const DELIVERY_UNAVAILABLE_REASONS: ReadonlyArray<DeliveryUnavailableReason> = [
  "coordinates_required",
  "provider_unavailable",
  "out_of_zone",
  "method_disabled",
  "too_heavy",
  "warehouse_closed",
  "dispatch_suspended",
  "not_configured",
];

/** The finer progress of a Yandex shipment (the order status stays the coarse one). */
export type ShipmentStage =
  | "awaiting_dispatch"
  | "courier_requested"
  | "courier_assigned"
  | "courier_arrived"
  | "in_transit"
  | "at_destination"
  | "delivered"
  | "returning"
  | "returned"
  | "cancelled"
  | "failed";
export const SHIPMENT_STAGES: ReadonlyArray<ShipmentStage> = [
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
];

/** A carrier and, for Yandex, its method; BTS has no method. */
export interface DeliveryChoice {
  provider: DeliveryProvider;
  method: DeliveryMethod | null;
}

/** One `options[]` entry of `delivery/calculate/` (`with_options`). */
export interface ShopDeliveryOption extends DeliveryChoice {
  /** Localized by the server ("Yandex Ekspress", "BTS pochta"). */
  label: string;
  available: boolean;
  /** `null` when available. */
  unavailableReason: DeliveryUnavailableReason | null;
  /** so‘m; `null` when unavailable (never invented). */
  fee: number | null;
  etaFrom: string | null;
  etaTo: string | null;
  /** The window starts at a later warehouse opening. */
  scheduled: boolean;
  /** Sent to checkout as `delivery_quote_id` (Yandex only; BTS has none). */
  quoteId: string | null;
  expiresAt: string | null;
  /** The total to send to checkout when this option is chosen. */
  expectedTotal: number | null;
}

/** `delivery` of an order (`null` for pickup); a BTS order has only `provider`. */
export interface ShopOrderDelivery {
  provider: DeliveryProvider;
  method: DeliveryMethod | null;
  methodLabel: string | null;
  stage: ShipmentStage | null;
  stageLabel: string | null;
  etaFrom: string | null;
  etaTo: string | null;
  /** Never a phone number: the API sends only the name and the vehicle. */
  courierName: string | null;
  courierVehicle: string | null;
  /** https only. */
  trackingUrl: string | null;
}

/**
 * A checkout refusal about delivery, as the Server Action hands it to the
 * page (`details` of 409 `price_changed` with fresh options, `quote_expired`
 * and `delivery_unavailable`).
 */
export interface DeliveryConflict {
  kind: "delivery";
  /** The fresh options when the server re-quoted (else `null`). */
  options: ShopDeliveryOption[] | null;
  /** `price_changed`: the fresh quote of the same method. */
  quoteId: string | null;
  /** `price_changed`: the new delivery fee and order total. */
  deliveryFee: number | null;
  total: number | null;
}

export function isDeliveryConflict(value: unknown): value is DeliveryConflict {
  return (
    typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "delivery"
  );
}

/* --- choices ----------------------------------------------------------------- */

/** A stable key of a choice: `yandex:standard`, `yandex:express`, `bts`. */
export function choiceKey(choice: DeliveryChoice): string {
  return choice.provider === "yandex" ? `yandex:${choice.method ?? ""}` : "bts";
}

export function sameChoice(a: DeliveryChoice | null, b: DeliveryChoice | null): boolean {
  if (a === null || b === null) return a === b;
  return choiceKey(a) === choiceKey(b);
}

export function findOption(
  options: ReadonlyArray<ShopDeliveryOption>,
  choice: DeliveryChoice | null,
): ShopDeliveryOption | null {
  if (!choice) return null;
  return options.find((option) => sameChoice(option, choice)) ?? null;
}

/**
 * The fulfilment methods checkout offers: the released `fulfilment_methods`
 * keep meaning BTS (decision 12), so a deployment where only Yandex delivers
 * announces delivery through `delivery.providers` instead.
 */
export function offeredFulfilments(
  methods: ReadonlyArray<"delivery" | "pickup">,
  providers: ReadonlyArray<DeliveryProvider>,
): Array<"delivery" | "pickup"> {
  const offered = new Set(methods);
  if (providers.length > 0) offered.add("delivery");
  return (["delivery", "pickup"] as const).filter((method) => offered.has(method));
}

/* --- quote freshness ---------------------------------------------------------- */

/** The quote is asked for again this long after it ran out (the server then issues a new one). */
export const REQUOTE_GRACE_MS = 1_000;

/**
 * When (device clock, ms) a quote must be asked for again: just after its
 * `quote_expires_at`. The lifetime is measured on the server's own clock
 * (`quote_expires_at − quoted_at`) and counted from when the answer arrived,
 * so a device clock that runs fast or slow can neither keep an expired quote
 * nor re-quote in a loop. Without `quoted_at` the device clock is used.
 * `null` when the quote has no expiry (BTS, pickup) or an unreadable one.
 */
export function requoteAt(
  quote: { quotedAt: string | null; quoteExpiresAt: string | null },
  receivedAtMs: number,
): number | null {
  if (!quote.quoteExpiresAt) return null;
  const expires = Date.parse(quote.quoteExpiresAt);
  if (Number.isNaN(expires)) return null;
  const quoted = quote.quotedAt ? Date.parse(quote.quotedAt) : Number.NaN;
  const expiry = Number.isNaN(quoted) ? expires : receivedAtMs + (expires - quoted);
  return expiry + REQUOTE_GRACE_MS;
}

/** Whether a quote with this `requoteAt` has run out at `nowMs` (checkout must ask again first). */
export function quoteExpiredAt(requoteAtMs: number | null, nowMs: number): boolean {
  return requoteAtMs !== null && nowMs >= requoteAtMs - REQUOTE_GRACE_MS;
}

/* --- the order page ------------------------------------------------------------ */

/** The stages after which nothing about the parcel changes by itself. */
export const FINISHED_STAGES: ReadonlySet<ShipmentStage> = new Set([
  "delivered",
  "cancelled",
  "returned",
]);

/** The stages in which the order page keeps itself up to date. */
export const LIVE_STAGES: ReadonlySet<ShipmentStage> = new Set(
  SHIPMENT_STAGES.filter((stage) => !FINISHED_STAGES.has(stage)),
);

/** The order page refreshes every 30 s while the parcel is on its way. */
export const DELIVERY_REFRESH_MS = 30_000;

/**
 * Whether the order page should refresh itself: a paid Yandex order whose
 * shipment is in a live stage. Stops once the stage is delivered, cancelled
 * or returned, or the order itself is delivered or cancelled.
 */
export function shouldRefreshDelivery(order: {
  status: string;
  delivery: Pick<ShopOrderDelivery, "provider" | "stage"> | null;
}): boolean {
  const delivery = order.delivery;
  if (!delivery || delivery.provider !== "yandex" || delivery.stage === null) return false;
  if (order.status !== "processing" && order.status !== "handed_to_courier") return false;
  return LIVE_STAGES.has(delivery.stage);
}

/**
 * Whether the page should be refreshed now: on the 30 s beat, or when the
 * tab comes back after at least one beat without a refresh.
 */
export function refreshDue(lastRefreshMs: number, nowMs: number): boolean {
  return nowMs - lastRefreshMs >= DELIVERY_REFRESH_MS;
}

/** The stages in which a courier is on the job: their name and vehicle are shown. */
const COURIER_STAGES: ReadonlySet<ShipmentStage> = new Set([
  "courier_assigned",
  "courier_arrived",
  "in_transit",
  "at_destination",
]);

export function courierShown(
  delivery: Pick<ShopOrderDelivery, "stage" | "courierName" | "courierVehicle">,
): boolean {
  return (
    delivery.stage !== null &&
    COURIER_STAGES.has(delivery.stage) &&
    Boolean(delivery.courierName || delivery.courierVehicle)
  );
}

/**
 * Whether the promised window still matters: not once the parcel's journey
 * ended or it is on its way back to the shop.
 */
export function etaShown(
  delivery: Pick<ShopOrderDelivery, "stage" | "etaFrom" | "etaTo">,
): boolean {
  if (!delivery.etaFrom && !delivery.etaTo) return false;
  if (delivery.stage === null) return true;
  return delivery.stage !== "returning" && !FINISHED_STAGES.has(delivery.stage);
}
