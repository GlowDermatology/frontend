import { expect, test } from "@playwright/test";

import { heading, toast, watchPage } from "./helpers";

/**
 * The seed's design day (`DESIGN_DAY` of the backend's appointment seed):
 * its three requests stay there, so once the wall clock is past it the spec
 * looks for them on that day instead of today.
 */
const DESIGN_DAY = process.env.E2E_APPOINTMENTS_DAY ?? "2026-10-26";

/**
 * Confirming a requested visit (contract §2.9). The board selects the day's
 * first request — today's, else the seed's design day's; the seed keeps
 * three requests on that day, so the spec is skipped once they are all
 * handled (reset with `seed_demo --reset`).
 */
test("a requested visit is confirmed and stays confirmed after a reload", async ({ page }) => {
  const watcher = watchPage(page);
  const panel = page.locator('[aria-labelledby="appointment-title"]');
  const requested = page.locator("button[data-appointment-id]").filter({
    has: page.locator(".bg-warning"),
  });
  let board = "/admin/appointments";
  for (const href of [board, `/admin/appointments?date=${DESIGN_DAY}`]) {
    board = href;
    await page.goto(href);
    await expect(heading(page)).toHaveText("Qabullar");
    await expect(panel).toBeVisible();
    if ((await requested.count()) > 0) break;
  }
  test.skip(
    (await requested.count()) === 0,
    "the seed has no requested visit left today or on its design day",
  );

  const visit = requested.first();
  const id = await visit.getAttribute("data-appointment-id");
  await visit.click();
  await expect(visit).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toContainText("Tasdiq kutilmoqda");
  await panel.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(toast(page, "Qabul tasdiqlandi")).toBeVisible();
  await expect(panel).toContainText("Tasdiqlangan");
  await expect(panel.getByRole("button", { name: "Tasdiqlash" })).toHaveCount(0);

  await page.goto(board);
  await expect(heading(page)).toHaveText("Qabullar");
  const same = page.locator(`button[data-appointment-id="${id}"]`);
  await same.click();
  await expect(panel).toContainText("Tasdiqlangan");
  watcher.assertClean();
});
