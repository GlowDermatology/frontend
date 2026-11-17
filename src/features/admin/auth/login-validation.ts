/**
 * Client-side check of the staff sign-in form before it is posted: the same rules as the
 * `login` Server Action's schema (an email address, a password), with messages per field so the
 * first one can be revealed. Pure, for the tests.
 */

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export interface LoginMessages {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(
  email: string,
  password: string,
  messages: LoginMessages,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmed = email.trim();
  if (trimmed === "") errors.email = messages.emailRequired;
  else if (trimmed.length > 254 || !EMAIL.test(trimmed)) errors.email = messages.emailInvalid;
  if (password === "") errors.password = messages.passwordRequired;
  return errors;
}

export function hasLoginErrors(errors: LoginFieldErrors): boolean {
  return Boolean(errors.email || errors.password);
}
