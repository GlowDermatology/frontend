import { expect, test } from "@playwright/test";

import { axe, ready, signIn } from "./helpers";

/**
 * The signed-in phone customer of `customer.setup.ts`: booking and its
 * cancellation, the self-refreshing QR, «Faol seanslar» across two
 * browsers, and axe with no horizontal overflow on the private pages.
 */

test("book an appointment, then cancel it from «Qabullarim»", async ({ page }) => {
  await page.goto("/qabulga-yozilish");
  await ready(page);
  await page.getByRole("region", { name: "Mutaxassis" }).getByRole("button").first().click();
  await page.getByRole("region", { name: "Xizmat" }).getByRole("button").first().click();

  // The first day (within two weeks) that has a free time.
  const days = page.getByRole("radiogroup", { name: "Sanani tanlang" }).getByRole("radio");
  const slots = page.getByRole("radiogroup", { name: /bo‘sh vaqtlar/ }).getByRole("radio");
  let found = false;
  for (let index = 0; index < 14 && !found; index += 1) {
    await days.nth(index).click();
    await expect(page.getByText("Bo‘sh vaqtlar yuklanmoqda…")).toBeHidden({ timeout: 15_000 });
    found = (await slots.count()) > 0;
  }
  expect(found, "a free time within two weeks").toBe(true);
  await slots.first().click();
  await page.getByLabel("Izoh (ixtiyoriy)").fill("E2E: birinchi qabul");
  await page.getByRole("button", { name: "Yozilish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Siz qabulga yozildingiz" })).toBeVisible();

  await page.getByRole("link", { name: "Qabullarim" }).first().click();
  await expect(page).toHaveURL(/\/qabullarim$/);
  const cancel = page.getByRole("button", { name: "Bekor qilish" }).first();
  await expect(cancel).toBeVisible();
  const before = await page.getByRole("button", { name: "Bekor qilish" }).count();
  await cancel.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ha, bekor qilish" }).click();
  await expect(page.getByRole("button", { name: "Bekor qilish" })).toHaveCount(before - 1);
});

test("the in-store QR is drawn and counts down to its refresh", async ({ page }) => {
  await page.goto("/qr-kod");
  await expect(page.getByRole("img", { name: "Shaxsiy QR kod" })).toBeVisible();
  const countdown = page.getByText(/soniyadan so‘ng yangilanadi/);
  await expect(countdown).toBeVisible();
  const first = await countdown.textContent();
  await page.waitForTimeout(2_200);
  expect(await countdown.textContent()).not.toBe(first);
  const before = await page.locator("svg[aria-label='Shaxsiy QR kod'] path").getAttribute("d");
  await page.getByRole("button", { name: "Yangilash" }).click();
  await expect
    .poll(async () => page.locator("svg[aria-label='Shaxsiy QR kod'] path").getAttribute("d"))
    .not.toBe(before);
});

test("«Faol seanslar»: the other browser is signed out", async ({ page, browser, baseURL }) => {
  // The phone of this customer, read from the account page.
  await page.goto("/hisob");
  const phoneText = await page
    .getByText(/^\+998 \d{2} \d{3} \d{2} \d{2}$/)
    .first()
    .textContent();
  const phone = (phoneText ?? "").replace(/\D/g, "").slice(3);

  const other = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const second = await other.newPage();
  await signIn(second, phone);

  await page.goto("/faol-seanslar");
  await ready(page);
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader", { name: "Qurilma" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Joylashuv" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Yaratilgan" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Yangilangan" })).toBeVisible();
  await expect(table.getByText("Joriy")).toHaveCount(1);
  expect(await table.getByRole("row").count()).toBeGreaterThanOrEqual(3);

  // Row menu ⋯ «Chiqish» on the other browser's row.
  const otherRow = table
    .getByRole("row")
    .filter({ hasNot: page.getByText("Joriy") })
    .last();
  await otherRow.getByRole("button", { name: /amallar/ }).click();
  await page.getByRole("menuitem", { name: "Chiqish" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ha, chiqish" }).click();
  await expect(page.getByText("Seans yakunlandi")).toBeVisible();

  // The revoked browser's next private page sends it to sign in.
  await second.goto("/hisob");
  await second.waitForURL(/\/kirish/, { timeout: 20_000 });
  await other.close();

  // Stacked cards below md.
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole("table")).toBeHidden();
  await expect(page.getByRole("listitem").getByText("Joriy")).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`private pages: axe and no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/savat",
      "/buyurtmalar",
      "/cashback",
      "/qr-kod",
      "/qabulga-yozilish",
      "/qabullarim",
      "/xabarlar",
      "/hisob",
      "/faol-seanslar",
      "/ru/account",
      "/en/sessions",
    ]) {
      await page.goto(path);
      await ready(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${path} overflows at ${width}px`).toBe(false);
      expect(await axe(page), `${path} at ${width}px`).toEqual([]);
    }
  });
}

test("sign-in page: axe at 390 and 1440 px", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/kirish",
      "/kirish?mode=signup",
      "/ru/sign-in",
      "/en/sign-in?mode=reset",
    ]) {
      await page.goto(path);
      await ready(page);
      expect(await axe(page), `${path} at ${width}px`).toEqual([]);
    }
  }
  await context.close();
});
