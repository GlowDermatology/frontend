import type { ContentLanguage } from "./product";

/** The typed settings singleton (contract §2.11). */
export interface SiteSettings {
  /** How long an unpaid order holds its items, minutes (5..60). */
  reservationMinutes: number;
  /** E.164 or `null` (not shown in the app). */
  supportPhone: string | null;
  pickupAddress: Record<ContentLanguage, string>;
  /** Read-only, from the backend's `INTEGRATIONS_MODE`. */
  integrationsMode: "fake" | "live";
  updatedAt: string;
  /** Staff display name; `null` = system / seed. */
  updatedBy: string | null;
}

export const RESERVATION_MIN = 5;
export const RESERVATION_MAX = 60;
export const PICKUP_ADDRESS_MAX = 200;

/** How the current session's sign-in was proven (contract §2.1 `Me.auth_method`, M3). */
export type StaffAuthMethod = "password" | "google" | "facebook" | "apple";

/** The signed-in staff member's account (contract §2.1 `Me`). */
export interface StaffAccount {
  id: string;
  email: string;
  displayName: string;
  /** Social sign-in providers linked to this account. */
  linkedProviders: string[];
  sessionExpiresAt: string | null;
  /** How this session signed in; `null` for a session opened before the backend recorded it. */
  authMethod: StaffAuthMethod | null;
}

/**
 * Only a session that signed in with the password may link a social
 * identity (contract §2.1: `link/` answers 403 otherwise, M2). The backend's
 * "Ruxsat yo‘q." does not say what to do, so the account card says it —
 * instead of «Bog‘lash» since M3 (`auth_method`), and after a refused link.
 */
export const LINK_NEEDS_PASSWORD_MESSAGE =
  "Ijtimoiy tarmoq orqali ochilgan sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.";

/** The same hint for a session whose sign-in the backend did not record (`auth_method` null). */
export const LINK_NEEDS_NEW_SIGN_IN_MESSAGE =
  "Bu sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.";

/** Why this session cannot link a provider, or `null` when it can (a password sign-in). */
export function linkBlockedMessage(authMethod: StaffAuthMethod | null): string | null {
  if (authMethod === "password") return null;
  return authMethod === null ? LINK_NEEDS_NEW_SIGN_IN_MESSAGE : LINK_NEEDS_PASSWORD_MESSAGE;
}
