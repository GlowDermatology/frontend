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

/** The signed-in staff member's account (contract §2.1 `Me`). */
export interface StaffAccount {
  id: string;
  email: string;
  displayName: string;
  /** Social sign-in providers linked to this account. */
  linkedProviders: string[];
  sessionExpiresAt: string | null;
}
