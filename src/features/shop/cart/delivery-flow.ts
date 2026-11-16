import type { ActionFailure } from "@/data/types";
import type { ShopAddress, ShopQuote } from "@/domain/shop-account";
import {
  findOption,
  isDeliveryConflict,
  sameChoice,
  type DeliveryChoice,
  type ShopDeliveryOption,
} from "@/domain/shop-delivery";

/**
 * The checkout's delivery decisions (plan §4), kept pure so they can be
 * unit-tested: which option is selected and can be placed, what a refused
 * option lets the customer do about it, how a re-quote compares with what
 * the customer saw, and how a checkout refusal about delivery is handled.
 * Prices always come from the server; nothing here adds up a fee.
 */

/** The option the server selected for this quote (`null` for pickup or an answer without options). */
export function selectedChoice(quote: ShopQuote | null): DeliveryChoice | null {
  if (!quote || quote.fulfilment !== "delivery" || !quote.provider) return null;
  return { provider: quote.provider, method: quote.method };
}

/**
 * The option the page marks as chosen: the customer's pick while its
 * re-quote is on the way (so the radio follows the click), else the
 * server's selection (its default, or the pick when it is available).
 */
export function displayedChoice(
  quote: ShopQuote | null,
  preferred: DeliveryChoice | null,
  pending: boolean,
): DeliveryChoice | null {
  if (pending && preferred && quote && findOption(quote.options, preferred)?.available) {
    return preferred;
  }
  return selectedChoice(quote);
}

/**
 * Whether checkout can be placed with this quote: pickup, the released
 * answer without options (BTS), a BTS selection, or a Yandex selection with
 * its quote id. A delivery answer whose options are all unavailable cannot.
 */
export function placeable(quote: ShopQuote | null): boolean {
  if (!quote) return false;
  if (quote.fulfilment === "pickup" || quote.options.length === 0) return true;
  if (quote.provider === "bts") return true;
  return quote.provider === "yandex" && quote.quoteId !== null;
}

/**
 * What `orders/checkout/` is sent for this quote: the selected option's
 * `expected_total` (the answer's own total when it has no options) and, for
 * Yandex, its quote id. The summary shows the same total.
 */
export function checkoutTerms(quote: ShopQuote): {
  expectedTotal: number;
  deliveryQuoteId: string | null;
} {
  const option = findOption(quote.options, selectedChoice(quote));
  return {
    expectedTotal: option?.available
      ? (option.expectedTotal ?? quote.expectedTotal)
      : quote.expectedTotal,
    deliveryQuoteId:
      quote.fulfilment === "delivery" && quote.provider === "yandex" ? quote.quoteId : null,
  };
}

/* --- refused options --------------------------------------------------------- */

export type OptionProblemReason =
  NonNullable<ShopDeliveryOption["unavailableReason"]> | "region_required";

export interface OptionProblem {
  reason: OptionProblemReason;
  /** What the customer can do here: add the map pin, fix the address, ask again. */
  action: "pin" | "edit" | "retry" | null;
}

/**
 * Why an option is refused and what the page offers about it. BTS answers
 * `out_of_zone` for an address without its region and city too; that one
 * asks for the address to be completed instead.
 */
export function optionProblem(
  option: ShopDeliveryOption,
  address: Pick<ShopAddress, "regionCode" | "cityCode"> | null,
): OptionProblem | null {
  if (option.available) return null;
  const reason = option.unavailableReason ?? "not_configured";
  if (reason === "coordinates_required") return { reason, action: address ? "pin" : null };
  if (
    reason === "out_of_zone" &&
    option.provider === "bts" &&
    address &&
    (!address.regionCode || !address.cityCode)
  ) {
    return { reason: "region_required", action: "edit" };
  }
  if (reason === "provider_unavailable") return { reason, action: "retry" };
  return { reason, action: null };
}

/* --- re-quotes ----------------------------------------------------------------- */

/** What the customer saw when they pressed "place order". */
export interface SeenTerms {
  choice: DeliveryChoice | null;
  deliveryFee: number;
  expectedTotal: number;
}

