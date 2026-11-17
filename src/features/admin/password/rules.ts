/**
 * The live checklist under a new password (DESIGN §E): what the form checks before it posts. The
 * backend's own validators (common, too similar to the name or email, unchanged) still answer on
 * the field after these pass. Pure, unit-tested.
 */

export interface PasswordChecks {
  /** At least `min` characters. */
  length: boolean;
  /** Not made of digits alone (empty counts as not met). */
  notNumeric: boolean;
  /** The confirmation equals the password (both typed). */
  matches: boolean;
}

export function passwordChecks(
  password: string,
  confirmation: string,
  min: number,
): PasswordChecks {
  return {
    length: password.length >= min,
    notNumeric: password.length > 0 && !/^\d+$/.test(password),
    matches: password.length > 0 && password === confirmation,
  };
}

export function allChecksMet(checks: PasswordChecks): boolean {
  return checks.length && checks.notNumeric && checks.matches;
}
