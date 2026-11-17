import { expect, test, type Page } from "@playwright/test";

import { appointmentsCopy } from "../src/features/admin/appointments/copy";
import { addDays, addMonths } from "../src/lib/datetime";
import { heading, toast, watchPage } from "./helpers";
import { expectDisabledReason, fillDate, selectTrigger } from "./ui";

/**
 * The seed's design day (`DESIGN_DAY` of the backend's appointment seed):
 * its three requests stay there, so once the wall clock is past it the spec
 * looks for them on that day instead of today.
 */
const DESIGN_DAY = process.env.E2E_APPOINTMENTS_DAY ?? "2026-10-26";
const NEXT_DAY = addDays(DESIGN_DAY, 1);

/** The specs run in Uzbek (no language cookie); labels come from the copy module. */
const t = appointmentsCopy.uz;

const panelOf = (page: Page) => page.locator('[aria-labelledby="appointment-title"]');

/**
 * Confirming a requested visit (contract §2.9). The board selects the day's
 * first request — today's, else the seed's design day's; the seed keeps
 * three requests on that day, so the spec is skipped once they are all
 * handled (reset with `seed_demo --reset`).
 */
test("a requested visit is confirmed and stays confirmed after a reload", async ({ page }) => {
  const watcher = watchPage(page);
  const panel = panelOf(page);
  const requested = page.locator('button[data-appointment-id][data-status="requested"]');
  let board = "/admin/appointments";
  for (const href of [board, `/admin/appointments?date=${DESIGN_DAY}`]) {
    board = href;
    await page.goto(href);
    await expect(heading(page)).toHaveText(t.title);
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
  await expect(panel).toContainText(t.status.requested);
  await panel.getByRole("button", { name: t.panel.confirm }).click();
  await expect(toast(page, t.toast.confirmed)).toBeVisible();
  await expect(panel).toContainText(t.status.confirmed);
  await expect(panel.getByRole("button", { name: t.panel.confirm })).toHaveCount(0);

  await page.goto(board);
  await expect(heading(page)).toHaveText(t.title);
  const same = page.locator(`button[data-appointment-id="${id}"]`);
  await same.click();
  await expect(panel).toContainText(t.status.confirmed);
  watcher.assertClean();
});

/** The header (DESIGN §B): previous / next, «Bugun», the date jump and the specialist filter. */
test("the board header pages the days, jumps to a date and filters by specialist", async ({
  page,
}) => {
  const watcher = watchPage(page);
  await page.goto(`/admin/appointments?date=${DESIGN_DAY}`);
  await expect(heading(page)).toHaveText(t.title);
  const toolbar = page.getByRole("group", { name: t.header.toolbar });

  await toolbar.getByRole("link", { name: t.header.next.day }).click();
  await expect(page).toHaveURL(new RegExp(`date=${NEXT_DAY}`));
  await toolbar.getByRole("link", { name: t.header.prev.day }).click();
  await expect(page).toHaveURL(new RegExp(`date=${DESIGN_DAY}`));

  const jump = addDays(DESIGN_DAY, 2);
  await fillDate(toolbar, t.header.jumpTo, jump);
  await expect(page).toHaveURL(new RegExp(`date=${jump}`));
  await expect(page.getByRole("region", { name: t.day.label })).toBeVisible();

  // «Bugun» returns to the bare board, where it explains why it has nothing to do.
  await toolbar.getByRole("link", { name: t.header.today, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/appointments$/);
  await expectDisabledReason(
    toolbar.getByRole("button", { name: t.header.today, exact: true }),
    t.header.showsToday,
  );

  // The specialist filter narrows the columns to one specialist and keeps it in the URL.
  const filter = selectTrigger(toolbar, t.header.specialist);
  await filter.click();
  const options = page.getByRole("listbox").getByRole("option");
  await expect(options.first()).toBeVisible();
  test.skip((await options.count()) < 2, "the seed has no bookable specialist");
  await options.nth(1).click();
  await expect(page).toHaveURL(/specialist=/);
  await expect(page.getByRole("region", { name: t.day.label }).locator("ol")).toHaveCount(1);
  watcher.assertClean();
});

/** The week board: seven day columns linking to the day, visits selectable into the panel. */
test("the week view shows seven days and opens a day from its header", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto(`/admin/appointments?date=${DESIGN_DAY}`);
  await expect(heading(page)).toHaveText(t.title);
  await page.getByRole("radio", { name: t.header.views.week }).check();
  await expect(page).toHaveURL(/view=week/);

  const week = page.getByRole("region", { name: t.week.label });
  await expect(week).toBeVisible();
  const dayLinks = week.getByRole("link", { name: /kun jadvalini ochish$/ });
  await expect(dayLinks).toHaveCount(7);

  const visits = week.locator("button[data-appointment-id]");
  if ((await visits.count()) > 0) {
    await visits.first().click();
    await expect(visits.first()).toHaveAttribute("aria-pressed", "true");
    await expect(panelOf(page).getByRole("link").first()).toBeVisible();
  }

  const second = await dayLinks.nth(1).getAttribute("href");
  await dayLinks.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`${second?.split("?")[1] ?? "date="}$`));
  await expect(page).not.toHaveURL(/view=/);
  await expect(page.getByRole("region", { name: t.day.label })).toBeVisible();
  watcher.assertClean();
});

/** The month board: a six-week page of day links with spoken counts, today marked. */
test("the month view lists the six-week page and links each cell to its day", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto(`/admin/appointments?view=month&date=${DESIGN_DAY}`);
  await expect(heading(page)).toHaveText(t.title);
  const month = page.getByRole("region", { name: t.month.label });
  await expect(month).toBeVisible();
  await expect(month.locator("a[data-date]")).toHaveCount(42);
  await expect(page.getByRole("radio", { name: t.header.views.month })).toBeChecked();

  const cell = month.locator(`a[data-date="${DESIGN_DAY}"]`);
  await expect(cell).toHaveAttribute("aria-label", /\S/);
  await cell.click();
  await expect(page).toHaveURL(new RegExp(`date=${DESIGN_DAY}`));
  await expect(page.getByRole("region", { name: t.day.label })).toBeVisible();

  await page.goto(`/admin/appointments?view=month&date=${DESIGN_DAY}`);
  await page
    .getByRole("group", { name: t.header.toolbar })
    .getByRole("link", { name: t.header.next.month })
    .click();
  await expect(page).toHaveURL(new RegExp(`view=month&date=${addMonths(DESIGN_DAY, 1)}`));
  watcher.assertClean();
});
