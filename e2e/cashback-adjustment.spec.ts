import { expect, test } from "@playwright/test";

import { heading } from "./helpers";

/** Malika's card in the seed_demo dataset. */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/5";

// The customer card reads `notWiredYet` in api mode until the customers slice
// (F2c) lands; enable this test together with that wiring.
test.fixme("a double-submitted adjustment posts exactly one ledger entry", async ({ page }) => {
  const reason = `e2e tuzatish ${Date.now()}`;
  await page.goto(CUSTOMER_PATH);
  await expect(heading(page)).toBeVisible();

  await page.getByRole("button", { name: "Cashback tuzatish" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Cashback tuzatish" });
  await dialog.getByLabel("Summa").fill("1000");
  await dialog.getByLabel("Sabab (majburiy)").fill(reason);
  const submit = dialog.getByRole("button", { name: "Tasdiqlash" });
  await submit.dblclick();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByText(reason)).toHaveCount(1);
});
