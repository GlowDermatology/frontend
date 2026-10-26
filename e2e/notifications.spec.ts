import { expect, test } from "@playwright/test";

import { heading, toast, watchPage } from "./helpers";

/** The generated customer the specs write to (see e2e/README.md). */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288";

/**
 * A scheduled push to one customer (contract §2.8): never sent by the run
 * itself (the backend's beat sends it at its time), so the spec does not
 * reach every customer. Each run adds one scheduled message with a unique
 * title; the backend has no cancel for it.
 */
test("a push scheduled for one customer is listed as scheduled", async ({ page }) => {
  const watcher = watchPage(page);
  const customerId = CUSTOMER_PATH.split("/").at(-1)!;
  const title = `e2e rejalashtirilgan ${Date.now()}`;

  await page.goto(`/admin/notifications?customer=${customerId}`);
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  // The customer card's "Xabar yuborish" prefills the recipient.
  await expect(page.getByRole("radio", { name: /Bitta mijoz/ })).toBeChecked();
  await expect(page.getByLabel("Mijoz telefoni")).toHaveValue(/^\+998/);
  await page.getByLabel("Sarlavha").fill(title);
  await page.getByLabel("Matn").fill("E2E: rejalashtirilgan xabar, yuborilmaydi.");
  await page.getByRole("radio", { name: "Rejalashtirish" }).check();
  const when = page.getByLabel("Yuborish vaqti (Toshkent)");
  await expect(when).toHaveValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  await page.getByRole("button", { name: "Rejalashtirish" }).click();

  await expect(toast(page, /ga rejalashtirildi/)).toBeVisible();
  const history = page.getByRole("region", { name: "Yuborilgan xabarlar" });
  const row = history.locator("tr").filter({ hasText: title });
  await expect(row).toContainText("Rejalashtirilgan");

  // Persisted by the backend, not only the board's local history.
  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(
    page
      .getByRole("region", { name: "Yuborilgan xabarlar" })
      .locator("tr")
      .filter({ hasText: title }),
  ).toContainText("Rejalashtirilgan");
  watcher.assertClean();
});
