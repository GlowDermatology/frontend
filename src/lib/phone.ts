/**
 * Uzbek mobile numbers (contract §1.4: E.164 `^\+998\d{9}$`), shared by the
 * forms and the Server Actions.
 */

export const PHONE_PATTERN = /^\+998\d{9}$/;

/**
 * The nine national digits in what the admin typed or pasted. The mask writes
 * its own "+998 " prefix into the field, so on every later keystroke a value
 * starting with "+" carries the country code first and it is dropped — by its
 * group before the first space ("+998 90 1" → "901", also "+98 90 1" after a
 * deleted prefix digit), or as a leading 998 when there is no space
 * ("+998901234567"). What is left of a prefix being deleted ("+998 ", "+99")
 * has no national digits. Without a "+", a leading 998 is the country code
 * only when more than nine digits were given ("998901234567").
 */
export function nationalDigits(input: string): string {
  const value = input.trim();
  let digits: string;
  if (value.startsWith("+")) {
    const grouped = /^\+\d+\s+(.*)$/s.exec(value);
    if (grouped) {
      digits = grouped[1]!.replace(/\D/g, "");
      // "998…" typed after the field's own "+998" (a full "998 93 …" number): past nine digits it is the
      // country code again, not the start of the national number.
      if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
    } else {
      const all = value.replace(/\D/g, "");
      digits = all.startsWith("998") ? all.slice(3) : "998".startsWith(all) ? "" : all;
    }
  } else {
    digits = value.replace(/\D/g, "");
    if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/**
 * Typing mask "+998 XX XXX XX XX": keeps what was typed so far in that shape
 * ("90123" → "+998 90 123"). A field without national digits is empty, so
 * deleting into the prefix clears it instead of reading "99" as digits.
 */
export function maskPhone(input: string): string {
  const digits = nationalDigits(input);
  if (!digits) return "";
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return ["+998", ...parts.filter(Boolean)].join(" ");
}

/**
 * The masked phone field's next value while typing: `maskPhone`, except that a "+", "+9", "+99" or "+998"
 * being typed into an empty field stays as typed, so the visitor can type the country code themselves
 * ("+998 93 …" must not lose its "+" and turn "998" into national digits). Deleting into the prefix still
 * clears the field.
 */
export function maskTypedPhone(next: string, previous: string): string {
  const trimmed = next.trim();
  if (
    next.length > previous.length &&
    /^\+\d{0,3}$/.test(trimmed) &&
    "998".startsWith(trimmed.slice(1))
  ) {
    return trimmed;
  }
  return maskPhone(next);
}

/** "+998 90 123 45 67", "90 123 45 67", "998901234567" → "+998901234567"; else the trimmed input. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  if (digits.length === 9 && !trimmed.startsWith("+")) return `+998${digits}`;
  return trimmed.replace(/[\s()-]/g, "");
}

/**
 * The national part as the phone input shows it beside its fixed "+998":
 * "901234567" → "90 123 45 67", partial numbers keep the shape so far
 * ("90123" → "90 123"). Takes anything `nationalDigits` reads.
 */
export function formatNationalPhone(input: string): string {
  const digits = nationalDigits(input);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

/**
 * The phone input's value for the national digits typed so far: "" for none,
 * "+998" + digits otherwise (E.164 once all nine are there, `PHONE_PATTERN`
 * fails on a partial number, so the form's validation names it).
 */
export function phoneValue(input: string): string {
  const digits = nationalDigits(input);
  return digits ? `+998${digits}` : "";
}

/** Caret position just after the `count`-th digit of `text` (0 → start). */
export function caretAfterDigits(text: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (/\d/.test(text[index]!)) {
      seen += 1;
      if (seen === count) return index + 1;
    }
  }
  return text.length;
}
