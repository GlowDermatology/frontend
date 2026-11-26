import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

import { saveAnyway } from "./catalog-helpers";
import { toast, watchPage } from "./helpers";

/**
 * «Ekranlarga moslash» (backend 0bcf0a5 renditions): a saved photo's 4:5 and square crops are set
 * in a dialog of two keyboard-operable croppers and saved at once (`PUT …/renditions/`), without
 * touching the editor's unsaved edits. Mock mode only: the demo serum (product 1) has a product
 * box and a studio scene; the mock answers with the backend's rules and keeps nothing, so the
 * spec needs no cleanup. In api mode it is skipped (it would write crops to the shared database).
 */

const PRODUCT_PATH = "/admin/products/1";
const NAME = 'input[name="texts.uz.name"]';
const IMAGE = join(__dirname, "..", "public", "mock", "banner-night.png");

async function openEditor(page: Page) {
  await page.goto(PRODUCT_PATH);
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  const mock = await page.getByText("Demo ma’lumotlar").first().isVisible();
  test.skip(!mock, "mock mode only (api mode would write crops to the shared database)");
}

const tiles = (page: Page) => page.locator('[data-field="images"] li');

async function openMenu(page: Page, index: number) {
  await tiles(page)
    .nth(index)
    .getByRole("button", { name: /tartibni o‘zgartirish$/ })
    .click();
}

