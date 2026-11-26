import { expect, test, type Page } from "@playwright/test";

import { saveAnyway } from "./catalog-helpers";
import { toast, watchPage } from "./helpers";

/**
 * Product scenes (admin contract §2.20) in the product editor: «Sahna yaratish» on a saved photo
 * (template → generate → review → add to the gallery), the failure and acknowledgement paths, and
 * «AI bilan moslash» in the renditions dialog. Mock mode only: the demo's jobs go queued →
 * running → succeeded on the first two polls (template `marble` fails, `spa` draws part of the
 * product), every start is a new job and nothing is persisted, so the spec re-runs on the same
 * server. In api mode it is skipped (it would add images to the shared database and needs the
 * scene worker).
 */

const PRODUCT_PATH = "/admin/products/1";
const NAME = 'input[name="texts.uz.name"]';

async function openEditor(page: Page) {
  await page.goto(PRODUCT_PATH);
  await page.evaluate(() => sessionStorage.clear());
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  const mock = await page.getByText("Demo ma’lumotlar").first().isVisible();
  test.skip(!mock, "mock mode only (api mode would add images to the shared database)");
}

const tiles = (page: Page) => page.locator('[data-field="images"] li');
const dialog = (page: Page) => page.getByRole("dialog", { name: "Sahna yaratish" });
const view = (page: Page) => dialog(page).locator("[data-scene-view]");

async function openScene(page: Page, index = 0) {
  await tiles(page)
    .nth(index)
    .getByRole("button", { name: /tartibni o‘zgartirish$/ })
    .click();
  await page.getByRole("menuitem", { name: "Sahna yaratish" }).click();
  await expect(dialog(page)).toBeVisible();
}

async function generate(page: Page, template: string, kind?: string) {
  if (kind) await dialog(page).getByRole("radio", { name: kind, exact: true }).check();
  await dialog(page)
    .getByRole("radio", { name: new RegExp(`^${template}`) })
    .click();
  await dialog(page).getByRole("button", { name: "Yaratish" }).click();
}

test("a studio scene becomes the main photo; unsaved edits survive", async ({ page }) => {
  const watch = watchPage(page);
  await openEditor(page);
  const name = page.locator(NAME);
  await expect(name).not.toHaveValue("");
  const edited = `${await name.inputValue()} (sahna)`;
  await name.fill(edited);
  const before = await tiles(page).count();

  await openScene(page);
  // Nothing picked: «Yaratish» says what to do.
  await expect(dialog(page).getByRole("button", { name: "Yaratish" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await generate(page, "Oq studiya");
  await expect(dialog(page).getByText("AI ishlamoqda…")).toBeVisible();
  await expect(view(page)).toHaveAttribute("data-scene-view", "review");
  await expect(dialog(page).locator('[data-preview="square"] img')).toBeVisible();
  await dialog(page).getByRole("radio", { name: "Oldin", exact: true }).check();
  await dialog(page).getByRole("radio", { name: "Keyin", exact: true }).check();

  await dialog(page).getByLabel("Asosiy rasm qilish").check();
  await dialog(page).getByRole("button", { name: "Galereyaga qo‘shish" }).click();
  await expect(toast(page, "Sahna galereyaga qo‘shildi")).toBeVisible();
  await expect(dialog(page)).toBeHidden();

  // The new photo is first (the main one), a studio scene with both shapes; the name is kept.
  await expect(tiles(page)).toHaveCount(before + 1);
  const first = tiles(page).nth(0);
  await expect(first.locator('[data-badge="source"]')).toHaveText("Studiya");
  await expect(first.locator('[data-badge="renditions"]')).toHaveText("4:5 · 1:1");
  await expect(first.getByText("ASOSIY")).toBeVisible();
  await expect(name).toHaveValue(edited);

  // The product save keeps both: no upload or delete of the scene photo.
  await page.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Mahsulot saqlandi"));
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
  await expect(name).toHaveValue(edited);
  await expect(tiles(page).nth(0).locator('[data-badge="source"]')).toHaveText("Studiya");
  await expect(tiles(page)).toHaveCount(before + 1);
  watch.assertClean();
});

test("a failed scene shows the server's message and suggests a new photo", async ({ page }) => {
  await openEditor(page);
  await openScene(page);
  await generate(page, "Marmar");
  await expect(view(page)).toHaveAttribute("data-scene-view", "failed");
  const alert = dialog(page).getByRole("alert");
  await expect(alert).toContainText("Sahna yaratilmadi");
  await expect(alert).toContainText("Mahsulot rasmda to‘liq ko‘rinmayapti");
  await expect(alert).toContainText("Mahsulotni to‘liq va qo‘lsiz qayta suratga oling.");
  // Back to the templates.
  await dialog(page).getByRole("button", { name: "Shablon" }).click();
  await expect(view(page)).toHaveAttribute("data-scene-view", "idle");
});

test("an AI scene that drew part of the product must be checked; the job outlives a close", async ({
  page,
}) => {
  await openEditor(page);
  await openScene(page);
  await generate(page, "Spa toshlari", "AI sahna");
  // Closed while it works, opened again: the same job comes back.
  await dialog(page).getByRole("button", { name: "Yopish" }).click();
  await expect(dialog(page)).toBeHidden();
  await openScene(page);
  await expect(view(page)).toHaveAttribute("data-scene-view", "review");
  await expect(dialog(page).getByText("AI chizgan joylar pushti rangda")).toBeVisible();
  await expect(dialog(page).getByText("Qo‘l olib tashlandi.")).toBeVisible();
  const accept = dialog(page).getByRole("button", { name: "Galereyaga qo‘shish" });
  await expect(accept).toHaveAttribute("aria-disabled", "true");
  await dialog(page).getByLabel("Belgilangan joylarni tekshirdim").check();
  await expect(accept).not.toHaveAttribute("aria-disabled", "true");
  // «Boshqa variant»: discarded and generated again with the same template.
  await dialog(page).getByRole("button", { name: "Boshqa variant" }).click();
  await expect(view(page)).toHaveAttribute("data-scene-view", "review");
  await expect(accept).toHaveAttribute("aria-disabled", "true");
  await dialog(page).getByRole("button", { name: "Bekor qilish" }).click();
  await expect(dialog(page)).toBeHidden();
});

test("«AI bilan moslash» loads the AI's crops into the croppers", async ({ page }) => {
  await openEditor(page);
  await tiles(page)
    .nth(0)
    .getByRole("button", { name: /tartibni o‘zgartirish$/ })
    .click();
  await page.getByRole("menuitem", { name: "Ekranlarga moslash" }).click();
  const fit = page.getByRole("dialog", { name: "Ekranlarga moslash" });
  const portrait = fit.getByRole("group", { name: "4:5 kesim" });
  const start = await portrait.getAttribute("data-crop");
  const save = fit.getByRole("button", { name: "Saqlash", exact: true });
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await fit.getByRole("button", { name: "AI bilan moslash" }).click();
  await expect(fit.getByText("AI taklifi yuklandi")).toBeVisible();
  await expect(portrait).not.toHaveAttribute("data-crop", start!);
  await expect(save).not.toHaveAttribute("aria-disabled", "true");
  // Accepted as it is: the photo gets both shapes.
  await fit.getByRole("button", { name: "AI taklifini o‘zgarishsiz saqlash" }).click();
  await expect(fit).toBeHidden();
  await expect(tiles(page).nth(0).locator('[data-badge="renditions"]')).toHaveText("4:5 · 1:1");
});
