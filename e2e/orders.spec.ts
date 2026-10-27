import { expect, test } from "@playwright/test";

import { cancelOrderThroughUi, heading, listedOrderIds, toast, watchPage } from "./helpers";

/**
 * Order actions against the seeded backend (contract §2.2). Each test takes
 * an order the seed still has in the right state (never a design order) and
 * is skipped with a reason once the seed has none left: reset the dataset
 * with `seed_demo --reset`.
 */

/** The §5.1 lines a Click refund can show right after a cancel (the fake Click settles at once). */
const CLICK_REFUND_LINES = [
  "Qaytarish so‘raldi",
  "Qaytarilmoqda",
  "Qaytarildi",
  "Qaytarib bo‘lmadi",
  "Holat noma’lum · tekshiring",
  "Mijozga qo‘lda to‘lang, so‘ng «Qaytarildi» deb belgilang",
];

test("cancelling a paid order requests the refund and words it by provider", async ({ page }) => {
  const watcher = watchPage(page);
  const list = "/admin/orders?status=processing&period=all";
  // A Payme refund is manual (M2 §5.1 line); fall back to Click once the seed has no Payme order.
  const payme = await listedOrderIds(page, list, "Payme");
  const ids = payme.length > 0 ? payme : await listedOrderIds(page, list);
  test.skip(ids.length === 0, "the seed has no processing order left to cancel");
  const id = ids.at(-1)!;
  const reason = `e2e bekor qilish ${Date.now()}`;

  await cancelOrderThroughUi(page, id, reason);
  await expect(page.locator("h1:visible").locator("..")).toContainText("Bekor qilindi");
  const history = page.locator('[aria-labelledby="order-history-title"]');
  await expect(history.getByRole("listitem").first()).toContainText("Bekor qilindi");
  await expect(history.getByRole("listitem").first()).toContainText(reason);

  const paymentCard = page.locator('[aria-labelledby="order-payment-title"]');
  // The newest refund's §5.1 line, next to the "Qaytarish" badge.
  const refundLine = paymentCard
    .locator("p")
    .filter({ has: page.getByText("Qaytarish", { exact: true }) })
    .locator("span")
    .first();
  if (payme.length > 0) {
    await expect(refundLine).toHaveText("Payme kabinetida qaytarish kerak");
  } else {
    expect(CLICK_REFUND_LINES).toContain((await refundLine.innerText()).trim());
  }
  // The payment stays paid until the refund settles (§7 item 3); a settled Click one reads "Qaytarilgan".
  await expect(paymentCard).toContainText(/To‘langan|Qaytarilgan/);

  // The cancellation is the server's, not local state.
  await page.reload();
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
  await expect(history).toContainText(reason);
  await expect(page.getByRole("button", { name: "Bekor qilish" })).toHaveCount(0);
  watcher.assertClean();
});

test("an order handed to the courier is marked delivered from the status menu", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const ids = await listedOrderIds(page, "/admin/orders?status=handed_to_courier&period=all");
  test.skip(ids.length === 0, "the seed has no order with the courier left");
  const id = ids.at(-1)!;

  await page.goto(`/admin/orders/${id}`);
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
  await page.getByRole("button", { name: /Holatni o‘zgartirish/ }).click();
  await page.getByRole("menuitem", { name: /Yetkazildi/ }).click();
  // ADM-14.1: the irreversible transition is confirmed first.
  const confirm = page.getByRole("alertdialog", {
    name: "Holatni «Yetkazildi» ga o‘zgartirasizmi?",
  });
  await confirm.getByRole("button", { name: "Holatni o‘zgartirish" }).click();
  await expect(confirm).toBeHidden();
  await expect(toast(page, "Holat yangilandi")).toBeVisible();
  const history = page.locator('[aria-labelledby="order-history-title"]');
  await expect(history.getByRole("listitem").first()).toContainText("Yetkazildi");
  await expect(history.getByRole("listitem").first()).toContainText("holat qo‘lda o‘zgartirildi");

  await page.reload();
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
  await expect(page.locator("h1:visible").locator("..")).toContainText("Yetkazildi");
  // Delivered is final: no transition, no cancel.
  await expect(page.getByRole("button", { name: "Bekor qilish" })).toHaveCount(0);
  watcher.assertClean();
});

test("a failed BTS hand-off is retried and the parcel is created", async ({ page }) => {
  const watcher = watchPage(page);
  // No shipment filter on orders/: the failed hand-offs are processing delivery orders (§2.2).
  await page.goto("/admin/orders?status=processing&fulfilment=delivery&period=all");
  await expect(heading(page)).toHaveText("Buyurtmalar");
  const failed = page.locator("table tbody tr").filter({ hasText: "Yuborilmadi" });
  await expect(
    page.locator("table tbody tr").first().or(page.getByText("Buyurtma topilmadi")),
  ).toBeVisible();
  test.skip((await failed.count()) === 0, "the seed has no failed BTS hand-off left");
  const id = Number((await failed.first().locator("td").first().innerText()).trim());

  await page.goto(`/admin/orders/${id}`);
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
  const shipmentCard = page.locator('[aria-labelledby="order-shipment-title"]');
  await expect(shipmentCard).toContainText("Yuborilmadi");
  await page.getByRole("button", { name: "BTS ga yuborish" }).click();
  // 202: the screen polls until the outbox created the parcel (§7 item 5).
  await expect(toast(page, /BTS buyurtmasi yaratildi|BTS ga yuborildi/)).toBeVisible({
    timeout: 45_000,
  });
  await expect(shipmentCard).toContainText("BTS raqami", { timeout: 45_000 });
  await expect(page.getByRole("button", { name: "BTS ga yuborish" })).toHaveCount(0);

  await page.reload();
  await expect(shipmentCard).toContainText("BTS raqami");
  watcher.assertClean();
});
