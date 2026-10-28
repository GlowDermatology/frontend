import { mkdirSync } from "node:fs";

import { test as setup } from "@playwright/test";

import { randomPhone, signUp } from "./helpers";

/** A fresh phone customer for the "customer" project (its own storage state). */
setup("sign a customer up by phone", async ({ page }) => {
  await signUp(page, randomPhone(), "Sinov Mijoz");
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "e2e/.auth/customer.json" });
});
