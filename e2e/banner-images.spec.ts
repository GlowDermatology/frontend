import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { saveAnyway } from "./catalog-helpers";
import { heading, toast, watchPage } from "./helpers";

/**
 * «AI bilan yaratish» in the banner dialog (admin contract §2.20.8): products (1–3, the first the
 * main one) or a scene alone, an AI template or a typed scene, then the result in the app's
 * (2.15:1) and the website's (2:1) real frames with the banner's own title; «Shu rasmni
 * ishlatish» and the banner is saved with it. Runs in both data modes: the demo's jobs succeed on
 * the second poll (its product 3 fails, named); in api mode the backend makes the picture with
 * its fake image model (AI_MODE=fake, scenes and AI scenes switched on, Celery eager) and every
 * banner made here is deleted again.
 */

const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const generator = (page: Page) =>
  page.getByRole("dialog", { name: "Banner rasmini AI bilan yaratish" });
const view = (page: Page) => generator(page).locator("[data-banner-image-view]");

async function openNewBanner(page: Page, title: string) {
  await page.goto("/admin/banners");
  await page.evaluate(() => sessionStorage.clear());
  await expect(heading(page)).toHaveText("Bannerlar");
  await page
    .getByRole("button", { name: /Banner qo‘shish/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Yangi banner" });
  await dialog.getByLabel("Sarlavha (o‘zbekcha)").fill(title);
  return dialog;
}

const isDemo = async (page: Page) => page.getByText("Demo ma’lumotlar").first().isVisible();

async function addProduct(page: Page, term: string, name: RegExp) {
  const search = generator(page).getByRole("combobox", { name: "Mahsulot qidirish" });
  await search.fill(term);
  await generator(page).getByRole("option", { name }).first().click();
}

/** The first AI template card (not the typed scene). */
const firstTemplate = (page: Page) =>
  generator(page).locator('[role="radio"][data-template]:not([data-template="custom"])').first();

async function ratioOf(locator: Locator): Promise<number> {
  const box = (await locator.boundingBox())!;
  return box.width / box.height;
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const result = await (
      window as unknown as {
        axe: {
          run: (
            context: unknown,
            options: unknown,
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: unknown }> }> }>;
        };
      }
    ).axe.run(document.querySelector("[data-banner-image-view]"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  });
}

test("a banner with two products: made, judged in both frames, saved with the banner", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  const title = `Yangi kolleksiya ${Date.now() % 100000}`;
  const dialog = await openNewBanner(page, title);
  await dialog.getByRole("button", { name: "AI bilan yaratish" }).click();
  await expect(generator(page)).toBeVisible();
  await expect(view(page)).toHaveAttribute("data-banner-image-view", "idle");

  // Nothing picked: «Yaratish» says what is missing.
  const create = generator(page).getByRole("button", { name: "Yaratish" });
  await expect(create).toHaveAttribute("aria-disabled", "true");
  await addProduct(page, "serum", /serum/i);
  await addProduct(page, "SPF", /SPF/);
  const chosen = generator(page).locator("[data-banner-product]");
  await expect(chosen).toHaveCount(2);
  await expect(chosen.first()).toContainText("Asosiy");
  // The second becomes the main one.
  await chosen
    .nth(1)
    .getByRole("button", { name: /asosiy qilish$/ })
    .click();
  await expect(chosen.first()).toContainText(/SPF/);
  await expect(create).toHaveAttribute("aria-disabled", "true"); // no scene yet
  await firstTemplate(page).click();
  await expect(create).not.toHaveAttribute("aria-disabled", "true");
  await create.click();

  await expect(view(page)).toHaveAttribute("data-banner-image-view", "review", {
    timeout: 60_000,
  });
  const app = generator(page).locator('[data-banner-frame="app"]');
  const web = generator(page).locator('[data-banner-frame="web"]');
  expect(await ratioOf(app)).toBeCloseTo(2.15, 1);
  expect(await ratioOf(web)).toBeCloseTo(2, 1);
  await expect(app).toContainText(title);
  await expect(web).toContainText(title);
  await expect(generator(page).locator("[data-long-title]")).toHaveCount(0);
  // The picture itself is exactly the app's banner.
  const natural = await app.locator("img").evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return img.naturalWidth / img.naturalHeight;
  });
  expect(natural).toBeCloseTo(2.15, 1);
  expect(await axeViolations(page)).toEqual([]);

  await generator(page).getByRole("button", { name: "Shu rasmni ishlatish" }).click();
  await expect(generator(page)).toBeHidden();
  await expect(dialog.locator("[data-banner-generated]")).toContainText("AI yaratgan rasm");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Banner qo‘shildi"));
  await expect(toast(page, "Banner qo‘shildi")).toBeVisible();
  const row = page.locator("tr").filter({ hasText: title });
  await expect(row).toBeVisible();

  if (!(await isDemo(page))) {
    // Saved through the banner upload path: the list's thumbnail is the same 2.15:1 picture.
    await page.reload();
    const thumb = row.locator("img").first();
    const ratio = await thumb.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      return img.naturalWidth / img.naturalHeight;
    });
    expect(ratio).toBeCloseTo(2.15, 1);
    await row.getByRole("button", { name: /— o‘chirish$/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "O‘chirish" }).click();
    await expect(row).toHaveCount(0);
  }
  watch.assertClean();
});

