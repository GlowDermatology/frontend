/** Credentials of the staff account the suite signs in with (seed_demo creates admin@glowderma.uz). */
export function adminCredentials(): { email: string; password: string } {
  const email = process.env.E2E_ADMIN_EMAIL ?? "admin@glowderma.uz";
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "E2E_ADMIN_PASSWORD is not set (the backend's SEED_ADMIN_PASSWORD for seed_demo)",
    );
  }
  return { email, password };
}

/**
 * Credentials of the ordinary (non-superuser) staff account the approval
 * specs sign in with to check that no privileged control is offered
 * (`e2e/backend-shell.ts` `ensureStaffAccount` creates it when
 * `E2E_BACKEND_DIR` is set). `null` when `E2E_STAFF_PASSWORD` is unset: those
 * specs are then skipped.
 */
export function staffCredentials(): { email: string; password: string } | null {
  const password = process.env.E2E_STAFF_PASSWORD;
  if (!password) return null;
  return { email: process.env.E2E_STAFF_EMAIL ?? "e2e-xodim@glowderma.uz", password };
}

/** Where the global setup stores the ordinary staff account's session. */
export const STAFF_STORAGE_STATE = "e2e/.auth/staff.json";

/**
 * Credentials of the Specialist account whose workspace (`/admin/my-*`) the workspace spec
 * drives (`e2e/backend-shell.ts` `ensureSpecialistAccount` creates it, with a draft profile at
 * an e2e clinic, when `E2E_BACKEND_DIR` is set). Test values only: `E2E_SPECIALIST_PASSWORD` is
 * a password the suite sets for this e2e account, never a real one. `null` when it is unset:
 * the workspace spec is then skipped.
 */
export function specialistCredentials(): { email: string; password: string } | null {
  const password = process.env.E2E_SPECIALIST_PASSWORD;
  if (!password) return null;
  return {
    email: process.env.E2E_SPECIALIST_EMAIL ?? "e2e-specialist@glowderma.uz",
    password,
  };
}

/** Where the global setup stores the Specialist account's session. */
export const SPECIALIST_STORAGE_STATE = "e2e/.auth/specialist.json";

/** Origin of the frontend under test. */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * The backend's origin, for the specs that read the customer API (free
 * slots, public settings, banners) to check what the admin changed;
 * unset, those checks are skipped.
 */
export const API_URL = process.env.E2E_API_URL;
