/**
 * Courier dispatch, price review and return confirmation of a Yandex order
 * (Yandex Delivery plan §3.6, §3.8): the request limits of
 * `POST orders/{id}/dispatch/` and `confirm-return/`, the reading of a
 * `dispatch_review` issue's amounts, the method choice and the stop rule of
 * the post-dispatch poll. Framework-free and unit-tested; every amount is
 * the server's, never computed here.
 */
import type { Locale } from "@/lib/i18n/locales";

import { orderLabelsCopy } from "./copy/orders";
import type { DeliveryIssue } from "./delivery-issue";
import {
  DELIVERY_METHODS,
  type DeliveryIssueKind,
  type DeliveryMethod,
  type Order,
  type ShipmentStage,
} from "./order";

/** `DispatchRequest.weight_g`: grams, 1..20 000 (the Express class limit). */
export const PARCEL_WEIGHT_MIN_G = 1;
export const PARCEL_WEIGHT_MAX_G = 20_000;
/** `DispatchRequest.approved_price`: so‘m, 0..100 000 000. */
export const APPROVED_PRICE_MAX = 100_000_000;
/** `ConfirmReturnRequest.note`: optional, ≤ 1000 characters. */
export const RETURN_NOTE_MAX = 1_000;

/** What staff send with "Kuryer chaqirish" (the body of `POST orders/{id}/dispatch/`). */
export interface DispatchInput {
  /** Must be `true`: staff checked the contents. */
  contentsVerified: boolean;
  weightG: number;
  /** A different method than the order's (the fee the customer paid never changes). */
  method?: DeliveryMethod | null;
  /** The offer staff approved; only while a `dispatch_review` issue is open. */
  approvedPrice?: number | null;
}

export type WeightParse = { ok: true; grams: number } | { ok: false; message: string };

/**
 * The weight field (grams typed by staff, spaces allowed: "1 250") → an
 * integer within the API's limits, or the field's message in the admin
 * language.
 */
export function parseParcelWeight(text: string, locale: Locale = "uz"): WeightParse {
  const m = orderLabelsCopy[locale].weight;
  const compact = text.replace(/[\s  ]/g, "");
  if (compact === "") return { ok: false, message: m.empty };
  if (!/^\d+$/.test(compact)) return { ok: false, message: m.integer };
  const grams = Number(compact);
  if (grams < PARCEL_WEIGHT_MIN_G) {
    return { ok: false, message: m.min(String(PARCEL_WEIGHT_MIN_G)) };
  }
  if (grams > PARCEL_WEIGHT_MAX_G) return { ok: false, message: m.max };
  return { ok: true, grams };
}

/** The weight field's initial text: the parcel weight the server holds, else empty. */
export function initialWeightText(order: Pick<Order, "delivery">): string {
  const grams = order.delivery?.parcelWeightG;
  return typeof grams === "number" && grams >= PARCEL_WEIGHT_MIN_G && grams <= PARCEL_WEIGHT_MAX_G
    ? String(grams)
    : "";
}

/* --- price review (`dispatch_review`, plan §3.6 step 4) --- */

/**
 * Why Yandex's binding offer went to review (`DeliveryIssue.code` of a
 * `dispatch_review`, from `delivery.pricing` and the dispatch handler).
 */
export const REVIEW_REASON_LABEL: Record<string, string> = orderLabelsCopy.uz.reviewReason;

export function reviewReasonLabel(code: string, locale: Locale = "uz"): string {
  const labels = orderLabelsCopy[locale];
  const reasons = labels.reviewReason as Record<string, string>;
  return (Object.hasOwn(reasons, code) ? reasons[code] : undefined) ?? labels.reviewFallback(code);
}

/** The amounts of an open `dispatch_review` issue, as the server wrote them. */
export interface DispatchReview {
  issueId: number;
  /** The policy limit that was exceeded (`increase_over_limit`, `loss_over_limit`, …). */
  code: string;
  claimNumber: number | null;
  /** Yandex's binding offer (VAT included); `null` when Yandex sent none. */
  offerPrice: number | null;
  /** The checkout estimate the offer was compared with. */
  estimatePrice: number | null;
  /** The delivery fee the customer paid. */
  paidFee: number | null;
  /** A price staff approved earlier (an `above_approved` review). */
  approvedPrice: number | null;
  /** The offer above the estimate (server's figure). */
  increase: number | null;
  /** The offer above the paid fee (server's figure). */
  loss: number | null;
  /** Yandex's warning codes. */
  warnings: string[];
}

