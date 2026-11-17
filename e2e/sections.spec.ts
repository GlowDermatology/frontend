import { expect, test } from "@playwright/test";

import { shellCopy } from "../src/features/admin/shell/copy";
import { NAV_ITEMS } from "../src/features/admin/shell/nav-items";
import { BASE_URL } from "./env";
import { heading, watchPage } from "./helpers";

/**
 * Every sidebar section renders from the API. «Muammolar»
 * (`/admin/delivery-issues`, Yandex Delivery) needs a backend with the
 * delivery exception queue (`delivery/issues/`, `delivery/suspension/`): the
 * shell's 30 s poll (`/admin/delivery-issues/alerts`) answers 502 against an
 * older one. The suite probes it once; without the queue the section is
 * skipped with that reason and the other sections ignore the poll's 502.
 */

let issueQueue = true;

test.beforeAll(async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: "e2e/.auth/admin.json",
    ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORE_HTTPS_ERRORS),
  });
  const response = await context.get("/admin/delivery-issues/alerts");
  issueQueue = response.status() !== 502;
  await context.dispose();
});

const ALERTS_POLL = "/admin/delivery-issues/alerts";

for (const item of NAV_ITEMS) {
  test(`${shellCopy.uz.nav[item.section]} renders from the API without errors`, async ({
    page,
  }) => {
    const isQueue = item.href === "/admin/delivery-issues";
    test.skip(
      isQueue && !issueQueue,
      "the backend has no delivery exception queue (Yandex Delivery): «Muammolar» cannot load",
    );
    const watcher = watchPage(page, issueQueue ? undefined : { ignorePaths: [ALERTS_POLL] });
    const response = await page.goto(item.href);
    expect(response?.status()).toBe(200);
    await expect(heading(page)).toBeVisible();
    if (isQueue) {
      await expect(heading(page)).toHaveText("Muammolar");
      // The dispatch switch and the queue's state tabs come from the API too.
      await expect(page.getByRole("switch")).toBeVisible();
    }
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

test("the sidebar reaches «Muammolar» (its badge does not change the link's name)", async ({
  page,
}) => {
  test.skip(!issueQueue, "the backend has no delivery exception queue (Yandex Delivery)");
  await page.goto("/admin");
  await page
    .getByRole("link", { name: /^Muammolar/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/delivery-issues/);
  await expect(heading(page)).toHaveText("Muammolar");
});
