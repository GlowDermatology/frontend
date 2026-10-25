import { expect, test } from "@playwright/test";

import { NAV_ITEMS } from "../src/features/admin/shell/nav-items";
import { heading, watchPage } from "./helpers";

for (const item of NAV_ITEMS) {
  test(`${item.label} renders from the API without errors`, async ({ page }) => {
    const watcher = watchPage(page);
    const response = await page.goto(item.href);
    expect(response?.status()).toBe(200);
    await expect(heading(page)).toBeVisible();
    await expect(page.getByText("Demo ma’lumotlar")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    watcher.assertClean();
  });
}

test("the sidebar navigates between sections", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "Mahsulotlar" }).first().click();
  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(heading(page)).toHaveText("Mahsulotlar");
});
