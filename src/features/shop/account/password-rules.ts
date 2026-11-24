import type { Reauth } from "@/data/shop/account.actions";
import type { ActionFailure } from "@/data/types";

/** What is wrong with a new password before it is sent (the API's own rules: 8+ characters, not only digits). */
export type NewPasswordProblem = "short" | "digits" | "mismatch";

export function newPasswordProblem(password: string, repeat: string): NewPasswordProblem | null {
  if (password.length < 8) return "short";
  if (/^\d+$/.test(password)) return "digits";
  if (password !== repeat) return "mismatch";
  return null;
}

/** Whether the "confirm it's you" step has a proof to send: the current password typed, or a verified code. */
export function hasReauthProof(proof: Reauth): boolean {
  return Boolean(proof.verificationToken || proof.password);
}

/**
 * The text of a refusal no field of the form shows: the API's message when it named no field, else the first
 * field error outside `shown` (a refused save must never look like "nothing happened").
 */
export function unplacedError(
  failure: ActionFailure | null,
  shown: readonly string[],
): string | null {
  if (!failure) return null;
  const fields = failure.fieldErrors ?? {};
  const keys = Object.keys(fields);
  if (keys.length === 0) return failure.error || null;
  const other = keys.find((key) => !shown.includes(key));
  return other ? fields[other] || failure.error || null : null;
}
