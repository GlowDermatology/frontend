import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./e2e/env";

/**
 * End-to-end suite against a running frontend in api mode and a backend in
 * fake integrations mode seeded with `manage.py seed_demo` (see e2e/README.md).
 * One worker: the specs share one database.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    storageState: "e2e/.auth/admin.json",
    ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORE_HTTPS_ERRORS),
    trace: "retain-on-failure",
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /customer-public\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // The public storefront, anonymous (no admin session): browse, switch
      // language, axe at 390 and 1440 px. Needs the frontend in api mode.
      name: "customer-public",
      testDir: "./e2e/customer-public",
      use: { ...devices["Desktop Chrome"], storageState: { cookies: [], origins: [] } },
    },
  ],
});
