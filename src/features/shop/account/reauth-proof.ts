import type { Reauth } from "@/data/shop/account.actions";

/**
 * The re-authentication proof to keep after a refused sign-in-method change.
 *
 * A code-based proof the API refused (`verification_invalid`: the token
 * expired, was already used, or the password changed meanwhile) is dropped,
 * so the step offers a new code instead of showing "✓ verified" over a token
 * that can never pass. Anything else keeps the proof as it was.
 */
export function keepReauthAfter<T extends Reauth | null>(
  current: T,
  failure: { code?: string | null },
): T | Reauth {
  if (failure.code === "verification_invalid" && current?.verificationToken) return {};
  return current;
}
