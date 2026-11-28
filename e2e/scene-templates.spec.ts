import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { toast, watchPage } from "./helpers";

/**
 * The scene template editor (admin contract §2.20.9) from the product's scene dialog: cards show
 * the scene alone, the pen on a card opens the editor (names, a reference picture, the scene in
 * any language, hide), «Yangi shablon» creates one, «Tavsifdan yaratish» makes the picture from
 * the text. Both data modes: the demo keeps edits for the server's lifetime; in api mode the backend
 * runs the fake AI (translation, screening, the picture) and every template made here is hidden
 * again. Names carry a run stamp, so the spec re-runs on the same server.
 */

const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const REFERENCE = path.join(__dirname, "..", "public", "mock", "scene-reference-2.webp");
const STAMP = `${Date.now() % 100000}`;

const dialog = (page: Page) => page.getByRole("dialog", { name: "Sahna yaratish" });

async function openSceneDialog(page: Page) {
  await page.goto("/admin/products/1");
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  await expect(async () => {
    await page
      .locator('[data-field="images"] li')
      .first()
      .getByRole("button", { name: /tartibni o‘zgartirish$/ })
      .click();
    await page.getByRole("menuitem", { name: "Sahna yaratish" }).click({ timeout: 2_000 });
  }).toPass();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("radio", { name: "AI sahna" }).click();
}

async function axeViolations(page: Page, selector: string) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async (scope) => {
    const result = await (
      window as unknown as {
        axe: {
          run: (
            context: unknown,
            options: unknown,
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: unknown }> }> }>;
        };
      }
    ).axe.run(document.querySelector(scope), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  }, selector);
}

test("a new template from a picture of the scene and words; then renamed and hidden", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await openSceneDialog(page);
  // Cards show the scene alone and carry the pen in their corner.
  const pens = dialog(page).locator("[data-template-edit]");
  await expect(pens.first()).toBeVisible();
  await expect(pens.first()).toHaveAccessibleName(/shablonini tahrirlash$/);

  await dialog(page).locator("[data-template-new]").click();
  const editor = page.getByRole("dialog", { name: "Yangi sahna shabloni" });
  await expect(editor).toBeVisible();
  // Nothing filled: the name and the scene are asked for.
  await editor.getByRole("button", { name: "Saqlash" }).click();
  await expect(editor.getByText(/Shablon nomini yozing/).first()).toBeVisible();

  const name = `Stol ${STAMP}`;
  await editor.getByLabel("Nomi (o‘zbekcha)").fill(name);
  await editor.locator("[data-reference-input]").setInputFiles(REFERENCE);
  await expect(editor.locator('[data-reference-preview="picture"]')).toBeVisible();
  // The picked file is drawn on a canvas (no URL made from it reaches the page).
  await expect
    .poll(() =>
      editor.locator("[data-picked-image]").evaluate((el) => (el as HTMLCanvasElement).width),
    )
    .toBeGreaterThan(0);
  await editor
    .getByLabel("Sahna tavsifi")
    .fill("oq marmar tokcha, iliq bej devor, yumshoq yorug‘lik");
  expect(await axeViolations(page, "[data-template-editor]")).toEqual([]);
  await editor.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Shablon qo‘shildi")).toBeVisible({ timeout: 30_000 });
  await expect(editor).toBeHidden();
  // The new card is listed, picked, and shows its picture.
  const card = dialog(page).getByRole("radio", { name: new RegExp(name) });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("aria-checked", "true");
  await expect(card.locator("[data-template-preview]")).toBeVisible();

  // Renamed through its pen.
  await dialog(page)
    .getByRole("button", { name: `«${name}» shablonini tahrirlash` })
    .click();
  const edit = page.getByRole("dialog", { name: "Shablonni tahrirlash" });
  await expect(edit.getByLabel("Nomi (o‘zbekcha)")).toHaveValue(name);
  await edit.getByLabel("Nomi (o‘zbekcha)").fill(`${name} oq`);
  await edit.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Shablon saqlandi")).toBeVisible({ timeout: 30_000 });
  await expect(dialog(page).getByRole("radio", { name: new RegExp(`${name} oq`) })).toBeVisible();

  // Hidden: asked first, then gone from the list.
  await dialog(page)
    .getByRole("button", { name: `«${name} oq» shablonini tahrirlash` })
    .click();
  await page
    .getByRole("dialog", { name: "Shablonni tahrirlash" })
    .getByRole("button", { name: "Ro‘yxatdan olib tashlash" })
    .click();
  const confirm = page.getByRole("alertdialog", { name: "Shablon ro‘yxatdan olib tashlansinmi?" });
  await confirm.getByRole("button", { name: "Olib tashlash" }).click();
  await expect(toast(page, "Shablon ro‘yxatdan olib tashlandi")).toBeVisible();
  await expect(dialog(page).getByRole("radio", { name: new RegExp(`${name} oq`) })).toHaveCount(0);
  watch.assertClean();
});

