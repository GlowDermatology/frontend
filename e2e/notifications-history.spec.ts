import { expect, test } from "@playwright/test";

import { BACKEND_DIR, createCancelledCampaigns, deleteCampaigns } from "./backend-shell";
import { heading, watchPage } from "./helpers";

/**
 * The notifications history (gap X-NOTIF-HISTORY, contract §2.8): pages,
 * state and kind filters in the URL, and the `bildirishnomalar` export.
 * The seed has four campaigns, so the spec adds 21 cancelled ones (never
 * sent, titled `e2e tarix …`) through the backend shell and removes them
 * afterwards.
 */

const PREFIX = "e2e tarix";

test.beforeEach(() => {
  if (BACKEND_DIR) {
    deleteCampaigns(PREFIX);
    createCancelledCampaigns(PREFIX, 21);
  }
});

test.afterEach(() => {
  if (BACKEND_DIR) deleteCampaigns(PREFIX);
});

test("the history pages, filters by state and kind, and exports what it shows", async ({
  page,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the history cannot be given a second page");
  const watcher = watchPage(page);
  await page.goto("/admin/notifications");
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const history = page.getByRole("region", { name: "Yuborilgan xabarlar" });
  const rows = history.locator("tbody tr");
  await expect(rows).toHaveCount(20);

  await page
    .getByRole("navigation", { name: "Sahifalar" })
    .getByRole("link", { name: "2-sahifa" })
    .click();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect(page.getByRole("link", { name: "2-sahifa" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(rows.first()).toBeVisible();

  // State filter: only the cancelled ones, back on page 1.
  await page.getByRole("button", { name: /^Holat: / }).click();
  await page.getByRole("menuitemradio", { name: "Bekor qilindi" }).click();
  await expect(page).toHaveURL(/state=cancelled/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.locator("td:nth-child(7)").allInnerTexts()) {
    expect(text).toMatch(/bekor qilindi/i);
  }
  // Kind filter on top: promo has no cancelled e2e row.
  await page.getByRole("button", { name: /^Turi: / }).click();
  await page.getByRole("menuitemradio", { name: "Umumiy" }).click();
  await expect(page).toHaveURL(/kind=general/);
  await expect(rows.filter({ hasText: PREFIX }).first()).toBeVisible();

  // The export carries the same filters.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Eksport/ }).click();
  await page.getByRole("menuitem", { name: /CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^bildirishnomalar.*\.csv$/);
  const chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString("utf8");
  const [header, ...lines] = body.replace(/^﻿/, "").trim().split("\r\n");
  expect(header).toContain("Havola");
  expect(lines.length).toBeGreaterThanOrEqual(21);
  expect(lines.every((line) => line.includes("Umumiy"))).toBe(true);
  watcher.assertClean();
});
