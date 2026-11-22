import { createHmac } from "node:crypto";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { BACKEND_DIR, deleteStaffAccounts, ensureStaffAccount } from "./backend-shell";
import { heading, signIn, toast, watchPage } from "./helpers";
import { expectDisabledReason } from "./ui";

/**
 * The admin panel MFA of DESIGN §E, each person in a second, signed-out browser context (the
 * suite's default context is the seeded manager):
 *
 * - Settings → «Ikki bosqichli himoya»: the password again (a wrong one is refused on its field),
 *   the QR code and the manual key, a wrong code refused on its field, the right one (TOTP
 *   computed here from the manual key), ten recovery codes that cannot be dismissed before
 *   «Kodlarni xavfsiz joyga saqladim»;
 * - the sign-in's second step: a wrong code keeps the step, a recovery code opens the panel (one
 *   code fewer), a TOTP code in the next 30-second window opens it too (the backend refuses a
 *   replayed code), «Kirish sahifasiga qaytish» drops the step;
 * - turning it off with the password and a recovery code;
 * - a manager's «MFA ni o‘chirish» on the staff page (optional reason, toast, badge gone).
 *
 * Accounts are prepared and removed through the backend shell (`E2E_BACKEND_DIR`).
 */

const EMAIL_PREFIX = "e2e-mfa-";
const PASSWORD = "Mfa-Sinov-Parol-2026";

