import { expect, test, type Page } from "@playwright/test";

import { toast, watchPage } from "./helpers";
import { fillDateTime, selectOption, selectTrigger } from "./ui";

/**
 * «Kuchga kirish sanasi» of a new cashback version (/admin/cashback, contract §2.7): «Darhol»
 * (the API's "now": in force as it is saved), the next month starts, or «Boshqa sana va vaqt…»
 * with the date-and-time picker (a past moment is refused before the round trip). Each test saves
 * a new version, so they run against a seeded database (api mode) or the demo.
 */

const START = "Kuchga kirish sanasi";
const NOW = "Darhol — saqlangan zahoti";
const CUSTOM = "Boshqa sana va vaqt…";
const PICKER = "Sana va vaqt (Toshkent)";

async function openEditor(page: Page) {
  await page.goto("/admin/cashback");
  await expect(page.getByRole("heading", { name: "Cashback sozlamalari" })).toBeVisible();
}

const note = (page: Page) => page.locator("[data-start-note]");

async function saveConfirmed(page: Page, confirmText?: string) {
  await page.getByRole("button", { name: "Yangi versiyani saqlash" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "Yangi cashback versiyasini saqlaysizmi?",
  });
  if (confirmText) await expect(confirm).toContainText(confirmText);
  await confirm.getByRole("button", { name: "Saqlash" }).click();
  const saved = toast(page, /Siyosat v\d+ saqlandi/);
  await expect(saved).toBeVisible();
  return { saved, version: Number((await saved.textContent())?.match(/v(\d+)/)?.[1]) };
}

test("the start menu offers «Darhol», the month starts and a custom moment", async ({ page }) => {
  await openEditor(page);
  // The default (the next month's start) is spelled out under the menu.
  await expect(note(page)).toContainText("Yangi qoidalar");
  await selectTrigger(page, START).click();
  const options = page.getByRole("listbox").getByRole("option");
  await expect(options).toHaveCount(5);
  await expect(options.first()).toContainText(NOW);
  await expect(options.last()).toContainText(CUSTOM);
  await page.keyboard.press("Escape");
});

test("«Darhol» puts the new version in force as it is saved", async ({ page }) => {
  const watch = watchPage(page);
  await openEditor(page);
  await selectOption(page, START, NOW);
  await expect(selectTrigger(page, START)).toContainText(NOW);
  await expect(note(page)).toHaveText(
    "Yangi qoidalar saqlangan zahoti yangi xaridlarga qo‘llanadi.",
  );
  const { saved, version } = await saveConfirmed(
    page,
    "Saqlangan zahoti bu stavkalar yangi xaridlarga qo‘llanadi.",
  );
  await expect(saved).toContainText("Yangi xaridlarga darhol qo‘llanadi");
  // The new version is the active one at once, nothing is scheduled; also after a reload.
  await expect(page.getByText(/rejalashtirilgan/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(new RegExp(`Faol siyosat: v${version} ·`))).toBeVisible();
  await expect(page.getByText(/rejalashtirilgan/)).toHaveCount(0);
  watch.assertClean();
});

test("a custom moment: a past one is refused, a future one is scheduled", async ({ page }) => {
  await openEditor(page);
  await selectOption(page, START, CUSTOM);
  const picker = page.getByRole("textbox", { name: PICKER });
  await expect(picker).toBeVisible();

  // Nothing picked yet: the save says what is missing and focuses the picker.
  await page.getByRole("button", { name: "Yangi versiyani saqlash" }).click();
  await expect(toast(page, "Saqlanmadi")).toContainText("Kelajakdagi vaqtni tanlang.");
  await expect(picker).toBeFocused();

  // A past moment is refused before the round trip.
  await fillDateTime(page, PICKER, "2020-01-01T10:00");
  await expect(page.locator("[data-effective-start]").getByRole("alert")).toBeVisible();

  // A moment next year at 10:30 is scheduled.
  const year = new Date().getFullYear() + 1;
  await fillDateTime(page, PICKER, `${year}-03-15T10:30`);
  await expect(note(page)).toContainText(String(year));
  await expect(note(page)).toContainText("10:30");
  const { version } = await saveConfirmed(page);
  await page.reload();
  await expect(page.getByText(new RegExp(`v${version} rejalashtirilgan`)).first()).toBeVisible();
});
