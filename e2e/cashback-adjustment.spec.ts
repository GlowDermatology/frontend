import { expect, test, type Page } from "@playwright/test";

import { heading, watchPage } from "./helpers";

/** A generated customer of the seed_demo dataset (Malika, customer 5, keeps the design numbers). */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288";

/** The card's "Cashback balansi" value, e.g. "12 340 so‘m". */
function balance(page: Page) {
  return page
    .locator("div")
    .filter({ has: page.getByText("Cashback balansi", { exact: true }) })
    .last()
    .locator("span")
    .nth(1);
}

async function adjust(
  page: Page,
  direction: "Qo‘shish" | "Ayirish",
  amount: string,
  reason: string,
  submit: "click" | "dblclick" = "click",
): Promise<void> {
  await page.getByRole("button", { name: "Cashback tuzatish" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Cashback tuzatish" });
  await dialog.getByRole("radio", { name: direction }).check();
  await dialog.getByLabel("Summa").fill(amount);
  await dialog.getByLabel("Sabab (majburiy)").fill(reason);
  const confirm = dialog.getByRole("button", { name: "Tasdiqlash" });
  if (submit === "dblclick") await confirm.dblclick();
  else await confirm.click();
  await expect(dialog).toBeHidden();
}

/**
 * The adjustment dialog against the seeded backend (contract §2.6): a double
 * submit posts one ledger entry, and the spec takes the amount back out with
 * a second adjustment, so the customer's balance is what it was before the
 * run (the ledger keeps both rows, each with a unique reason).
 */
test("a double-submitted adjustment posts exactly one ledger entry", async ({ page }) => {
  const watcher = watchPage(page);
  const stamp = Date.now();
  const reason = `e2e tuzatish ${stamp}`;
  await page.goto(CUSTOMER_PATH);
  await expect(heading(page)).toBeVisible();
  const before = (await balance(page).innerText()).trim();

  await adjust(page, "Qo‘shish", "1000", reason, "dblclick");
  await page.reload();
  await expect(page.getByText(reason)).toHaveCount(1);
  await expect(balance(page)).not.toHaveText(before);

  await adjust(page, "Ayirish", "1000", `${reason} (qaytarildi)`);
  await page.reload();
  await expect(page.getByText(`${reason} (qaytarildi)`)).toHaveCount(1);
  await expect(balance(page)).toHaveText(before);
  watcher.assertClean();
});
