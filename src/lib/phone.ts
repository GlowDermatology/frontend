/**
 * Uzbek mobile numbers (contract §1.4: E.164 `^\+998\d{9}$`), shared by the
 * forms and the Server Actions.
 */

export const PHONE_PATTERN = /^\+998\d{9}$/;

/** The nine national digits the admin typed (a leading 998 is the country code). */
function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/**
 * Typing mask "+998 XX XXX XX XX": keeps what was typed so far in that shape
 * ("90123" → "+998 90 123"). An empty field stays empty.
 */
export function maskPhone(input: string): string {
  const digits = nationalDigits(input);
  if (!digits && !/\d/.test(input)) return "";
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return ["+998", ...parts.filter(Boolean)].join(" ");
}

/** "+998 90 123 45 67", "90 123 45 67", "998901234567" → "+998901234567"; else the trimmed input. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  if (digits.length === 9 && !trimmed.startsWith("+")) return `+998${digits}`;
  return trimmed.replace(/[\s()-]/g, "");
}
