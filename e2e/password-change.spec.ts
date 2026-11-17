import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  BACKEND_DIR,
  deleteStaffAccounts,
  ensureMustChangeStaffAccount,
  issueStaffPasswordToken,
  staffMustChangePassword,
} from "./backend-shell";
import { heading, signIn, watchPage } from "./helpers";

/**
 * The staff own-password flows of DESIGN §E, each in a second, signed-out browser context (the
 * suite's default context is the seeded manager):
 *
 * - forced change: an account a manager handed a temporary password to
 *   (`must_change_password`) signs in, is held at `/admin/change-password` whatever panel page
 *   it opens, sets its own password and continues where it was going;
 * - e-mailed link: `/admin/set-password?token=…` moves the token out of the address bar, checks
 *   it server-side, sets the password twice-typed, lands on the sign-in page with the localized
 *   notice, and the link then no longer works.
 *
 * Accounts are prepared and removed through the backend shell (`E2E_BACKEND_DIR`).
 */

const EMAIL_PREFIX = "e2e-majburiy-";
const NEW_PASSWORD = "Yangi-Parol-2026!";

test.afterEach(() => {
  if (BACKEND_DIR) deleteStaffAccounts(EMAIL_PREFIX);
});

async function signedOutPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

test("an account with a temporary password must set its own before using the panel", async ({
  browser,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the account could not be prepared");
  const email = `${EMAIL_PREFIX}${Date.now()}@glowderma.uz`;
  const temporary = "Vaqtinchalik-2026";
  ensureMustChangeStaffAccount(email, temporary);

  const page = await signedOutPage(browser);
  const watcher = watchPage(page);
  await signIn(page, temporary, email);

  // Every panel page leads to the forced change, keeping where the person was going.
  await expect(page).toHaveURL(/\/admin\/change-password\?next=/);
  await expect(heading(page)).toHaveText("Parolingizni yangilang");
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/change-password\?next=%2Fadmin%2Forders/);

  // The form reveals its own errors before anything is sent.
  await page.getByRole("button", { name: "Saqlash va davom etish" }).click();
  await expect(page.getByLabel("Joriy (vaqtinchalik) parol")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await page.getByLabel("Joriy (vaqtinchalik) parol").fill(temporary);
  await page.getByLabel("Yangi parol", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Yangi parolni takrorlang").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Saqlash va davom etish" }).click();

  await expect(page).toHaveURL(/\/admin\/orders/);
  await expect(heading(page)).toHaveText("Buyurtmalar");
  expect(staffMustChangePassword(email)).toBe(false);

  // Nothing pending any more: the page sends the account straight on.
  await page.goto("/admin/change-password?next=%2Fadmin");
  await expect(page).not.toHaveURL(/change-password/);
  watcher.assertClean();
  await page.context().close();
});

test("an e-mailed link sets the password once and leads to the sign-in page", async ({
  browser,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: no link could be issued");
  const email = `${EMAIL_PREFIX}link-${Date.now()}@glowderma.uz`;
  ensureMustChangeStaffAccount(email, "Eski-Parol-2026");
  const token = issueStaffPasswordToken(email, "invite");

  const page = await signedOutPage(browser);
  const watcher = watchPage(page);
  const landed = await page.goto(`/admin/set-password?token=${token}`);
  // The token left the address bar (and the history), the page refers nowhere.
  await expect(page).toHaveURL(/\/admin\/set-password$/);
  expect(landed?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(heading(page)).toHaveText(/^Xush kelibsiz/);
  // Whose account it is, masked.
  await expect(page.getByText(/^e\*+@glowderma\.uz$/)).toBeVisible();

  await page.getByLabel("Yangi parol", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Yangi parolni takrorlang").fill(`${NEW_PASSWORD}x`);
  await page.getByRole("button", { name: "Parolni o‘rnatish" }).click();
  await expect(page.getByLabel("Yangi parolni takrorlang")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Yangi parolni takrorlang").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Parolni o‘rnatish" }).click();

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByText("Parol o‘rnatildi. Endi email va yangi parol bilan kiring."),
  ).toBeVisible();
  expect(staffMustChangePassword(email)).toBe(false);

  // Single use: the same link now explains itself instead of showing the form.
  await page.goto(`/admin/set-password?token=${token}`);
  await expect(heading(page)).toHaveText("Havola yaroqsiz");
  await expect(page.getByRole("button", { name: "Parolni o‘rnatish" })).toHaveCount(0);

  // The new password signs in straight to the panel.
  await signIn(page, NEW_PASSWORD, email);
  await expect(page).not.toHaveURL(/change-password/);
  watcher.assertClean();
  await page.context().close();
});
