import { PHONE_PATTERN, maskPhone, normalizePhone } from "@/lib/phone";

/**
 * The sign-in form's single "phone or e-mail" field (hybrid identity, B-W2:
 * every auth body takes `phone` **or** `email`). Pure; shared by the form
 * (live detection and the uz phone mask) and the Server Actions (the
 * authoritative parse). Unit-tested.
 */

export type Identifier = { kind: "phone"; phone: string } | { kind: "email"; email: string };

export type IdentifierParse =
  Identifier | { kind: "empty" } | { kind: "invalid"; looksLike: "phone" | "email" };

/** RFC-lite address check: one `@`, a dotted domain, no spaces; ≤254 characters. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * What the visitor is typing: an e-mail address as soon as there is an `@`
 * or a letter, otherwise a phone (digits, `+`, spaces, brackets, dashes).
 */
export function looksLike(input: string): "phone" | "email" | "empty" {
  const value = input.trim();
  if (!value) return "empty";
  if (value.includes("@") || /\p{L}/u.test(value)) return "email";
  return "phone";
}

export function parseIdentifier(input: unknown): IdentifierParse {
  if (typeof input !== "string") return { kind: "empty" };
  const value = input.trim();
  const kind = looksLike(value);
  if (kind === "empty") return { kind: "empty" };
  if (kind === "email") {
    const email = value.toLowerCase();
    return email.length <= 254 && EMAIL.test(email)
      ? { kind: "email", email }
      : { kind: "invalid", looksLike: "email" };
  }
  const phone = normalizePhone(value);
  return PHONE_PATTERN.test(phone)
    ? { kind: "phone", phone }
    : { kind: "invalid", looksLike: "phone" };
}

/**
 * The field's display value while typing: a phone gets the "+998 XX XXX XX
 * XX" mask, an address is left as typed. A bare "+" or a leading 9/digit
 * starts the mask; deleting into the prefix clears the field.
 */
export function formatIdentifierInput(input: string): string {
  if (looksLike(input) !== "phone") return input;
  // Keep "+", "+9", "+99", "+998" so the visitor can type the country code themselves.
  const trimmed = input.trim();
  if (/^\+\d{0,3}$/.test(trimmed) && "998".startsWith(trimmed.slice(1))) return trimmed;
  return maskPhone(input);
}

/** The API body keys of an identifier (`{phone}` or `{email}`, never both). */
export function identifierBody(identifier: Identifier): { phone?: string; email?: string } {
  return identifier.kind === "phone" ? { phone: identifier.phone } : { email: identifier.email };
}
