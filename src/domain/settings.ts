import type { ContentLanguage } from "./product";

/** The typed settings singleton (contract §2.11). */
export interface SiteSettings {
  /** How long an unpaid order holds its items, minutes (5..60). */
  reservationMinutes: number;
  /** E.164 or `null` (not shown in the app). */
  supportPhone: string | null;
  pickupAddress: Record<ContentLanguage, string>;
  /** The app's Settings section phone (E.164) or `null` (gap X-SET-CONTACTS). */
  storePhone: string | null;
  /** The AI section's cosmetologist phone (Phase 2), E.164 or `null`. */
  cosmetologistPhone: string | null;
  /** `https` links or `null`, shown in the app. */
  telegramUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  /** Terms of Use, the DRAFT staff edit (gap X-SET-LEGAL); `""` = not filled. */
  terms: Record<ContentLanguage, string>;
  /** Privacy Policy, the DRAFT. */
  privacyPolicy: Record<ContentLanguage, string>;
  /** Cancellation / reschedule terms of bookings; one copy, served as soon as it is saved. */
  bookingPolicy: Record<ContentLanguage, string>;
  /** The published version (`YYYYMMDD-n`), `null` while never published. */
  termsVersion: string | null;
  /** When that version was published, `null` while never published. */
  termsUpdatedAt: string | null;
  /** A terms / privacy draft differs from the published copy. */
  termsUnpublishedChanges: boolean;
  /** Read-only, from the backend's `INTEGRATIONS_MODE`. */
  integrationsMode: "fake" | "live";
  updatedAt: string;
  /** Staff display name; `null` = system / seed. */
  updatedBy: string | null;
}

export const RESERVATION_MIN = 5;
export const RESERVATION_MAX = 60;
export const PICKUP_ADDRESS_MAX = 200;

/** The legal texts of the settings (contract §2.11) and their limits in characters. */
export const LEGAL_DOCUMENTS = ["terms", "privacyPolicy", "bookingPolicy"] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const LEGAL_TEXT_MAX: Record<LegalDocument, number> = {
  terms: 50_000,
  privacyPolicy: 50_000,
  bookingPolicy: 5_000,
};

export const LEGAL_DOCUMENT_LABEL: Record<LegalDocument, string> = {
  terms: "Foydalanish shartlari",
  privacyPolicy: "Maxfiylik siyosati",
  bookingPolicy: "Qabul qoidalari",
};

/** Characters as the server counts them (code points, not UTF-16 units). */
export function characterCount(value: string): number {
  return [...value].length;
}

/** Whether a text has a visible character (the server stores an invisible-only text as `""`). */
export function hasVisibleText(value: string): boolean {
  return /[^\s\p{Cf}]/u.test(value);
}

/**
 * The next `terms_version` the server would issue (contract §2.11):
 * `YYYYMMDD-n`, the Tashkent day and its count on that day from 1; a stored
 * version of a later day keeps that day and counts on.
 */
export function nextTermsVersion(current: string | null, tashkentDay: string): string {
  const day = tashkentDay.replaceAll("-", "");
  const match = current ? /^(\d{8})-(\d+)$/.exec(current) : null;
  if (!match || match[1]! < day) return `${day}-1`;
  return `${match[1]}-${Number(match[2]) + 1}`;
}

/** The refusal of a publication without the Uzbek terms or privacy text (409 `conflict`). */
export const PUBLISH_NEEDS_UZ_MESSAGE =
  "Foydalanish shartlari va maxfiylik siyosatining o‘zbekcha matnini kiriting, so‘ng e’lon qiling.";

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
