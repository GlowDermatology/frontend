import { expect, test } from "@playwright/test";

import { heading, toast, watchPage } from "./helpers";

/**
 * Confirming a requested visit (contract §2.9). The board selects the day's
 * first request; the seed keeps three requests on its "today", so the spec
 * is skipped once they are all handled (reset with `seed_demo --reset`).
 */
test("a requested visit is confirmed and stays confirmed after a reload", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto("/admin/appointments");
  await expect(heading(page)).toHaveText("Qabullar");
  const panel = page.locator('[aria-labelledby="appointment-title"]');
  await expect(panel).toBeVisible();
  const requested = page.locator("button[data-appointment-id]").filter({
    has: page.locator(".bg-warning"),
  });
  test.skip((await requested.count()) === 0, "the seed has no requested visit left today");

  const visit = requested.first();
  const id = await visit.getAttribute("data-appointment-id");
  await visit.click();
  await expect(visit).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toContainText("Tasdiq kutilmoqda");
  await panel.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(toast(page, "Qabul tasdiqlandi")).toBeVisible();
  await expect(panel).toContainText("Tasdiqlangan");
  await expect(panel.getByRole("button", { name: "Tasdiqlash" })).toHaveCount(0);

  await page.reload();
  await expect(heading(page)).toHaveText("Qabullar");
  const same = page.locator(`button[data-appointment-id="${id}"]`);
  await same.click();
  await expect(panel).toContainText("Tasdiqlangan");
  watcher.assertClean();
});