const amount = (details: Record<string, unknown>, key: string): number | null => {
  const value = details[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
};

/**
 * An open `dispatch_review` issue → its review; any other issue (or a
 * resolved one) → `null`. Only integer so‘m amounts are read; warnings keep
 * their codes (strings only, at most 10).
 */
export function dispatchReviewOf(issue: DeliveryIssue | null | undefined): DispatchReview | null {
  if (!issue || issue.kind !== "dispatch_review" || issue.state !== "open") return null;
  const d = issue.details;
  const warnings = Array.isArray(d.warnings)
    ? d.warnings.filter((w): w is string => typeof w === "string" && w !== "").slice(0, 10)
    : [];
  return {
    issueId: issue.id,
    code: issue.code,
    claimNumber: amount(d, "claim_number"),
    offerPrice: amount(d, "offer_price"),
    estimatePrice: amount(d, "estimate_price"),
    paidFee: amount(d, "paid_fee"),
    approvedPrice: amount(d, "approved_price"),
    increase: amount(d, "increase"),
    loss: amount(d, "loss"),
    warnings,
  };
}

/** Staff can approve the offer itself (`approved_price` = the offer) only when Yandex sent one. */
export function approvableOffer(review: DispatchReview | null): number | null {
  return review?.offerPrice ?? null;
}

/* --- method choice --- */

export interface MethodChoiceContext {
  /** The order's method (the shipment's; `null` when unknown). */
  current: DeliveryMethod | null;
  /** An open price review: its documented options include "another method". */
  review: boolean;
  /** The server refused this method's weight (409 `too_heavy`). */
  tooHeavy: boolean;
  /** Methods the server refused as switched off (409 `method_disabled`). */
  disabled: ReadonlyArray<DeliveryMethod>;
}

/**
 * The methods the dialog offers, current first, or `null` (no choice shown).
 * The admin API lists no enabled methods, so a switch is offered only when
 * the server itself points to one: an open price review ("approve, another
 * method or cancel") or its `too_heavy` refusal (Express carries up to
 * 20 kg). A method the server refused as disabled is never offered again.
 */
export function methodChoice(context: MethodChoiceContext): DeliveryMethod[] | null {
  const { current } = context;
  if (!current || (!context.review && !context.tooHeavy)) return null;
  const others = DELIVERY_METHODS.filter(
    (method) => method !== current && !context.disabled.includes(method),
  );
  return others.length > 0 ? [current, ...others] : null;
}

/**
 * The request body for the dialog's choice: `method` only when it differs
 * from the order's, `approved_price` only when staff approve the reviewed
 * offer with the same method (an offer is for one method).
 */
export function dispatchInput(choice: {
  weightG: number;
  current: DeliveryMethod | null;
  method: DeliveryMethod | null;
  approve: number | null;
}): DispatchInput {
  const switched = choice.method !== null && choice.method !== choice.current;
  const input: DispatchInput = { contentsVerified: true, weightG: choice.weightG };
  if (switched) input.method = choice.method;
  else if (choice.approve !== null) input.approvedPrice = choice.approve;
  return input;
}

/* --- after the dispatch: the 10 s poll (plan §4 "3-minute status poll") --- */

export const DISPATCH_POLL_INTERVAL_MS = 10_000;
export const DISPATCH_POLL_WINDOW_MS = 180_000;

/** Issues that end a dispatch attempt without a courier (the poll stops on them). */
export const DISPATCH_ISSUE_KINDS: ReadonlyArray<DeliveryIssueKind> = [
  "dispatch_failed",
  "dispatch_review",
  "dispatch_unknown",
];

export type DispatchPhase =
  /** Yandex is still searching (stage `courier_requested`, no dispatch issue): keep polling. */
  | { kind: "searching" }
  /** The search moved on (a courier, or further). */
  | { kind: "moved"; stage: ShipmentStage | null }
  /** The attempt ended in an issue (failed, price review, unknown) or the stage `failed`. */
  | { kind: "issue"; issueKind: DeliveryIssueKind | null; code: string | null };

/** Where a dispatched order stands, from the server's order detail. */
export function dispatchPhase(order: Pick<Order, "delivery">): DispatchPhase {
  const delivery = order.delivery;
  const issue = delivery?.openIssues.find((row) => DISPATCH_ISSUE_KINDS.includes(row.kind));
  if (issue) return { kind: "issue", issueKind: issue.kind, code: issue.code };
  const stage = delivery?.stage ?? null;
  if (stage === "courier_requested") return { kind: "searching" };
  if (stage === "failed")
    return { kind: "issue", issueKind: null, code: delivery?.failureCode ?? null };
  return { kind: "moved", stage };
}

/** "0:40 / 3:00" — the time the poll has waited of its window. */
export function pollProgressLabel(elapsedMs: number, windowMs = DISPATCH_POLL_WINDOW_MS): string {
  const clock = (ms: number) => {
    const seconds = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  return `${clock(Math.min(elapsedMs, windowMs))} / ${clock(windowMs)}`;
}