test("fit a photo to the screens with the keyboard; unsaved edits survive", async ({ page }) => {
  const watch = watchPage(page);
  await openEditor(page);

  // The studio scene already has both shapes: its badges say so.
  await expect(tiles(page).nth(1).locator('[data-badge="source"]')).toHaveText("Studiya");
  await expect(tiles(page).nth(1).locator('[data-badge="renditions"]')).toHaveText("4:5 · 1:1");
  await expect(tiles(page).nth(0).locator("[data-badge]")).toHaveCount(0);

  // An unsaved edit the dialog must not lose.
  const name = page.locator(NAME);
  await expect(name).not.toHaveValue("");
  const edited = `${await name.inputValue()} (yangi)`;
  await name.fill(edited);

  await openMenu(page, 0);
  await page.getByRole("menuitem", { name: "Ekranlarga moslash" }).click();
  const dialog = page.getByRole("dialog", { name: "Ekranlarga moslash" });
  await expect(dialog).toBeVisible();
  const square = dialog.getByRole("group", { name: "Kvadrat kesim" });
  const portrait = dialog.getByRole("group", { name: "4:5 kesim" });
  await expect(square).toBeVisible();
  await expect(portrait).toBeVisible();
  // Nothing touched yet: nothing to save.
  await expect(dialog.getByRole("button", { name: "Saqlash" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  // Zoom in with +, then move down with the arrows: the crop follows the keyboard.
  const before = await square.getAttribute("data-crop");
  await square.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  const zoomed = await square.getAttribute("data-crop");
  expect(zoomed).not.toBe(before);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Shift+ArrowRight");
  const moved = (await square.getAttribute("data-crop"))!.split(",").map(Number);
  const start = zoomed!.split(",").map(Number);
  expect(moved[1]).toBeGreaterThan(start[1]!);
  expect(moved[0]).toBeGreaterThan(start[0]!);
  // The slider zooms too and is labelled.
  await expect(
    dialog.getByRole("slider", { name: "Kvadrat kesim: yaqinlashtirish" }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Ekran kesimlari saqlandi")).toBeVisible();
  await expect(dialog).toBeHidden();

  // The tile shows its new shape; the unsaved name is still in the form.
  await expect(tiles(page).nth(0).locator('[data-badge="renditions"]')).toHaveText("1:1");
  await expect(name).toHaveValue(edited);

  // Opening again starts from the stored crop.
  await openMenu(page, 0);
  await page.getByRole("menuitem", { name: "Ekranlarga moslash" }).click();
  await expect(dialog.getByText("Saqlangan: qo‘lda kesilgan")).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Kvadrat kesim" })).toHaveAttribute(
    "data-crop",
    moved.map((value) => value.toFixed(4)).join(","),
  );
  // «Avtomatik» on the portrait and the square moved once more, saved together (the mock answers
  // against its fixtures, which never change: each save names both shapes here).
  await dialog.getByRole("group", { name: "Kvadrat kesim" }).focus();
  await page.keyboard.press("ArrowUp");
  await dialog
    .locator('[data-shape="portrait"]')
    .getByRole("button", { name: "Avtomatik" })
    .click();
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog).toBeHidden();
  await expect(tiles(page).nth(0).locator('[data-badge="renditions"]')).toHaveText("4:5 · 1:1");

  // The product save keeps the name and the shapes (no phantom image steps).
  await page.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Mahsulot saqlandi"));
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
  await expect(name).toHaveValue(edited);
  await expect(tiles(page).nth(0).locator('[data-badge="renditions"]')).toHaveText("4:5 · 1:1");
  watch.assertClean();
});

test("a photo not saved yet cannot be fitted until «Hozir saqlash» saves it", async ({ page }) => {
  await openEditor(page);
  await page.locator('[data-field="images"] input[type="file"]').setInputFiles(IMAGE);
  const count = await tiles(page).count();
  // The new tile sits before the upload button (the last item).
  await openMenu(page, count - 2);
  const item = page.getByRole("menuitem", { name: /Ekranlarga moslash/ });
  await expect(item).toHaveAttribute("aria-disabled", "true");
  await expect(item).toContainText("Avval saqlang");
  await page.keyboard.press("Escape");

  // The tile and the card say it is not saved, with a save button right there.
  const fresh = tiles(page).nth(count - 2);
  await expect(fresh.locator('[data-badge="unsaved"]')).toHaveText("Saqlanmagan");
  const notice = page.locator('[data-notice="unsaved-images"]');
  await expect(notice).toContainText("1 ta yangi rasm hali saqlanmagan");
  // The new photo carries all three alt texts: the save is not refused with "undefined" errors.
  await notice.getByRole("button", { name: "Hozir saqlash" }).click();
  await saveAnyway(page, toast(page, "Mahsulot saqlandi"));
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
  await expect(page.getByText(/undefined/)).toHaveCount(0);
  await expect(notice).toHaveCount(0);
  await expect(
    tiles(page)
      .nth(count - 2)
      .locator('[data-badge="unsaved"]'),
  ).toHaveCount(0);
  await openMenu(page, count - 2);
  await expect(page.getByRole("menuitem", { name: /Ekranlarga moslash/ })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("the dialog stacks its croppers on a phone and fits the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page);
  await openMenu(page, 0);
  await page.getByRole("menuitem", { name: "Ekranlarga moslash" }).click();
  const dialog = page.getByRole("dialog", { name: "Ekranlarga moslash" });
  const portrait = await dialog.getByRole("group", { name: "4:5 kesim" }).boundingBox();
  const square = await dialog.getByRole("group", { name: "Kvadrat kesim" }).boundingBox();
  expect(square!.y).toBeGreaterThan(portrait!.y + portrait!.height - 1);
  expect(square!.x + square!.width).toBeLessThanOrEqual(390);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("the croppers follow the mouse: drag, wheel and the zoom slider", async ({ page }) => {
  await openEditor(page);
  await openMenu(page, 0);
  await page.getByRole("menuitem", { name: "Ekranlarga moslash" }).click();
  const dialog = page.getByRole("dialog", { name: "Ekranlarga moslash" });
  const square = dialog.getByRole("group", { name: "Kvadrat kesim" });
  const crop = async () => (await square.getAttribute("data-crop"))!;

  // Wheel up zooms in around the pointer.
  const box = (await square.boundingBox())!;
  const start = await crop();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -300);
  await expect(square).not.toHaveAttribute("data-crop", start);

  // Dragging the photo left moves the crop right.
  const zoomed = (await crop()).split(",").map(Number);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 40, { steps: 6 });
  await page.mouse.up();
  const dragged = (await crop()).split(",").map(Number);
  expect(dragged[0]).toBeGreaterThan(zoomed[0]!);
  expect(dragged[1]).toBeGreaterThan(zoomed[1]!);

  // The slider sets the zoom.
  const beforeSlider = await crop();
  await dialog.getByRole("slider", { name: "Kvadrat kesim: yaqinlashtirish" }).fill("1");
  await expect(square).not.toHaveAttribute("data-crop", beforeSlider);
  await expect(dialog.getByRole("button", { name: "Saqlash", exact: true })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
