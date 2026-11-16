import {
  DELIVERY_METHODS,
  DELIVERY_PROVIDERS,
  DELIVERY_UNAVAILABLE_REASONS,
  SHIPMENT_STAGES,
  type DeliveryConflict,
  type DeliveryMethod,
  type DeliveryProvider,
  type DeliveryUnavailableReason,
  type ShipmentStage,
  type ShopDeliveryOption,
  type ShopOrderDelivery,
} from "@/domain/shop-delivery";

import type { ApiOrderDelivery } from "./account-types";
import { absoluteUrl } from "./mappers";

/**
 * Yandex Delivery reads of the customer API (plan §3.4) → storefront view
 * models: the `options[]` of `delivery/calculate/`, the `delivery` object of
 * an order, and the `details` of the checkout refusals about delivery.
 * Pure and defensive like the other customer mappers: an unknown literal is
 * dropped (an option the storefront cannot name is not offered), a price is
 * never made up (an option without a fee is not available), a link must be
 * https. Unit-tested.
 */

/** A version 4 (or any RFC 4122) UUID as the API writes `quote_id`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed.length > 0 ? trimmed : null;
}

function money(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

function isoOrNull(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: ReadonlyArray<T>): T | null {
  return typeof value === "string" && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : null;
}

export function quoteIdOrNull(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

function httpsOnly(value: unknown): string | null {
  const url = absoluteUrl(value);
  return url && url.startsWith("https://") ? url : null;
}

export function deliveryProviderOf(value: unknown): DeliveryProvider | null {
  return oneOf(value, DELIVERY_PROVIDERS);
}

export function deliveryMethodOf(value: unknown): DeliveryMethod | null {
  return oneOf(value, DELIVERY_METHODS);
}

/**
 * One `options[]` entry, or `null` when the storefront cannot offer it
 * (unknown carrier, a Yandex option without a known method). An option the
 * API marks available but sends without a fee, an expected total or (for
 * Yandex) a quote id is shown as unavailable: checkout could not send it.
 */
export function mapDeliveryOption(api: unknown): ShopDeliveryOption | null {
  const row = record(api);
  if (!row) return null;
  const provider = deliveryProviderOf(row.provider);
  if (!provider) return null;
  const method = provider === "yandex" ? deliveryMethodOf(row.method) : null;
  if (provider === "yandex" && !method) return null;
  const fee = money(row.fee);
  const expectedTotal = money(row.expected_total);
  const quoteId = provider === "yandex" ? quoteIdOrNull(row.quote_id) : null;
  const usable =
    row.available === true &&
    fee !== null &&
    expectedTotal !== null &&
    (provider === "bts" || quoteId !== null);
  const reason: DeliveryUnavailableReason | null = usable
    ? null
    : (oneOf(row.unavailable_reason, DELIVERY_UNAVAILABLE_REASONS) ??
      (row.available === true ? "provider_unavailable" : "not_configured"));
  return {
    provider,
    method,
    label: text(row.label),
    available: usable,
    unavailableReason: reason,
    fee: usable ? fee : null,
    etaFrom: usable ? isoOrNull(row.eta_from) : null,
    etaTo: usable ? isoOrNull(row.eta_to) : null,
    scheduled: usable && row.scheduled === true,
    quoteId: usable ? quoteId : null,
    expiresAt: usable ? isoOrNull(row.expires_at) : null,
    expectedTotal: usable ? expectedTotal : null,
  };
}

/** `options[]` in the API's order (Yandex Standard, Express, then BTS), unknown entries dropped. */
export function mapDeliveryOptions(api: unknown): ShopDeliveryOption[] {
  if (!Array.isArray(api)) return [];
  const seen = new Set<string>();
  const options: ShopDeliveryOption[] = [];
  for (const entry of api) {
    const option = mapDeliveryOption(entry);
    if (!option) continue;
    const key = `${option.provider}:${option.method ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  return options;
}

/**
 * The `delivery` object of an order (`null` for pickup and for answers of
 * an older API). Courier fields are read by name only: a phone number is
 * never part of the view model, whatever the answer carries.
 */
export function mapOrderDelivery(
  api: ApiOrderDelivery | null | undefined,
): ShopOrderDelivery | null {
  const row = record(api);
  if (!row) return null;
  const provider = deliveryProviderOf(row.provider);
  if (!provider) return null;
  if (provider === "bts") {
    return {
      provider,
      method: null,
      methodLabel: null,
      stage: null,
      stageLabel: null,
      etaFrom: null,
      etaTo: null,
      courierName: null,
      courierVehicle: null,
      trackingUrl: null,
    };
  }
  const stage: ShipmentStage | null = oneOf(row.stage, SHIPMENT_STAGES);
  return {
    provider,
    method: deliveryMethodOf(row.method),
    methodLabel: optionalText(row.method_label),
    stage,
    stageLabel: stage ? optionalText(row.stage_label) : null,
    etaFrom: isoOrNull(row.eta_from),
    etaTo: isoOrNull(row.eta_to),
    courierName: optionalText(row.courier_name),
    courierVehicle: optionalText(row.courier_vehicle),
    trackingUrl: httpsOnly(row.tracking_url),
  };
}

/** Checkout refusal codes whose `details` describe delivery. */
const DELIVERY_CONFLICT_CODES = new Set(["price_changed", "quote_expired", "delivery_unavailable"]);

/**
 * The `details` of a delivery refusal, mapped for the page:
 *
 * - 409 `price_changed` **with** `options` (a Yandex re-quote gave another
 *   fee): the fresh quote id, fee, total and options;
 * - 409 `quote_expired`: the fresh options when the server re-quoted
 *   (`details.options`), else `null` (an unknown quote id: `details: null`);
 * - 409 `delivery_unavailable`: the options and their reasons, when sent.
 *
 * `null` for anything else, including the released `price_changed` (the
 * items or the cashback changed: no `options`), whose details stay as sent.
 */
export function deliveryConflictDetails(
  code: string | undefined,
  details: unknown,
): DeliveryConflict | null {
  if (!code || !DELIVERY_CONFLICT_CODES.has(code)) return null;
  const row = record(details);
  const hasOptions = row !== null && Array.isArray(row.options);
  if (code === "price_changed" && !hasOptions) return null;
  return {
    kind: "delivery",
    options: hasOptions ? mapDeliveryOptions(row.options) : null,
    quoteId: code === "price_changed" ? quoteIdOrNull(row?.quote_id) : null,
    deliveryFee: code === "price_changed" ? money(row?.delivery_fee) : null,
    total: code === "price_changed" ? money(row?.total) : null,
  };
}
