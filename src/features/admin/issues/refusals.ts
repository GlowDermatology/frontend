import type { ActionFailure } from "@/data/types";
import { ISSUE_NOTE_MAX, ISSUE_NOTE_MIN } from "@/domain/delivery-issue";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

/**
 * How the issue dialogs (resolve, staff incident, dispatch switch) treat a
 * refusal of the API (INTERFACES-ops):
 *
 * - `field` — a 400 on a rendered field (`note`, `until`): shown next to it,
 *   the dialog and its idempotency key stay;
 * - `stale` — the row changed under the screen (404 `not_found`, 409
 *   `conflict`: already resolved, an incident on a pickup order): toasted,
 *   the dialog closes and the screen re-reads;
 * - `retry` — transient (network, 503, busy order, throttled, a form-level
 *   400): the message stays in the dialog with the same key for a retry.
 */
export type IssueRefusal =
  | { kind: "field"; field: string; message: string }
  | { kind: "stale"; message: string }
  | { kind: "retry"; message: string };

const STALE = new Set(["not_found", "conflict"]);

export function issueRefusal(result: ActionFailure, fields: ReadonlyArray<string>): IssueRefusal {
  for (const field of fields) {
    const message = result.fieldErrors?.[field];
    if (message) return { kind: "field", field, message };
  }
  if (result.code && STALE.has(result.code)) return { kind: "stale", message: result.error };
  return { kind: "retry", message: result.error };
}

/**
 * The backend's note rule (3..1000 after trimming) with its messages in the admin language
 * (Uzbek by default); `null` when valid.
 */
export function noteError(note: string, locale: Locale = "uz"): string | null {
  const m = validationCopy[locale];
  const length = note.trim().length;
  if (length === 0) return m.required;
  if (length < ISSUE_NOTE_MIN) return m.minChars(ISSUE_NOTE_MIN);
  if (length > ISSUE_NOTE_MAX) return m.maxChars(ISSUE_NOTE_MAX);
  return null;
}
