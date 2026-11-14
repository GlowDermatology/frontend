import { expect, test } from "@playwright/test";

import { addFirstProduct, randomPhone, ready, signUp } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test("abandoned payment → cart recovery → same order retry → edit without duplicate items", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Simulate the provider error locally, without contacting Click or moving money.
  await page.route("https://my.click.uz/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Payment provider unavailable</h1>",
    }),
  );
  await signUp(page, randomPhone(), "Cart Recovery Test");
  const product = await addFirstProduct(page);
  await page.goto("/savat");
  await page.getByRole("link", { name: "Rasmiylashtirish", exact: true }).click();
  await ready(page);
  await page.getByRole("button", { name: "Buyurtma berish va to‘lash" }).click();
  await page.waitForURL((url) => url.hostname === "my.click.uz" || url.searchParams.has("sandbox"));

  await page.goBack();
  // The Back path and a direct checkout link both recover through the cart.
  await page.waitForURL(/\/savat$/);
  const saved = page.getByRole("region", { name: "To‘lov kutilmoqda", exact: true });
  await expect(saved.getByText(product, { exact: true })).toBeVisible();
  await expect(page.getByText("Savat hozircha bo‘sh", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/cart-recovery-pending.png", fullPage: true });
  const orderLink = saved.getByRole("link", { name: /Buyurtma tafsilotlari/ });
  const orderPath = await orderLink.getAttribute("href");
  await saved.getByRole("button", { name: "To‘lovni davom ettirish" }).click();
  await page.waitForURL((url) => url.hostname === "my.click.uz" || url.searchParams.has("sandbox"));
  await page.goBack();
  await expect(orderLink).toHaveAttribute("href", orderPath!);

  // The same product added again remains separate until Edit merges by max quantity, not sum.
  await addFirstProduct(page);
  await page.goto("/rasmiylashtirish");
  await page.waitForURL(/\/savat$/);
  await saved.getByRole("button", { name: "Mahsulotlarni tahrirlash" }).click();
  await expect(saved).toHaveCount(0);
  await expect(page.locator("output").first()).toHaveText("1");
  await expect(page.getByRole("link", { name: "Rasmiylashtirish", exact: true })).toBeVisible();
  await page.getByRole("button", { name: `${product}ni savatdan olib tashlash` }).click();
  await expect(page.getByText("Savat hozircha bo‘sh", { exact: true })).toBeVisible();
});
