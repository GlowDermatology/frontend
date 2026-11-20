import { expect, test, type Page } from "@playwright/test";

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
 * The AI assistant of the product editor (admin contract §2.19): the AI writes into the form, the
 * admin reviews the highlighted text in place and saves the product as usual. Runs in both data
 * modes: mock (the demo's deterministic assistant) and api (a local backend with `AI_MODE=fake`,
 * whose answers are `[fake] <key>`). In api mode the spec switches the assistant on and snapshots
 * product 1 through the backend shell (`E2E_BACKEND_DIR`), and puts both back. The failure spec
 * needs the shell; it is skipped in mock mode.
 */

const PRODUCT_ID = 1;
const PRODUCT_PATH = `/admin/products/${PRODUCT_ID}`;
const SHORT = 'textarea[name="texts.uz.shortDescription"]';

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
  // Each spec starts from the seed's product (a passing save wrote to it).
  if (BACKEND_DIR && !mock && snapshot) restoreProductContent(PRODUCT_ID, snapshot);
});

const menuButton = (page: Page) => page.getByRole("button", { name: /^AI (yordamchi|yozmoqda)/ });
const fieldButton = (page: Page, key: string) => page.locator(`button[data-ai-field="${key}"]`);
const note = (page: Page, key: string) => page.locator(`[data-ai-note="${key}"]`);

async function openEditor(page: Page) {
  await page.goto(PRODUCT_PATH);
  await page.evaluate(() => sessionStorage.clear());
  await expect(page.getByRole("heading", { name: "Mahsulotni tahrirlash" })).toBeVisible();
  if (!(await menuButton(page).isVisible())) {
    test.skip(true, "the assistant is off (api mode needs E2E_BACKEND_DIR to switch it on)");
  }
}

async function runMenu(page: Page, item: string) {
  await menuButton(page).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${item}`) }).click();
}

test("one field's ✨ writes into the form; undo, then save as usual", async ({ page }) => {
  const watch = watchPage(page);
  await openEditor(page);
  const field = page.locator(SHORT);
  await expect(field).toHaveValue("");
  const button = fieldButton(page, "texts.uz.short_description");
  await expect(button).toHaveAccessibleName("AI yozadi: Qisqa tavsif");
  await button.click();
  await expect(note(page, "texts.uz.short_description")).toContainText(
    "AI matni — tekshiring va saqlang",
  );
  await expect(field).not.toHaveValue("");
  // The language tab says where the AI wrote.
  await expect(page.locator('[role="tab"][data-ai-marked][id$="-tab-uz"]').first()).toBeVisible();
  // «Undo» restores what was there.
  await note(page, "texts.uz.short_description")
    .getByRole("button", { name: "Avvalgidek qaytarish" })
    .click();
  await expect(field).toHaveValue("");
  await expect(note(page, "texts.uz.short_description")).toHaveCount(0);
  // Again, then the ordinary save keeps it.
  await button.click();
  await expect(note(page, "texts.uz.short_description")).toBeVisible();
  const value = await field.inputValue();
  expect(value.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Mahsulot saqlandi"));
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
  await expect(note(page, "texts.uz.short_description")).toHaveCount(0);
  if (!mock) {
    await page.goto(PRODUCT_PATH);
    await expect(page.locator(SHORT)).toHaveValue(value);
  }
  watch.assertClean();
});

test("the AI works on unsaved edits: a placeholder counts as empty", async ({ page }) => {
  await openEditor(page);
  const field = page.locator(SHORT);
  await field.fill("Test");
  const button = fieldButton(page, "texts.uz.short_description");
  // «Test» is a placeholder: the button still offers to write the text.
  await expect(button).toHaveAccessibleName("AI yozadi: Qisqa tavsif");
  await button.click();
  await expect(note(page, "texts.uz.short_description")).toBeVisible();
  await expect(field).not.toHaveValue("Test");
  await note(page, "texts.uz.short_description")
    .getByRole("button", { name: "Avvalgidek qaytarish" })
    .click();
  await expect(field).toHaveValue("Test");
});

test("«Fill empty fields» fills several fields and «Undo all» restores them", async ({ page }) => {
  await openEditor(page);
  await runMenu(page, "Bo‘sh maydonlarni to‘ldirish");
  const banner = page.locator('[data-assistant-banner="filled"]');
  await expect(banner).toContainText("ta maydonni to‘ldirdi");
  await expect(page.locator(SHORT)).not.toHaveValue("");
  await banner.getByRole("button", { name: "Hammasini bekor qilish" }).click();
  await expect(page.locator(SHORT)).toHaveValue("");
  await expect(page.locator("[data-ai-note]")).toHaveCount(0);
});

test("«Improve all texts» reports every field in plain words", async ({ page }) => {
  await openEditor(page);
  await runMenu(page, "Barcha matnlarni yaxshilash");
  const banner = page.locator("[data-assistant-banner]");
  await expect(banner).toBeVisible();
  await expect(banner).not.toContainText(/unchanged|skipped|rejected|_/);
});

test("a name empty in every language must be written first", async ({ page }) => {
  await openEditor(page);
  await page.locator('input[name="texts.uz.name"]').fill("");
  for (const language of ["ru", "en"]) {
    await page.locator(`[role="tab"][id$="-tab-${language}"]`).first().click();
    await page.locator(`input[name="texts.${language}.name"]`).fill("");
  }
  const button = fieldButton(page, "texts.en.name");
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await menuButton(page).click();
  await expect(page.getByRole("menuitem", { name: /Bo‘sh maydonlarni to‘ldirish/ })).toContainText(
    "Avval mahsulot nomini kamida bitta tilda kiriting",
  );
  await page.keyboard.press("Escape");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu and the field note fit 390 px", async ({ page }) => {
    await openEditor(page);
    await fieldButton(page, "texts.uz.short_description").click();
    await expect(note(page, "texts.uz.short_description")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await menuButton(page).click();
    const menu = page.getByRole("menu");
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
  });
});

test.describe("against the backend", () => {
  test.skip(() => mock || !BACKEND_DIR, "api mode with E2E_BACKEND_DIR only");

  test("a provider failure is shown in words, and can be retried", async ({ page }) => {
    setProductColumn(PRODUCT_ID, "name_uz", "Gialuron kislotali serum [fake-unavailable]");
    await openEditor(page);
    await fieldButton(page, "texts.uz.short_description").click();
    const failed = toast(page, "AI matn yoza olmadi");
    await expect(failed).toBeVisible();
    await expect(failed.getByRole("button", { name: "Qayta urinish" })).toBeVisible();
    await expect(failed).not.toContainText("provider_unavailable");
  });
});