test("a scene alone with a long title: the warning, «Qayta yaratish», and «Bekor qilish»", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const dialog = await openNewBanner(
    page,
    "Qishki parvarish: namlovchi kremlar va serumlar 20% chegirmada",
  );
  await dialog.getByRole("button", { name: "AI bilan yaratish" }).click();
  await generator(page).getByRole("radio", { name: "Faqat sahna" }).click();
  await expect(generator(page).locator("[data-banner-products]")).toHaveCount(0);
  await generator(page)
    .getByRole("radio", { name: /^O‘z sahnangiz/ })
    .click();
  await generator(page)
    .getByRole("textbox", { name: /Sahnani tasvirlang/ })
    .fill("Oq ipak mato, iliq tonggi yorug‘lik");
  await generator(page).getByRole("button", { name: "Yaratish" }).click();
  await expect(view(page)).toHaveAttribute("data-banner-image-view", "review", {
    timeout: 60_000,
  });
  await expect(generator(page).locator("[data-long-title]")).toBeVisible();
  const first = await view(page).getAttribute("data-banner-image-job");
  await generator(page).getByRole("button", { name: "Qayta yaratish" }).click();
  await expect(view(page)).toHaveAttribute("data-banner-image-view", "review", {
    timeout: 60_000,
  });
  await expect(view(page)).not.toHaveAttribute("data-banner-image-job", first ?? "");
  await generator(page).getByRole("button", { name: "Bekor qilish" }).click();
  await expect(generator(page)).toBeHidden();
  await expect(dialog.locator("[data-banner-generated]")).toHaveCount(0);
  // Without a picture the new banner still asks for one.
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog.getByText("Banner rasmini tanlang.").first()).toBeVisible();
});

test("a product whose photo cannot be used is named, and can be swapped (demo)", async ({
  page,
}) => {
  const dialog = await openNewBanner(page, "Toza teri");
  test.skip(!(await isDemo(page)), "the demo's product 3 fails on purpose");
  await dialog.getByRole("button", { name: "AI bilan yaratish" }).click();
  await addProduct(page, "FOAM", /ko‘pik|foam/i);
  await firstTemplate(page).click();
  await generator(page).getByRole("button", { name: "Yaratish" }).click();
  await expect(view(page)).toHaveAttribute("data-banner-image-view", "failed", { timeout: 30_000 });
  await expect(generator(page).locator("[data-failed-product]")).toContainText("mos kelmadi");
  await generator(page).getByRole("button", { name: "Boshqa mahsulot tanlash" }).click();
  await expect(view(page)).toHaveAttribute("data-banner-image-view", "idle");
  await expect(generator(page).locator("[data-banner-product]")).toHaveCount(0);
});
