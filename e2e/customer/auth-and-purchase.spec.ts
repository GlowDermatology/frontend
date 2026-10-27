import { expect, test } from "@playwright/test";

import { addFirstProduct, PASSWORD, randomEmail, randomPhone, ready, signUp } from "./helpers";

/**
 * Hybrid identity end to end (backend B-W1 + B-W2): an e-mail sign-up has no
 * phone, so checkout asks for one (the phone gate, with the password as the
 * re-authentication), then pays in the local sandbox and shows the order's
 * timeline. Starts from an empty browser.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("e-mail sign-up → cart → checkout → phone gate → sandbox payment → order timeline", async ({
  page,
}) => {
  const email = randomEmail();
  await signUp(page, email, "Email Mijoz");

  // The header knows the customer: the account menu and no "Kirish".
  await ready(page);
  await expect(page.getByRole("button", { name: "Hisob menyusi" })).toBeVisible();

  const product = await addFirstProduct(page);
  await expect(page.getByRole("link", { name: /Savat, \d+ ta mahsulot/ })).toBeVisible();

  await page.goto("/savat");
  await expect(page.getByRole("heading", { level: 1, name: "Savat" })).toBeVisible();
  await expect(page.getByText(product).first()).toBeVisible();
  await page.getByRole("link", { name: "Rasmiylashtirish" }).click();
  await expect(page).toHaveURL(/\/rasmiylashtirish$/);
  await ready(page);
  await expect(page.getByText(/Jami/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Buyurtma berish va to‘lash" })).toBeEnabled();
  await page.getByRole("button", { name: "Buyurtma berish va to‘lash" }).click();

  // 409 phone_required → the gate.
  const gate = page.getByRole("dialog", { name: "Telefon raqamingizni tasdiqlang" });
  await expect(gate).toBeVisible();
  await gate.getByLabel("Telefon raqami").fill(randomPhone());
  await gate.getByRole("button", { name: "Kod yuborish" }).click();
  await gate.getByLabel("Tasdiqlash kodi").fill("123456");
  await gate.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  // An account with a password re-authenticates (B-W2 fix pass).
  const password = gate.getByLabel("Joriy parol");
  const asked = await Promise.race([
    password.waitFor({ state: "visible", timeout: 10_000 }).then(() => true),
    page.waitForURL(/sandbox=1/, { timeout: 10_000 }).then(() => false),
  ]).catch(() => false);
  if (asked) {
    await password.fill(PASSWORD);
    await gate.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  }

  // The order is placed and the sandbox stands in for Click/Payme.
  await page.waitForURL(/\/buyurtmalar\/\d+\?sandbox=1$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "To‘lovni tasdiqlash" }).click();
  await page.waitForURL(/\?paid=1$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Rahmat! To‘lov qabul qilindi" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "Tarix" })).toBeVisible();
  await expect(page.getByText("To‘lov qabul qilindi").first()).toBeVisible();
  await expect(page.getByText("Buyurtma berildi").first()).toBeVisible();

  // The orders list has it; the account shows the attached phone.
  await page.goto("/buyurtmalar");
  await expect(page.getByRole("link", { name: /Buyurtma №\d+/ }).first()).toBeVisible();
  await page.goto("/hisob");
  await expect(page.getByText(/\+998 90 \d{3} \d{2} \d{2}/).first()).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
});

test("phone sign-up, sign out from the header, sign in again on the known browser", async ({
  page,
}) => {
  const phone = randomPhone();
  await signUp(page, phone);
  await ready(page);
  await page.getByRole("button", { name: "Hisob menyusi" }).click();
  await page.getByRole("menuitem", { name: "Chiqish" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await ready(page);
  await expect(page.getByRole("link", { name: "Kirish" })).toBeVisible();

  // The device key survives sign-out: no new-device code this time.
  await page.goto("/kirish?next=%2Fcashback");
  await ready(page);
  await page.getByLabel("Telefon raqami yoki email").fill(phone);
  await page.getByLabel("Parol", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await page.waitForURL(/\/cashback$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Cashback" })).toBeVisible();
});

test("a private page sends a visitor to sign in and back", async ({ page }) => {
  await page.goto("/buyurtmalar");
  await page.waitForURL(/\/kirish\?next=%2Fbuyurtmalar/);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  const email = randomEmail();
  await page.getByRole("tab", { name: "Hisob yaratish" }).click();
  await page.getByLabel("Telefon raqami yoki email").fill(email);
  await page.getByRole("button", { name: "Davom etish" }).click();
  await page.getByLabel("Tasdiqlash kodi").fill("123456");
  await page.getByRole("button", { name: "Tasdiqlash" }).click();
  await page.getByLabel("Ismingiz").fill("Qaytish Mijoz");
  await page.getByLabel("Parol", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hisobni yaratish" }).click();
  await page.waitForURL(/\/buyurtmalar$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Buyurtmalar" })).toBeVisible();
});
