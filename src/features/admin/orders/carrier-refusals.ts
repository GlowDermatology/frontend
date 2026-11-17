import type { ActionFailure } from "@/data/types";
import type { DeliveryMethod } from "@/domain/order";
import type { Locale } from "@/lib/i18n/locales";

import { ordersCopy } from "./copy";

/**
 * How the Yandex dialogs of the order page treat the API's refusals
 * (INTERFACES-dispatch / INTERFACES-cancel), with texts per code in the
 * admin language (`ordersCopy[locale].refusal`, Uzbek by default):
 *
 * - `field` — a 400 on a rendered field: shown next to it, the dialog and
 *   its idempotency key stay;
 * - `stale` — the order changed under the screen: toasted, the dialog
 *   closes and the page re-reads the order (its buttons follow the server's
 *   `available_actions` again);
 * - `blocked` — the server refuses for a reason the dialog can show or
 *   work around (no map pin, a disabled or too small method, the warehouse
 *   calendar): kept in the dialog; `reload` asks the page to re-read the
 *   order too (the dispatch button may no longer be offered);
 * - `retry` — transient (network, 503, throttled, the order lock): the
 *   message stays in the dialog with the same key.
 */
export type CarrierRefusal =
  | { kind: "field"; field: string; message: string }
  | { kind: "stale"; title: string; message: string }
  | { kind: "blocked"; code: string; message: string; reload: boolean }
  | { kind: "retry"; message: string };

/** Uzbek texts of the dispatch refusals (409 codes of `POST orders/{id}/dispatch/`). */
export const DISPATCH_REFUSAL_MESSAGE: Record<string, string> = ordersCopy.uz.refusal.dispatch;

/** A code's own text, if the copy has one (never an inherited `Object` member). */
const own = (texts: Record<string, string>, code: string): string | undefined =>
  Object.hasOwn(texts, code) ? texts[code] : undefined;

/** The warehouse calendar's refusals: the dispatch button may disappear after a re-read. */
const CALENDAR_CODES = new Set([
  "not_configured",
  "suspended",
  "closed",
  "after_cutoff",
  "returns_unavailable",
]);

/** API field (camelised by `toActionResult`) → the dialog's field. */
const DISPATCH_FIELDS: ReadonlyArray<[apiField: string, field: string]> = [
  ["weightG", "weight"],
  ["contentsVerified", "contents"],
  ["method", "method"],
  ["approvedPrice", "form"],
];

export function dispatchRefusal(result: ActionFailure, locale: Locale = "uz"): CarrierRefusal {
  const t = ordersCopy[locale].refusal;
  const texts: Record<string, string> = t.dispatch;
  for (const [apiField, field] of DISPATCH_FIELDS) {
    const message = result.fieldErrors?.[apiField];
    if (message) {
      return field === "form" ? { kind: "retry", message } : { kind: "field", field, message };
    }
  }
  const code = result.code ?? "";
  if (code === "invalid_transition" || code === "conflict" || code === "not_found") {
    return { kind: "stale", title: t.dispatchTitle, message: own(texts, code) ?? result.error };
  }
  if (code === "coordinates_required" || code === "method_disabled" || code === "too_heavy") {
    return { kind: "blocked", code, message: own(texts, code)!, reload: false };
  }
  if (CALENDAR_CODES.has(code)) {
    return { kind: "blocked", code, message: own(texts, code)!, reload: true };
  }
  return { kind: "retry", message: result.error };
}

/**
 * The dialog's memory of refused methods: a `method_disabled` answer to a
 * switch removes that method; `too_heavy` for the order's own method lets
 * the dialog offer the other one.
 */
export function rememberMethodRefusal(
  state: { disabled: DeliveryMethod[]; tooHeavy: boolean },
  code: string,
  sent: DeliveryMethod | null,
): { disabled: DeliveryMethod[]; tooHeavy: boolean } {
  if (code === "method_disabled" && sent && !state.disabled.includes(sent)) {
    return { ...state, disabled: [...state.disabled, sent] };
  }
  if (code === "too_heavy") return { ...state, tooHeavy: true };
  return state;
}

/* --- confirm return (`POST orders/{id}/confirm-return/`) --- */

export const CONFIRM_RETURN_REFUSAL_MESSAGE: Record<string, string> =
  ordersCopy.uz.refusal.confirmReturn;

export function confirmReturnRefusal(result: ActionFailure, locale: Locale = "uz"): CarrierRefusal {
  const message = result.fieldErrors?.note;
  if (message) return { kind: "field", field: "note", message };
  const t = ordersCopy[locale].refusal;
  const known = own(t.confirmReturn, result.code ?? "");
  if (known) return { kind: "stale", title: t.confirmReturnTitle, message: known };
  return { kind: "retry", message: result.error };
}

/* --- carrier-aware cancel (`POST orders/{id}/cancel/`, plan §3.8) --- */

export type CancelOutcome =
  /** The order changed or cannot be cancelled: close, toast, re-read. */
  | { kind: "stale"; title: string; message: string }
  /** Yandex was asked to bring the parcel back; the order stays open until it confirms. */
  | { kind: "return_requested"; title: string; message: string }
  /** Transient: kept in the dialog with the same key for a retry. */
  | { kind: "retry"; title: string; message: string };

/**
 * A refused cancel. For a Yandex order the carrier codes get their own
 * titles; the description is the server's message (it names the exact case:
 * delivered, refused by Yandex, parcel out of sight…), with a default in the
 * admin language.
 * A BTS or pickup order keeps the earlier wording ("Amal bajarilmadi" and
 * the server's text) unchanged.
 */
export function cancelOutcome(
  result: ActionFailure,
  yandex: boolean,
  locale: Locale = "uz",
): CancelOutcome {
  const t = ordersCopy[locale].refusal;
  const code = result.code ?? "";
  const stale = code === "invalid_transition" || code === "not_cancellable" || code === "not_found";
  if (!yandex) {
    return stale
      ? { kind: "stale", title: t.failed, message: result.error }
      : { kind: "retry", title: t.failed, message: result.error };
  }
  const message = result.error || own(t.cancel, code) || "";
  switch (code) {
    case "return_requested":
      return { kind: "return_requested", title: t.returnRequested, message };
    case "conflict":
      return { kind: "retry", title: t.yandexBusy, message };
    case "provider_unavailable":
      return { kind: "retry", title: t.yandexDown, message };
    case "not_cancellable":
      return { kind: "stale", title: t.notCancellable, message };
    default:
      return stale
        ? { kind: "stale", title: t.failed, message }
        : { kind: "retry", title: t.failed, message };
  }
}
