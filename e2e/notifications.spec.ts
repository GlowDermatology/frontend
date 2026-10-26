import { expect, test } from "@playwright/test";

import { heading, toast, watchPage } from "./helpers";

/** The generated customer the specs write to (see e2e/README.md). */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288";

/**
 * The send time of the spec's message: the last day the API accepts (Django
 * reads years up to 9999), so no beat ever reaches it — a near date would
 * really be sent to the customer.
 */
const FAR_FUTURE = "9999-12-31T10:00";

/**
 * A scheduled push to one customer (contract §2.8): never sent by the run
 * itself, and scheduled at `FAR_FUTURE` so the backend's beat never sends it
 * either. Each run adds one scheduled message with a unique title; the API
 * has no cancel for it (cleanup: e2e/README.md).
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
  await when.fill(FAR_FUTURE);
  await page.getByRole("button", { name: "Rejalashtirish" }).click();

  await expect(toast(page, /31-dek, 10:00 ga rejalashtirildi/)).toBeVisible();
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
