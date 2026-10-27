import { expect, test } from "@playwright/test";
import { join } from "node:path";

import { BACKEND_DIR, deleteCatalogRows } from "./backend-shell";
import { API_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";

/**
 * Category images (gap ADM-5.1) and banner URL links (gap X-BANNER-URL),
 * contract §2.4, §2.5. Each spec creates its own `e2e-…` category or
 * `e2e …` banner and deletes it from the UI; the backend shell removes a
 * leftover of a failed run.
 */

const IMAGE = join(__dirname, "..", "public", "mock", "banner-night.png");
const SLUG_PREFIX = "e2e-kat-";
const TITLE_PREFIX = "e2e banner";

test.afterEach(() => {
  if (BACKEND_DIR) deleteCatalogRows(SLUG_PREFIX, TITLE_PREFIX);
});

test("a category gets an image, shows its thumbnail, loses it and is deleted", async ({ page }) => {
  const watcher = watchPage(page);
  const slug = `${SLUG_PREFIX}${Date.now()}`;
  await page.goto("/admin/categories");
  await expect(heading(page)).toHaveText("Kategoriyalar");
  await page.getByRole("button", { name: "Kategoriya qo‘shish" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Yangi kategoriya" });
  await dialog.getByLabel("Nomi (o‘zbekcha)").fill(`E2E kategoriya ${slug.slice(-5)}`);
  await dialog.getByLabel("Slug").fill(slug);
  await dialog.locator('input[type="file"]').setInputFiles(IMAGE);
  await expect(dialog.getByRole("img", { name: "Kategoriya rasmi" })).toBeVisible();
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Kategoriya qo‘shildi")).toBeVisible();

  const row = page.locator("tr").filter({ hasText: slug });
  await expect(row.locator("img")).toHaveAttribute("src", /categories/);
  await page.reload();
  await expect(row.locator("img")).toHaveAttribute("src", /categories/);

  // Remove the image.
  await row.getByRole("button", { name: /— tahrirlash$/ }).click();
  const edit = page.getByRole("dialog", { name: "Kategoriyani tahrirlash" });
  await edit.getByRole("button", { name: "Rasmni olib tashlash" }).click();
  await expect(edit.getByText("Rasm saqlanganda olib tashlanadi.")).toBeVisible();
  await edit.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Kategoriya saqlandi")).toBeVisible();
  await expect(row.locator("img")).toHaveCount(0);

  // A wrong file type is refused before the round trip.
  await row.getByRole("button", { name: /— tahrirlash$/ }).click();
  await edit.locator('input[type="file"]').setInputFiles({
    name: "a.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(edit.getByRole("alert")).toHaveText("Faqat JPEG, PNG yoki WebP rasm.");
  await edit.getByRole("button", { name: "Bekor qilish" }).click();

  await row.getByRole("button", { name: /— o‘chirish$/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "O‘chirish" }).click();
  await expect(toast(page, "Kategoriya o‘chirildi")).toBeVisible();
  await expect(row).toHaveCount(0);
  watcher.assertClean();
});

test("a banner links to an https page and the app's banner list carries it", async ({ page }) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} ${Date.now()}`;
  const url = `https://glowderma.uz/aksiya/e2e-${Date.now()}`;
  await page.goto("/admin/banners");
  await expect(heading(page)).toHaveText("Bannerlar");
  await page
    .getByRole("button", { name: /Banner qo‘shish/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Yangi banner" });
  await dialog.locator('input[type="file"]').setInputFiles(IMAGE);
  await dialog.getByLabel("Sarlavha (o‘zbekcha)").fill(title);
  await dialog.getByRole("radio", { name: "Havola (URL)" }).check();
  await dialog.getByRole("textbox", { name: "Havola (URL)" }).fill("http://glowderma.uz/aksiya");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog.getByText("Havolani https:// bilan to‘liq kiriting.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Havola (URL)" }).fill(url);
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Banner qo‘shildi")).toBeVisible();

  const row = page.locator("tr").filter({ hasText: title });
  await expect(row).toContainText(url);
  await page.reload();
  await expect(row).toContainText(url);

  if (API_URL) {
    const response = await page.request.get(`${API_URL}/api/v1/catalog/banners/`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const list = (Array.isArray(body) ? body : (body.results ?? [])) as Array<{
      title: string;
      link: { kind: string; url: string | null };
    }>;
    expect(list.find((b) => b.title === title)?.link).toMatchObject({ kind: "url", url });
  }

  await row.getByRole("button", { name: /— o‘chirish$/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "O‘chirish" }).click();
  await expect(row).toHaveCount(0);
  watcher.assertClean();
});
