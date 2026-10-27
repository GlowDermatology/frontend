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

/** Origin of the frontend under test. */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * The backend's origin, for the specs that read the customer API (free
 * slots, public settings, banners) to check what the admin changed;
 * unset, those checks are skipped.
 */
export const API_URL = process.env.E2E_API_URL;