test.afterEach(() => {
  if (BACKEND_DIR) deleteStaffAccounts(EMAIL_PREFIX);
});

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) of a base32 secret, as the authenticator app shows it. */
function totp(base32: string, atMs = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32.replace(/[\s=]/g, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

/** Waits for the next 30-second window (the backend refuses a code of a used window). */
async function nextWindow(page: Page): Promise<void> {
  const left = 30_000 - (Date.now() % 30_000);
  await page.waitForTimeout(left + 1_000);
}

async function signedOutPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

const mfaCard = (page: Page) => page.locator("[data-mfa-card]");

/** Turns the MFA on from Settings; returns the manual key and the recovery codes. */
async function enableMfa(page: Page): Promise<{ key: string; codes: string[] }> {
  await page.goto("/admin/settings");
  const card = mfaCard(page);
  await expect(card.getByText("O‘chirilgan")).toBeVisible();
  await card.getByRole("button", { name: "Yoqish" }).click();
  const dialog = page.getByRole("dialog", { name: "Ikki bosqichli himoyani yoqish" });

  await dialog.getByLabel("Joriy parol").fill("noto-gri-parol-1");
  await dialog.getByRole("button", { name: "Davom etish" }).click();
  await expect(dialog.getByLabel("Joriy parol")).toHaveAttribute("aria-invalid", "true");
  await dialog.getByLabel("Joriy parol").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Davom etish" }).click();

  await expect(
    dialog.getByRole("img", { name: "Autentifikator ilovasi uchun QR kod" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /Skanerlab bo‘lmayaptimi/ }).click();
  const key = (await dialog.locator("[data-manual-key]").innerText()).trim();
  expect(key).toMatch(/^[A-Z2-7 ]{16,}$/);

  const code = dialog.getByLabel("Ilovadagi 6 xonali kod");
  await code.fill(totp(key) === "000000" ? "111111" : "000000");
  await dialog.getByRole("button", { name: "Tasdiqlash va yoqish" }).click();
  await expect(code).toHaveAttribute("aria-invalid", "true");
  await code.fill(totp(key));
  await dialog.getByRole("button", { name: "Tasdiqlash va yoqish" }).click();

  const codesDialog = page.getByRole("dialog", { name: "Zaxira kodlarni saqlang" });
  const items = codesDialog.locator("[data-recovery-codes] code");
  await expect(items).toHaveCount(10);
  const codes = (await items.allInnerTexts()).map((text) => text.trim());
  expect(codes.every((value) => /^[a-z0-9]{5}-[a-z0-9]{5}$/.test(value))).toBe(true);

  // Shown once: neither «Tayyor» nor Escape closes it before the codes are confirmed as saved.
  const done = codesDialog.getByRole("button", { name: "Tayyor" });
  await expectDisabledReason(done, "Avval kodlarni saqlaganingizni belgilang.");
  await page.keyboard.press("Escape");
  await expect(codesDialog).toBeVisible();
  const savedSwitch = codesDialog.getByRole("switch", { name: "Kodlarni xavfsiz joyga saqladim" });
  await savedSwitch.click();
  await expect(savedSwitch).toBeChecked();
  await done.click();
  await expect(codesDialog).toBeHidden();
  await expect(card.getByText("Yoqilgan")).toBeVisible();
  await expect(card.getByText("Zaxira kodlar: 10 ta qoldi")).toBeVisible();
  return { key, codes };
}

/** The password step of a sign-in that then asks for the code. */
async function passwordStep(page: Page, email: string): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await expect(heading(page)).toHaveText("Ikki bosqichli tasdiqlash");
}

test("a staff member turns on MFA, signs in with a recovery code and a TOTP code, then turns it off", async ({
  browser,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the account could not be prepared");
  test.setTimeout(180_000);
  const email = `${EMAIL_PREFIX}${Date.now()}@glowderma.uz`;
  ensureStaffAccount(email, PASSWORD);

  const first = await signedOutPage(browser);
  const watcher = watchPage(first);
  await signIn(first, PASSWORD, email);
  const { key, codes } = await enableMfa(first);
  watcher.assertClean();

  // The second step: the challenge stays out of the address bar; a wrong code keeps the step.
  const second = await signedOutPage(browser);
  await passwordStep(second, email);
  expect(second.url()).not.toContain("challenge");
  const codeField = second.getByLabel("Tasdiqlash kodi");
  await codeField.fill(totp(key) === "123456" ? "654321" : "123456");
  await expect(codeField).toHaveAttribute("aria-invalid", "true");
  await second.getByRole("button", { name: "Zaxira kod bilan kirish" }).click();
  await second.getByLabel("Zaxira kod").fill(codes[0]!.toUpperCase());
  await second.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(second).toHaveURL(/\/admin$/);
  await second.goto("/admin/settings");
  await expect(mfaCard(second).getByText("Zaxira kodlar: 9 ta qoldi")).toBeVisible();

  // «Kirish sahifasiga qaytish» drops the step; a fresh one then takes a code of a new window.
  const third = await signedOutPage(browser);
  await passwordStep(third, email);
  await third.getByRole("button", { name: "Kirish sahifasiga qaytish" }).click();
  await expect(third).toHaveURL(/\/admin\/login/);
  await third.goto("/admin/mfa");
  await expect(third).toHaveURL(/\/admin\/login/);
  await passwordStep(third, email);
  await nextWindow(third);
  // Six digits submit by themselves.
  await third.getByLabel("Tasdiqlash kodi").fill(totp(key));
  await expect(third).toHaveURL(/\/admin$/);

  // Turning it off: the password and an unused recovery code.
  await third.goto("/admin/settings");
  await mfaCard(third).getByRole("button", { name: "O‘chirish" }).click();
  const off = third.getByRole("dialog", { name: "Ikki bosqichli himoyani o‘chirasizmi?" });
  await off.getByLabel("Joriy parol").fill(PASSWORD);
  await off.getByLabel("Ilovadagi kod yoki zaxira kod").fill(codes[1]!);
  await off.getByRole("button", { name: "O‘chirish" }).click();
  await expect(off).toBeHidden();
  await expect(mfaCard(third).getByText("O‘chirilgan")).toBeVisible();

  // The next sign-in asks for the password only.
  const fourth = await signedOutPage(browser);
  await signIn(fourth, PASSWORD, email);
  await expect(fourth).not.toHaveURL(/\/admin\/mfa/);
});

test("a manager turns off another member's MFA from the staff page", async ({ browser, page }) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the account could not be prepared");
  test.setTimeout(120_000);
  const email = `${EMAIL_PREFIX}reset-${Date.now()}@glowderma.uz`;
  ensureStaffAccount(email, PASSWORD);
  const member = await signedOutPage(browser);
  await signIn(member, PASSWORD, email);
  await enableMfa(member);

  await page.goto(`/admin/staff?q=${encodeURIComponent(email)}`);
  const row = page.locator("[data-staff-row]").filter({ hasText: email });
  await expect(row.getByText("MFA yoqilgan")).toBeVisible();
  await row.getByRole("button", { name: /— amallar$/ }).click();
  await page.getByRole("menuitem", { name: "MFA ni o‘chirish" }).click();
  const confirm = page.getByRole("alertdialog", { name: "MFA ni o‘chirasizmi?" });
  await confirm.getByLabel("Sabab (ixtiyoriy)").fill("e2e: telefon yo‘qolgan");
  await confirm.getByRole("button", { name: "MFA ni o‘chirish" }).click();
  await expect(confirm).toBeHidden();
  await expect(toast(page, "MFA o‘chirildi")).toBeVisible();
  await expect(row.getByText("MFA yoqilgan")).toHaveCount(0);

  // The member's sessions ended; the next sign-in asks for the password only.
  const again = await signedOutPage(browser);
  await signIn(again, PASSWORD, email);
  await expect(again).not.toHaveURL(/\/admin\/mfa/);
});
