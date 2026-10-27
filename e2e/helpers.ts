import { expect, type Page } from "@playwright/test";

import { adminCredentials, BASE_URL } from "./env";

/** Signs in through the login form and waits until the admin shell is shown. */
export async function signIn(page: Page, password = adminCredentials().password): Promise<void> {
  const { email } = adminCredentials();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/admin\/login/);
}

/**
 * Collects uncaught page errors and 5xx responses of the app's own origin
 * while a test runs; `assertClean()` fails the test if any occurred.
 */
export function watchPage(page: Page): { assertClean: () => void } {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  const origin = new URL(BASE_URL).origin;
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 500 && url.origin === origin) {
      problems.push(`${response.status()} ${url.pathname}`);
    }
  });
  return { assertClean: () => expect(problems).toEqual([]) };
}

/** The visible page heading (hidden Activity routes keep stale headings in the DOM). */
export function heading(page: Page) {
  return page.locator("h1:visible").first();
}

/**
 * Orders of the seed's design screens (dashboard, list, №10248 detail, the
 * BTS failure of №10250): the mutating specs leave them alone so the design
 * numbers survive a run.
 */
export const DESIGN_ORDER_IDS: ReadonlySet<number> = new Set([10248, 10249, 10250, 10251, 10252]);

/** Text of the toast region (role="status"), for asserting a toast by its title. */
export function toast(page: Page, title: string | RegExp) {
  return page.getByRole("status").filter({ hasText: title });
}

/**
 * Ids of the orders a list URL shows on its first page, newest first,
 * without the design orders; `hasText` keeps the rows that contain it (e.g.
 * the provider "Payme"). An empty list answers `[]`.
 */
export async function listedOrderIds(
  page: Page,
  href: string,
  hasText?: string | RegExp,
): Promise<number[]> {
  await page.goto(href);
  await expect(heading(page)).toHaveText("Buyurtmalar");
  const rows = page.locator("table tbody tr");
  await expect(rows.first().or(page.getByText("Buyurtma topilmadi"))).toBeVisible();
  const matching = hasText === undefined ? rows : rows.filter({ hasText });
  const ids: number[] = [];
  for (const text of await matching.locator("td:first-child").allInnerTexts()) {
    const id = Number(text.trim());
    if (Number.isInteger(id) && !DESIGN_ORDER_IDS.has(id)) ids.push(id);
  }
  return ids;
}

/**
 * Cancels the order through its detail screen with `reason` (the dialog's
 * own key, as an admin would) and waits until the screen shows it cancelled.
 */
export async function cancelOrderThroughUi(page: Page, id: number, reason: string): Promise<void> {
  await page.goto(`/admin/orders/${id}`);
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
  await page.getByRole("button", { name: "Bekor qilish" }).click();
  const dialog = page.getByRole("alertdialog", { name: `Buyurtma №${id} ni bekor qilasizmi?` });
  await dialog.getByLabel("Sabab (majburiy)").fill(reason);
  await dialog.getByRole("button", { name: "Buyurtmani bekor qilish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Buyurtma bekor qilindi")).toBeVisible();
}
