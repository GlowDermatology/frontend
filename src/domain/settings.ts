/** How the current session's sign-in was proven (contract §2.1 `Me.auth_method`, M3). */
export type StaffAuthMethod = "password" | "google" | "facebook" | "apple";

/** The signed-in staff member's account (contract §2.1 `Me`). */
export interface StaffAccount {
  id: string;
  email: string;
  displayName: string;
  /** May manage staff accounts (contract §2.16, `Me.is_manager`; superusers always). */
  isManager: boolean;
  /** Social sign-in providers linked to this account. */
  linkedProviders: string[];
  sessionExpiresAt: string | null;
  /**
   * How this session signed in: `null` for a session opened before the
   * backend recorded it (it cannot link), `undefined` when the backend does
   * not report it at all (before M3: «Bog‘lash» stays, the 403 explains a
   * refused link).
   */
  authMethod: StaffAuthMethod | null | undefined;
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

/**
 * Why this session cannot link a provider, or `null` when it may try: a
 * password sign-in, or a backend that does not report `auth_method` (before
 * M3), where Django's 403 is the guard and `oauthLinkErrorMessage` explains it.
 */
export function linkBlockedMessage(authMethod: StaffAuthMethod | null | undefined): string | null {
  if (authMethod === "password" || authMethod === undefined) return null;
  return authMethod === null ? LINK_NEEDS_NEW_SIGN_IN_MESSAGE : LINK_NEEDS_PASSWORD_MESSAGE;
}
