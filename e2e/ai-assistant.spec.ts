import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  BACKEND_DIR,
  restoreProductContent,
  setAssistantEnabled,
  setProductColumn,
  snapshotProductContent,
  type ProductContentSnapshot,
} from "./backend-shell";
import { saveAnyway } from "./catalog-helpers";
import { toast, watchPage } from "./helpers";

/**
 * The AI assistant of the product editor (admin contract §2.19). Runs in both data modes:
 * mock (the demo's deterministic assistant, nothing saved) and api (a local backend with
 * `AI_MODE=fake`, whose answers are `[fake] <key>`). In api mode the spec switches the assistant
 * on and snapshots product 1 through the backend shell (`E2E_BACKEND_DIR`), and puts both back.
 * The concurrent-edit and failure specs need the shell; they are skipped in mock mode.
 */

const PRODUCT_ID = 1;
const PRODUCT_PATH = `/admin/products/${PRODUCT_ID}`;
const TARGET = "texts.uz.short_description";

let mock = false;
let wasEnabled: boolean | null = null;
let snapshot: ProductContentSnapshot | null = null;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(PRODUCT_PATH);
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  mock = await page.getByText("Demo ma’lumotlar").first().isVisible();
  await page.close();
  if (!mock && BACKEND_DIR) {
    wasEnabled = setAssistantEnabled(true);
    snapshot = snapshotProductContent(PRODUCT_ID);
  }
});

test.afterAll(() => {
  if (!BACKEND_DIR || mock) return;
  if (snapshot) restoreProductContent(PRODUCT_ID, snapshot);
  if (wasEnabled !== null) setAssistantEnabled(wasEnabled);
});

test.afterEach(() => {
  // Each spec starts from the seed's product (a passing apply wrote to it).
  if (BACKEND_DIR && !mock && snapshot) restoreProductContent(PRODUCT_ID, snapshot);
});

const assistantButton = (page: Page) =>
  page.getByRole("button", { name: /^AI (yordamchi|ishlamoqda|takliflari)/ });
const dialog = (page: Page) => page.getByRole("dialog", { name: "AI yordamchi" });
const row = (page: Page, key: string) => dialog(page).locator(`li[data-key="${key}"]`);

async function openEditor(page: Page) {
  await page.goto(PRODUCT_PATH);
  await page.evaluate(() => sessionStorage.clear());
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  const button = assistantButton(page);
  if (!(await button.isVisible())) {
    test.skip(true, "the assistant is off (api mode needs E2E_BACKEND_DIR to switch it on)");
  }
  return button;
}

async function generate(page: Page) {
  await assistantButton(page).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Takliflar olish" }).click();
}

/** Every language tab of the review, then every row: keep only `keep` ticked. */
async function keepOnly(page: Page, keep: ReadonlyArray<string>) {
  const tabs = dialog(page).getByRole("radiogroup", { name: "Takliflar tili" }).getByRole("radio");
  const count = Math.max(1, await tabs.count());
  for (let index = 0; index < count; index += 1) {
    if ((await tabs.count()) > 0) await tabs.nth(index).check();
    const rows = dialog(page).locator("li[data-key]");
    for (const item of await rows.all()) {
      const key = await item.getAttribute("data-key");
      const box: Locator = item.getByRole("checkbox");
      if (keep.includes(key!)) await box.check();
      else if (await box.isChecked()) await box.uncheck();
    }
  }
}

async function showLanguage(page: Page, language: RegExp) {
  const tabs = dialog(page).getByRole("radiogroup", { name: "Takliflar tili" });
  if (await tabs.isVisible()) await tabs.getByRole("radio", { name: language }).check();
}

