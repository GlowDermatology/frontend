import { expect, test } from "@playwright/test";

test("the products CSV export downloads an authenticated, BOM-prefixed file", async ({ page }) => {
  await page.goto("/admin/products");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Eksport/ }).click();
  await page.getByRole("menuitem", { name: /CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^mahsulotlar.*\.csv$/);
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  expect(body.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  expect(body.toString("utf8").split("\r\n").length).toBeGreaterThan(2);
});