test("«Tavsifdan yaratish» draws the scene from the words", async ({ page }) => {
  test.setTimeout(120_000);
  await openSceneDialog(page);
  // A template of words only (in api mode the fake AI translates them).
  await dialog(page).locator("[data-template-new]").click();
  const editor = page.getByRole("dialog", { name: "Yangi sahna shabloni" });
  const name = `Ipak ${STAMP}`;
  await editor.getByLabel("Nomi (o‘zbekcha)").fill(name);
  await editor.getByLabel("Sahna tavsifi").fill("pushti ipak burmalar, iliq tong yorug‘i");
  await editor.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Shablon qo‘shildi")).toBeVisible({ timeout: 30_000 });
  const card = dialog(page).getByRole("radio", { name: new RegExp(name) });
  await expect(card.locator("[data-template-preview]")).toHaveCount(0); // words only: no picture yet

  await dialog(page)
    .getByRole("button", { name: `«${name}» shablonini tahrirlash` })
    .click();
  const edit = page.getByRole("dialog", { name: "Shablonni tahrirlash" });
  // An unsaved new text has to be saved before a picture is made from it.
  await edit.getByLabel("Sahna tavsifi").fill("boshqa matn");
  await expect(edit.getByRole("button", { name: "Tavsifdan yaratish" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await edit.getByLabel("Sahna tavsifi").fill("pushti ipak burmalar, iliq tong yorug‘i");
  await edit.getByRole("button", { name: "Tavsifdan yaratish" }).click();
  await expect(toast(page, "Shablon rasmi tayyor")).toBeVisible({ timeout: 60_000 });
  await expect(edit.locator('[data-reference-preview="picture"]')).toBeVisible();
  await edit.getByRole("button", { name: "Bekor qilish" }).click();
  await expect(card.locator("[data-template-preview]")).toBeVisible();

  // Tidy up (api mode keeps templates).
  await dialog(page)
    .getByRole("button", { name: `«${name}» shablonini tahrirlash` })
    .click();
  await page
    .getByRole("dialog", { name: "Shablonni tahrirlash" })
    .getByRole("button", { name: "Ro‘yxatdan olib tashlash" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Olib tashlash" }).click();
  await expect(toast(page, "Shablon ro‘yxatdan olib tashlandi")).toBeVisible();
});

test("a studio template edits its names only", async ({ page }) => {
  await openSceneDialog(page);
  await dialog(page).getByRole("radio", { name: "Studiya" }).click();
  await dialog(page).locator("[data-template-edit]").first().click();
  const edit = page.getByRole("dialog", { name: "Shablonni tahrirlash" });
  await expect(
    edit.getByText("Studiya shablonining ranglari ops konsolida o‘zgartiriladi."),
  ).toBeVisible();
  await expect(edit.getByLabel("Sahna tavsifi")).toHaveCount(0);
  await expect(edit.locator("[data-reference-input]")).toHaveCount(0);
  await edit.getByRole("button", { name: "Bekor qilish" }).click();
});
