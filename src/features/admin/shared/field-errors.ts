import type { ActionFailure } from "@/data/types";

/**
 * Splits a failed action's `fieldErrors` into the ones a form can show next
 * to a rendered field and a form-level message for everything else, so a
 * backend error on a field the form does not render (a stale product link,
 * `service_id` on a move, a bare `texts`) is never dropped silently.
 *
 * - `fieldErrors`: the entries whose key is one of `rendered`.
 * - `formError`: `failure.error` when there are no field errors at all; the
 *   distinct messages of the unrendered keys when there are some; `null`
 *   when every field error has a place on the form.
 */
export function partitionFieldErrors(
  failure: Pick<ActionFailure, "error" | "fieldErrors">,
  rendered: Iterable<string>,
): { fieldErrors: Record<string, string>; formError: string | null } {
  const shown = new Set(rendered);
  const entries = Object.entries(failure.fieldErrors ?? {});
  if (entries.length === 0) return { fieldErrors: {}, formError: failure.error };
  const fieldErrors: Record<string, string> = {};
  const unshown: string[] = [];
  for (const [key, message] of entries) {
    if (shown.has(key)) fieldErrors[key] = message;
    else if (!unshown.includes(message)) unshown.push(message);
  }
  return { fieldErrors, formError: unshown.length > 0 ? unshown.join(" ") : null };
}
