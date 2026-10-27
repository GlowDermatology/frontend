import { chromium, type FullConfig } from "@playwright/test";

import { signIn } from "./helpers";

/** Signs in once and stores the session cookies for every spec. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  // The anonymous storefront project needs no staff session (and no password).
  const only = process.argv.findIndex((arg) => arg === "--project" || arg.startsWith("--project="));
  const project =
    only === -1
      ? undefined
      : process.argv[only]!.includes("=")
        ? process.argv[only]!.split("=")[1]
        : process.argv[only + 1];
  // Neither do the customer projects (they sign customers up themselves).
  if (project?.startsWith("customer")) return;
  const { baseURL, ignoreHTTPSErrors } = config.projects[0]!.use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, ignoreHTTPSErrors });
  await signIn(page);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
  await browser.close();
}