export function seenTerms(quote: ShopQuote): SeenTerms {
  return {
    choice: selectedChoice(quote),
    deliveryFee: quote.deliveryFee,
    expectedTotal: quote.expectedTotal,
  };
}

export type RequoteOutcome =
  /** Same option, fee and total: the order may go ahead with the fresh quote. */
  | { kind: "same" }
  /** Same option at another fee: show the new price and ask to confirm. */
  | { kind: "fee_changed"; from: number; to: number }
  /** Same fee, another total (items or cashback moved): ask to confirm. */
  | { kind: "total_changed" }
  /** The option the customer chose is gone; the server selected another one. */
  | { kind: "replaced"; label: string }
  /** No option can take the order now. */
  | { kind: "none" };

export function compareQuotes(seen: SeenTerms, fresh: ShopQuote): RequoteOutcome {
  const choice = selectedChoice(fresh);
  if (fresh.fulfilment === "delivery" && fresh.options.length > 0 && !placeable(fresh)) {
    return { kind: "none" };
  }
  if (!sameChoice(seen.choice, choice)) {
    return { kind: "replaced", label: findOption(fresh.options, choice)?.label ?? "" };
  }
  if (seen.deliveryFee !== fresh.deliveryFee) {
    return { kind: "fee_changed", from: seen.deliveryFee, to: fresh.deliveryFee };
  }
  if (seen.expectedTotal !== fresh.expectedTotal) return { kind: "total_changed" };
  return { kind: "same" };
}

/* --- checkout refusals ----------------------------------------------------------- */

export type CheckoutConflict =
  /** 409 `price_changed` from a Yandex re-quote: the new fee and the fresh options. */
  | { kind: "delivery_price_changed"; fee: number | null; options: ShopDeliveryOption[] | null }
  /** 409 `price_changed` of the released kind (items or cashback): re-quote and confirm. */
  | { kind: "price_changed" }
  /** 409 `quote_expired`: re-quote silently once, then ask. */
  | { kind: "quote_expired"; options: ShopDeliveryOption[] | null }
  /** 409 `delivery_unavailable`: nothing can take the order to this address now. */
  | { kind: "delivery_unavailable"; options: ShopDeliveryOption[] | null };

export function readConflict(failure: ActionFailure): CheckoutConflict | null {
  const details = isDeliveryConflict(failure.details) ? failure.details : null;
  switch (failure.code) {
    case "price_changed":
      return details
        ? { kind: "delivery_price_changed", fee: details.deliveryFee, options: details.options }
        : { kind: "price_changed" };
    case "quote_expired":
      return { kind: "quote_expired", options: details?.options ?? null };
    case "delivery_unavailable":
      return { kind: "delivery_unavailable", options: details?.options ?? null };
    default:
      return null;
  }
}

/**
 * The options to show while a refusal is on screen: the fresh ones the
 * server sent with it, else the ones already shown.
 */
export function conflictOptions(
  conflict: CheckoutConflict,
  shown: ReadonlyArray<ShopDeliveryOption>,
): ShopDeliveryOption[] {
  return "options" in conflict && conflict.options ? conflict.options : [...shown];
}

/** The texts a re-quote outcome is explained with (`ordersCopy[locale]`). */
export interface OutcomeTexts {
  priceChanged: string;
  deliveryPriceChanged: (from: string, to: string) => string;
  optionReplaced: (label: string) => string;
  quoteExpired: string;
  /** No option can take the order (`delivery.none`). */
  none: string;
}

/** What to tell the customer after a re-quote that cannot go ahead silently (`null` for `same`). */
export function outcomeNotice(
  outcome: RequoteOutcome,
  texts: OutcomeTexts,
  money: (amount: number) => string,
): string | null {
  switch (outcome.kind) {
    case "fee_changed":
      return texts.deliveryPriceChanged(money(outcome.from), money(outcome.to));
    case "total_changed":
      return texts.priceChanged;
    case "replaced":
      return outcome.label ? texts.optionReplaced(outcome.label) : texts.quoteExpired;
    case "none":
      return texts.none;
    case "same":
      return null;
  }
}
