import { expect, test } from "@playwright/test";

import { BACKEND_DIR, restoreLegalTexts, snapshotLegalTexts } from "./backend-shell";
import { API_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";

/**
 * Settings: contacts and legal texts (gaps X-SET-CONTACTS, X-SET-LEGAL,
 * contract §2.11). Publishing a version asks every customer to accept the
 * terms again, so the spec snapshots the legal texts and the published
 * version through the backend shell first and puts them back afterwards
 * (skipped without E2E_BACKEND_DIR).
 */

let snapshot: string | null = null;

test.beforeAll(() => {
  if (BACKEND_DIR) snapshot = snapshotLegalTexts();
});

test.afterAll(() => {
  if (snapshot) restoreLegalTexts(snapshot);
});

test.describe.configure({ mode: "serial" });

test("an edited terms draft is saved, guarded, then published as a new version", async ({
  page,
}) => {
  test.skip(
    !BACKEND_DIR,
    "E2E_BACKEND_DIR is not set: the published version could not be restored",
  );
  const watcher = watchPage(page);
  await page.goto("/admin/settings");
  await expect(heading(page)).toHaveText("Sozlamalar");
  const card = page.getByRole("region", { name: "Huquqiy matnlar" });
  const before = (await card.getByTestId("terms-version").innerText()).trim();

  await card.getByRole("tab", { name: /Русский/ }).click();
  const text = card.getByLabel("Foydalanish shartlari (ru)");
  await page.waitForLoadState("networkidle");
  await text.fill(`${await text.inputValue()}\n\nE2E: ${Date.now()}`);
  await expect(card.getByRole("button", { name: "Saqlash" })).toBeEnabled();
  // Unsaved edits: an in-app link asks first.
  await page
    .getByRole("navigation", { name: "Admin bo‘limlari" })
    .first()
    .getByRole("link", { name: "Mijozlar" })
    .click();
  const guard = page.getByRole("alertdialog", { name: "O‘zgarishlar saqlanmagan" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Tahrirlashda qolish" }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  // Publishing waits for the save.
  await expect(card.getByRole("button", { name: "E’lon qilish" })).toBeDisabled();
  await card.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Matnlar saqlandi")).toBeVisible();
  await expect(card.getByText("E’lon qilinmagan o‘zgarishlar bor")).toBeVisible();

  await card.getByRole("button", { name: "E’lon qilish" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "Shartlarning yangi versiyasini e’lon qilasizmi?",
  });
  await expect(confirm).toContainText(
    "Barcha mijozlardan shartlarni qayta qabul qilish so‘raladi.",
  );
  await confirm.getByRole("button", { name: "E’lon qilish" }).click();
  await expect(confirm).toBeHidden();
  await expect(toast(page, /^Shartlar e’lon qilindi: \d{8}-\d+/)).toBeVisible();
  await expect(card.getByText("E’lon qilinmagan o‘zgarishlar bor")).toBeHidden();
  const after = (await card.getByTestId("terms-version").innerText()).trim();
  expect(after).not.toBe(before);
  const version = /Joriy versiya: (\d{8}-\d+)/.exec(after)?.[1];
  expect(version).toBeTruthy();

  if (API_URL) {
    // The customer API serves the new version at once.
    const response = await page.request.get(`${API_URL}/api/v1/settings/public/`);
    expect(response.ok()).toBe(true);
    expect((await response.json()).terms_version).toBe(version);
  }
  watcher.assertClean();
});

test("publishing without the Uzbek terms is refused with the server's message", async ({
  page,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the drafts could not be restored");
  await page.goto("/admin/settings");
  const card = page.getByRole("region", { name: "Huquqiy matnlar" });
  const uz = card.getByLabel("Foydalanish shartlari (uz)");
  const save = card.getByRole("button", { name: "Saqlash" });
  // Typed after hydration: the save button turns on with the edit.
  await expect(save).toBeDisabled();
  // A controlled textarea typed into before hydration loses the edit.
  await page.waitForLoadState("networkidle");
  await uz.fill("   ");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(toast(page, "Matnlar saqlandi")).toBeVisible();
  // A text with no visible character is stored empty.
  await expect(uz).toHaveValue("");
  await card.getByRole("button", { name: "E’lon qilish" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "Shartlarning yangi versiyasini e’lon qilasizmi?",
  });
  await confirm.getByRole("button", { name: "E’lon qilish" }).click();
  await expect(confirm.getByRole("alert")).toHaveText(
    "Foydalanish shartlari va maxfiylik siyosatining o‘zbekcha matnini kiriting, so‘ng e’lon qiling.",
  );
  await confirm.getByRole("button", { name: "Bekor qilish" }).click();
});

test("a contact link outside Telegram is refused on its field", async ({ page }) => {
  await page.goto("/admin/settings");
  await page.waitForLoadState("networkidle");
  const card = page.getByRole("region", { name: "Aloqa ma’lumotlari" });
  await card.getByLabel("Telegram").fill("https://example.uz/glowderma");
  await card.getByRole("button", { name: "Saqlash" }).click();
  await expect(
    card.getByText("Telegram havolasi https://t.me/… ko‘rinishida bo‘lsin."),
  ).toBeVisible();
  await expect(card.getByLabel("Telegram")).toBeFocused();
});
