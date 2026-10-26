import { expect, test } from "@playwright/test";

import { cancelOrderThroughUi, heading, listedOrderIds, toast, watchPage } from "./helpers";

/**
 * Refund operations of the payments board against the seeded backend
 * (contract §2.12, §7 item 18). A Payme refund is manual (`manual_required`,
 * M2 §5.1): the spec resolves one the board lists under "Harakat kerak", and
 * creates one first by cancelling a Payme order when there is none.
 */

test("a manual Payme refund is marked returned from the payments board", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto("/admin/payments?refund=needs_action");
  await expect(heading(page)).toHaveText("To‘lovlar");
  const rows = page.locator("table tbody tr");
  await expect(rows.first().or(page.getByText("To‘lov topilmadi"))).toBeVisible();
  const manual = rows.filter({ hasText: "Payme kabinetida qaytarish kerak" });

  let orderId: number;
  if ((await manual.count()) > 0) {
    orderId = Number((await manual.first().getByRole("link").first().innerText()).replace("№", ""));
  } else {
    const ids = await listedOrderIds(page, "/admin/orders?status=processing&period=all", "Payme");
    test.skip(ids.length === 0, "no manual refund and no Payme order left to cancel");
    orderId = ids.at(-1)!;
    await cancelOrderThroughUi(page, orderId, `e2e qaytarish ${Date.now()}`);
  }

  await page.goto(`/admin/payments?q=${orderId}`);
  await expect(heading(page)).toHaveText("To‘lovlar");
  const row = page.locator("table tbody tr").filter({ hasText: `№${orderId}` });
  await expect(row).toContainText("Payme kabinetida qaytarish kerak");
  const trigger = row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` });
  await trigger.click();
  await page.getByRole("menuitem", { name: /^Qaytarildi deb belgilash/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Qaytarish bajarildimi?" });
  await expect(dialog).toContainText("Payme kabinetida");
  await dialog.getByRole("button", { name: "Qaytarildi deb belgilash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toBeVisible();
  await expect(row).toContainText("Qaytarildi");
  await expect(row).toContainText("Qaytarilgan");
  // A settled refund offers no operation: the row has no menu any more.
  await expect(row.getByRole("button", { name: /Qaytarish amallari/ })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("table tbody tr").filter({ hasText: `№${orderId}` })).toContainText(
    "Qaytarilgan",
  );
  watcher.assertClean();
});
