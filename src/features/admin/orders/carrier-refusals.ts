import type { ActionFailure } from "@/data/types";
import type { DeliveryMethod } from "@/domain/order";

/**
 * How the Yandex dialogs of the order page treat the API's refusals
 * (INTERFACES-dispatch / INTERFACES-cancel), with Uzbek texts per code:
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
export const DISPATCH_REFUSAL_MESSAGE: Record<string, string> = {
  invalid_transition:
    "Bu buyurtma uchun hozir kuryer chaqirib bo‘lmaydi: buyurtma yoki jo‘natma holati o‘zgargan.",
  conflict:
    "Kuryer allaqachon chaqirilgan yoki buyurtma bilan boshqa amal bajarilmoqda. Holat yangilandi.",
  coordinates_required:
    "Mijoz manzilining xaritadagi nuqtasi yo‘q: Yandex kuryerini chaqirib bo‘lmaydi. Mijozdan manzilni xaritada belgilashni so‘rang yoki buyurtmani bekor qiling.",
  method_disabled:
    "Bu yetkazish usuli o‘chirilgan. Buyurtmaning o‘z usulida chaqiring yoki usulni ops konsolida yoqing.",
  too_heavy:
    "Jo‘natma bu usul uchun juda og‘ir (Standard 10 kg gacha, Express 20 kg gacha). Og‘irlikni tekshiring yoki boshqa usulni tanlang.",
  not_configured:
    "Ombor ma’lumotlari (manzil, xaritadagi nuqta, aloqa) to‘liq emas. Ularni ops konsolida to‘ldiring.",
  suspended:
    "Kuryer chaqirish vaqtincha to‘xtatilgan. Uni «Muammolar» bo‘limidagi kalit bilan qayta yoqish mumkin.",
  closed: "Ombor hozir yopiq. Kuryerni ish vaqtida chaqiring.",
  after_cutoff: "Bugun kuryer chaqirish vaqti tugadi. Kuryerni keyingi ish kunida chaqiring.",
  returns_unavailable:
    "Ombor hozir qaytgan jo‘natmalarni qabul qilmaydi, shuning uchun kuryer chaqirib bo‘lmaydi.",
};

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

export function dispatchRefusal(result: ActionFailure): CarrierRefusal {
  for (const [apiField, field] of DISPATCH_FIELDS) {
    const message = result.fieldErrors?.[apiField];
    if (message) {
      return field === "form" ? { kind: "retry", message } : { kind: "field", field, message };
    }
  }
  const code = result.code ?? "";
  if (code === "invalid_transition" || code === "conflict" || code === "not_found") {
    return {
      kind: "stale",
      title: "Kuryer chaqirilmadi",
      message: DISPATCH_REFUSAL_MESSAGE[code] ?? result.error,
    };
  }
  if (code === "coordinates_required" || code === "method_disabled" || code === "too_heavy") {
    return { kind: "blocked", code, message: DISPATCH_REFUSAL_MESSAGE[code]!, reload: false };
  }
  if (CALENDAR_CODES.has(code)) {
    return { kind: "blocked", code, message: DISPATCH_REFUSAL_MESSAGE[code]!, reload: true };
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

export const CONFIRM_RETURN_REFUSAL_MESSAGE: Record<string, string> = {
  invalid_transition: "Qaytayotgan posilka yo‘q: qaytishni tasdiqlab bo‘lmaydi.",
  conflict: "Posilka qaytgani allaqachon tasdiqlangan yoki buyurtma band. Holat yangilandi.",
  not_found: "Buyurtma topilmadi.",
};

export function confirmReturnRefusal(result: ActionFailure): CarrierRefusal {
  const message = result.fieldErrors?.note;
  if (message) return { kind: "field", field: "note", message };
  const code = result.code ?? "";
  if (code in CONFIRM_RETURN_REFUSAL_MESSAGE) {
    return {
      kind: "stale",
      title: "Qaytish tasdiqlanmadi",
      message: CONFIRM_RETURN_REFUSAL_MESSAGE[code]!,
    };
  }
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

const CANCEL_DEFAULT: Record<string, string> = {
  return_requested:
    "Yandexdan posilkani omborga qaytarish so‘raldi. Buyurtma hali bekor qilinmadi: Yandex qaytarishni tasdiqlagach, bekor qilishni qayta bosing.",
  conflict:
    "Yandex bilan boshqa amal bajarilmoqda yoki bekor qilish hali ko‘rinmadi. Birozdan so‘ng qayta urinib ko‘ring.",
  provider_unavailable: "Yandex javob bermadi, buyurtma bekor qilinmadi. Qayta urinib ko‘ring.",
  not_cancellable: "Bu buyurtmani hozir bekor qilib bo‘lmaydi.",
};

/**
 * A refused cancel. For a Yandex order the carrier codes get their own
 * titles; the description is the server's message (it names the exact case:
 * delivered, refused by Yandex, parcel out of sight…), with an Uzbek default.
 * A BTS or pickup order keeps the earlier wording ("Amal bajarilmadi" and
 * the server's text) unchanged.
 */
export function cancelOutcome(result: ActionFailure, yandex: boolean): CancelOutcome {
  const code = result.code ?? "";
  const stale = code === "invalid_transition" || code === "not_cancellable" || code === "not_found";
  if (!yandex) {
    return stale
      ? { kind: "stale", title: "Amal bajarilmadi", message: result.error }
      : { kind: "retry", title: "Amal bajarilmadi", message: result.error };
  }
  const message = result.error || CANCEL_DEFAULT[code] || "";
  switch (code) {
    case "return_requested":
      return { kind: "return_requested", title: "Yandexdan qaytarish so‘raldi", message };
    case "conflict":
      return { kind: "retry", title: "Yandex bilan amal davom etmoqda", message };
    case "provider_unavailable":
      return { kind: "retry", title: "Yandex javob bermadi", message };
    case "not_cancellable":
      return { kind: "stale", title: "Bekor qilib bo‘lmadi", message };
    default:
      return stale
        ? { kind: "stale", title: "Amal bajarilmadi", message }
        : { kind: "retry", title: "Amal bajarilmadi", message };
  }
}
