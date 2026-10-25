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