test("fill missing → review → apply only the chosen, edited suggestion", async ({ page }) => {
  const watch = watchPage(page);
  await openEditor(page);
  await generate(page);
  await expect(dialog(page).locator("[data-assistant-review]")).toBeVisible();
  await expect(row(page, TARGET)).toBeVisible();
  // Only empty fields are suggested: the Uzbek name is filled in the seed.
  await expect(row(page, "texts.uz.name")).toHaveCount(0);
  // One toggle clears / ticks every row of the language shown; each suggestion names its field.
  await showLanguage(page, /O‘zbekcha|UZ/);
  const boxes = dialog(page).locator("li[data-key]").getByRole("checkbox");
  await dialog(page).getByRole("button", { name: "Belgilarni olib tashlash" }).click();
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await dialog(page).getByRole("button", { name: "Hammasini tanlash" }).click();
  for (const box of await boxes.all()) await expect(box).toBeChecked();
  await expect(
    row(page, TARGET).getByRole("textbox", { name: /^Taklif: Qisqa tavsif/ }),
  ).toBeVisible();
  await keepOnly(page, [TARGET]);
  await showLanguage(page, /O‘zbekcha|UZ/);
  // Letters only: a number the product data does not hold is refused by the claims check.
  const value = `e2e qisqa tavsif ${Math.random()
    .toString(36)
    .replace(/[^a-z]/g, "")
    .slice(0, 8)}`;
  await row(page, TARGET).getByRole("textbox").fill(value);
  await dialog(page).getByRole("button", { name: "Tanlanganlarni qo‘llash (1)" }).click();
  await expect(toast(page, "Takliflar qo‘llandi")).toBeVisible();
  await expect(dialog(page)).toBeHidden();
  const field = page.locator('textarea[name="texts.uz.shortDescription"]');
  await expect(field).toHaveValue(value);
  // Applied on the server: nothing is left unsaved (no leave confirmation).
  await page.getByRole("link", { name: "Bekor qilish" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  if (!mock) {
    await page.goto(PRODUCT_PATH);
    await expect(page.locator('textarea[name="texts.uz.shortDescription"]')).toHaveValue(value);
  }
  watch.assertClean();
});

test("the short description and photo alt texts save with the editor", async ({ page }) => {
  await page.goto(PRODUCT_PATH);
  const short = page.locator('textarea[name="texts.uz.shortDescription"]');
  await short.fill("Yengil namlantiruvchi serum");
  await page.locator('[role="tab"][id$="-alt-tab-ru"]').click();
  const alt = page.locator('input[name="images.0.alt.ru"]');
  await alt.fill("Флакон сыворотки");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Mahsulot saqlandi"));
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
  if (mock) return;
  await page.goto(PRODUCT_PATH);
  await expect(page.locator('textarea[name="texts.uz.shortDescription"]')).toHaveValue(
    "Yengil namlantiruvchi serum",
  );
  await page.locator('[role="tab"][id$="-alt-tab-ru"]').click();
  await expect(page.locator('input[name="images.0.alt.ru"]')).toHaveValue("Флакон сыворотки");
});

test("a field with an unsaved edit cannot be applied; the job survives a closed dialog", async ({
  page,
}) => {
  await openEditor(page);
  const field = page.locator('textarea[name="texts.uz.shortDescription"]');
  await field.fill("qo‘lda yozilgan");
  await generate(page);
  await expect(dialog(page).getByText(/Takliflar tayyorlanmoqda|ta taklif/)).toBeVisible();
  // Close while it works (mock) or right after (api, eager worker): the editor stays usable.
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(assistantButton(page)).toHaveText(/AI takliflari tayyor/);
  await assistantButton(page).click();
  await showLanguage(page, /O‘zbekcha|UZ/);
  await expect(row(page, TARGET)).toContainText("saqlanmagan tahriringiz bor");
  await expect(row(page, TARGET).getByRole("checkbox")).not.toBeChecked();
  await dialog(page).getByRole("button", { name: "Bekor qilish" }).click();
  await expect(toast(page, "Takliflar bekor qilindi")).toBeVisible();
  await expect(field).toHaveValue("qo‘lda yozilgan");
  await expect(assistantButton(page)).toHaveText("AI yordamchi");
});

test("improve needs chosen fields; the goal is offered", async ({ page }) => {
  await openEditor(page);
  await assistantButton(page).click();
  await dialog(page).getByRole("radio", { name: "Yaxshilash" }).check();
  const generateButton = dialog(page).getByRole("button", { name: "Takliflar olish" });
  await expect(generateButton).toHaveAttribute("aria-disabled", "true");
  await expect(dialog(page).getByText("Maqsad")).toBeVisible();
  await dialog(page).getByRole("checkbox", { name: "Tavsif · O‘zbekcha" }).check();
  await expect(generateButton).not.toHaveAttribute("aria-disabled", "true");
  await generateButton.click();
  await expect(row(page, "texts.uz.description")).toBeVisible();
  await expect(row(page, "texts.uz.description")).toContainText("Hozirgi");
  await dialog(page).getByRole("button", { name: "Bekor qilish" }).click();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the dialog fits 390 px and the review buttons stay reachable", async ({ page }) => {
    await openEditor(page);
    await generate(page);
    await expect(dialog(page).locator("[data-assistant-review]")).toBeVisible();
    const apply = dialog(page).getByRole("button", { name: /Tanlanganlarni qo‘llash/ });
    await expect(apply).toBeInViewport();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await dialog(page).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await dialog(page).getByRole("button", { name: "Bekor qilish" }).click();
    await expect(dialog(page)).toBeHidden();
  });
});

test.describe("against the backend", () => {
  test.skip(() => mock || !BACKEND_DIR, "api mode with E2E_BACKEND_DIR only");

  test("a value changed meanwhile is reported, not overwritten", async ({ page }) => {
    await openEditor(page);
    await generate(page);
    const key = "texts.ru.short_description";
    await expect(dialog(page).locator("[data-assistant-review]")).toBeVisible();
    await showLanguage(page, /Русский|RU/);
    await expect(row(page, key)).toBeVisible();
    setProductColumn(PRODUCT_ID, "short_description_ru", "e2e boshqa joyda");
    await keepOnly(page, [key, TARGET]);
    await dialog(page).getByRole("button", { name: "Tanlanganlarni qo‘llash (2)" }).click();
    await expect(dialog(page).getByText("Takliflar qo‘llandi")).toBeVisible();
    await expect(dialog(page).locator("[data-conflicts]")).toContainText("Qisqa tavsif · Ruscha");
    await dialog(page).getByRole("button", { name: "Yopish" }).click();
    expect(snapshotProductContent(PRODUCT_ID).product.short_description_ru).toBe(
      "e2e boshqa joyda",
    );
  });

  test("a provider failure is shown in words, and can be retried", async ({ page }) => {
    setProductColumn(PRODUCT_ID, "name_uz", "Gialuron kislotali serum [fake-unavailable]");
    await openEditor(page);
    await generate(page);
    await expect(dialog(page).getByText("Takliflar olinmadi")).toBeVisible();
    await expect(dialog(page).getByRole("button", { name: "Qayta urinish" })).toBeVisible();
    await expect(dialog(page)).not.toContainText("provider_unavailable");
  });
});
