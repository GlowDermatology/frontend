import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * The public storefront against a running frontend in api mode and a seeded
 * backend: home → catalog (search with the Uzbek apostrophe) → product →
 * language switch to the same product, plus axe (WCAG 2.x A/AA) and no
 * horizontal overflow at 390 and 1440 px.
 */

const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function axe(page: Page) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const result = await (
      window as unknown as {
        axe: {
          run: (
            o: unknown,
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: unknown }> }> }>;
        };
      }
    ).axe.run({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
    return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  });
}

test("browse home → catalog → product → switch language", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$|:\d+$/);

  await page
    .getByRole("navigation", { name: "Asosiy menyu" })
    .getByRole("link", { name: "Katalog" })
    .click();
  await expect(page).toHaveURL(/\/katalog$/);
  await expect(page.getByRole("heading", { level: 1, name: "Katalog" })).toBeVisible();

  // The Uzbek o‘ mark typed as an ASCII apostrophe still finds "ko‘pik".
  await page.getByRole("searchbox").fill("ko'pik");
  await page.getByRole("button", { name: "Qidirish" }).click();
  await expect(page).toHaveURL(/q=ko%27pik|q=ko'pik/);
  await expect(page.getByText(/bo‘yicha \d+ ta mahsulot/)).toBeVisible();
  const first = page.getByRole("main").getByRole("heading", { level: 2 }).getByRole("link").first();
  const name = (await first.textContent())?.trim() ?? "";
  expect(name.toLowerCase()).toMatch(/pik/);
  await first.click();

  await expect(page).toHaveURL(/\/mahsulotlar\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(/so‘m/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Savatga qo‘shish|Hozircha mavjud emas/ }),
  ).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join("")).toContain('"@type":"Product"');
  expect(ld.join("")).toContain('"priceCurrency":"UZS"');
  const segment = new URL(page.url()).pathname.split("/").pop();

  await page.getByRole("link", { name: "Русский" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/ru/products/${segment}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    "href",
    new RegExp(`/mahsulotlar/${segment}$`),
  );
});

test("legacy numeric URLs and private pages", async ({ page, request }) => {
  const response = await request.get("/mahsulotlar/1", { maxRedirects: 0 });
  // 301 to the slug once the API sends slugs (B-W1); until then the id URL is canonical.
  expect([200, 301]).toContain(response.status());
  await page.goto("/savat");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  // Private pages rely on noindex, not on robots.txt (they must stay fetchable).
  expect(robots).not.toContain("Disallow: /savat");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/sitemaps/products-uz.xml");
});

for (const width of [390, 1440]) {
  test(`axe and no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const paths = [
      "/",
      "/katalog",
      "/mahsulotlar/1",
      "/ru/specialists",
      "/en/services",
      "/shartlar",
    ];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${path} overflows at ${width}px`).toBe(false);
      expect(await axe(page), `${path} at ${width}px`).toEqual([]);
    }
  });
}
