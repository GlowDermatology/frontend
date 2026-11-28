import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * Product photos on the storefront (api mode, seeded backend): the product page's full-screen
 * viewer (labelled «Увеличить» chip → the whole photo, slider by arrows, keys, thumbnails and
 * swipe, click-to-zoom with its own labelled button, Esc back to the page) and the home page's
 * cards (photos filling a 4:5 frame; products and categories 4 a row on a desktop, 3 on a tablet,
 * 2 on a phone).
 */

const PRODUCT = "/ru/products/gialuron-kislotali-serum";
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

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
    ).axe.run(document.querySelector("[data-product-viewer]"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  });
}

test("the product page opens its photos full screen: slider, zoom, back with Esc", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PRODUCT);
  // The way in says what it does: a «Увеличить» chip on the photo (the whole photo is the button).
  const trigger = page.getByRole("button", { name: "Увеличить: Фото 1 из 3" });
  await expect(trigger).toContainText("Увеличить");
  const viewer = page.getByRole("dialog", { name: "Фотографии товара на весь экран" });
  // A click before the page hydrates does nothing yet (a cold dev server): retry until it opens.
  await expect(async () => {
    await trigger.click();
    await expect(viewer).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await expect(viewer.getByText("1 / 3")).toBeVisible();
  await expect(viewer.locator("[data-viewer-hint]")).toHaveText("Нажмите на фото, чтобы увеличить");
  // The whole original photo, not a card's crop.
  const shown = viewer.locator("[data-viewer-stage] img");
  await expect(shown).toHaveClass(/object-contain/);

  // The slider: buttons, keys (wrapping round), thumbnails.
  await viewer.getByRole("button", { name: "Следующее фото" }).click();
  await expect(viewer.getByText("2 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("3 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("1 / 3")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByText("3 / 3")).toBeVisible();
  const second = viewer.getByRole("button", { name: "Фото 2 из 3" });
  await second.click();
  await expect(viewer.getByText("2 / 3")).toBeVisible();
  await expect(second).toHaveAttribute("aria-current", "true");

  // A swipe to the left is the next photo.
  const stage = viewer.locator("[data-viewer-stage]");
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(viewer.getByText("3 / 3")).toBeVisible();

  // Zoom: a labelled button, or a click on the photo; the hint follows.
  const zoom = viewer.locator("[data-viewer-zoom]");
  await expect(zoom).toHaveText("Увеличить");
  await zoom.click();
  await expect(zoom).toHaveAttribute("aria-pressed", "true");
  await expect(zoom).toHaveText("Уменьшить");
  await expect(viewer.locator("[data-viewer-hint]")).toContainText("нажмите, чтобы уменьшить");
  await expect(shown).toHaveAttribute("style", /scale\(2\.2\)/);
  await stage.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(zoom).toHaveAttribute("aria-pressed", "false");
  // Zoomed in, a drag looks around instead of changing the photo.
  await stage.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(viewer.getByText("3 / 3")).toBeVisible();

  expect(await axeViolations(page)).toEqual([]);

  // Esc closes it and returns to the photo it was opened from.
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(page.getByRole("button", { name: "Увеличить: Фото 1 из 3" })).toBeFocused();
});

test("the viewer on a phone: the chip, a tap to zoom, the close button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PRODUCT);
  const viewer = page.getByRole("dialog", { name: "Фотографии товара на весь экран" });
  await expect(async () => {
    await page.getByRole("button", { name: "Увеличить: Фото 1 из 3" }).click();
    await expect(viewer).toBeVisible({ timeout: 2_000 });
  }).toPass();
  const close = viewer.getByRole("button", { name: "Закрыть" });
  const closeBox = (await close.boundingBox())!;
  expect(closeBox.width).toBeGreaterThanOrEqual(44); // a comfortable tap target
  expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(390);
  await close.click();
  await expect(viewer).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

async function firstRowColumns(
  page: Page,
): Promise<{ columns: number; ratio: number; fit: string }> {
  const grid = page.locator('ul:has(> li article:has-text("so‘m"))').first();
  await grid.scrollIntoViewIfNeeded();
  return grid.evaluate((list) => {
    const items = Array.from(list.children) as HTMLElement[];
    const top = items[0]!.getBoundingClientRect().top;
    const columns = items.filter(
      (item) => Math.abs(item.getBoundingClientRect().top - top) < 2,
    ).length;
    const frame = items[0]!.querySelector("img")!.parentElement!.getBoundingClientRect();
    const fit = getComputedStyle(items[0]!.querySelector("img")!).objectFit;
    return { columns, ratio: frame.width / frame.height, fit };
  });
}

test("home cards: 4 a row on a desktop, 3 on a tablet, 2 on a phone; the photo fills a 4:5 frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const desktop = await firstRowColumns(page);
  expect(desktop.columns).toBe(4);
  expect(desktop.ratio).toBeCloseTo(0.8, 1);
  expect(desktop.fit).toBe("cover");

  // «Nimadan boshlaymiz?» categories keep the same rhythm (they were 5 a row, smaller than products).
  const categories = page.locator('section[aria-labelledby="categories-title"] ul').first();
  const categoryColumns = await categories.evaluate((list) => {
    const items = Array.from(list.children) as HTMLElement[];
    const top = items[0]!.getBoundingClientRect().top;
    return items.filter((item) => Math.abs(item.getBoundingClientRect().top - top) < 2).length;
  });
  expect(categoryColumns).toBe(4);

  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto("/");
  expect((await firstRowColumns(page)).columns).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const phone = await firstRowColumns(page);
  expect(phone.columns).toBe(2);
  expect(phone.fit).toBe("cover");
});
