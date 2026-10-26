import { expect, test, type Page } from "@playwright/test";

import {
  BACKEND_DIR,
  dropClickPaydoc,
  setFakeClickScenario,
  type FakeClickScenario,
} from "./backend-shell";
import { cancelOrderThroughUi, heading, listedOrderIds, toast, watchPage } from "./helpers";

/**
 * Refund operations of the payments board against the seeded backend
 * (contract §2.12, §7 item 18). A Payme refund is manual (`manual_required`,
 * M2 §5.1): the spec resolves one the board lists under "Harakat kerak", and
 * creates one first by cancelling a Payme order when there is none.
 */

test("a manual Payme refund is marked returned from the payments board", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto("/admin/payments?refund=needs_action");
  await expect(heading(page)).toHaveText("To‘lovlar");
  const rows = page.locator("table tbody tr");
  await expect(rows.first().or(page.getByText("To‘lov topilmadi"))).toBeVisible();
  const manual = rows.filter({ hasText: "Payme kabinetida qaytarish kerak" });

  let orderId: number;
  if ((await manual.count()) > 0) {
    orderId = Number((await manual.first().getByRole("link").first().innerText()).replace("№", ""));
  } else {
    const ids = await listedOrderIds(page, "/admin/orders?status=processing&period=all", "Payme");
    test.skip(ids.length === 0, "no manual refund and no Payme order left to cancel");
    orderId = ids.at(-1)!;
    await cancelOrderThroughUi(page, orderId, `e2e qaytarish ${Date.now()}`);
  }

  await page.goto(`/admin/payments?q=${orderId}`);
  await expect(heading(page)).toHaveText("To‘lovlar");
  const row = page.locator("table tbody tr").filter({ hasText: `№${orderId}` });
  await expect(row).toContainText("Payme kabinetida qaytarish kerak");
  const trigger = row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` });
  await trigger.click();
  await page.getByRole("menuitem", { name: /^Qaytarildi deb belgilash/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Qaytarish bajarildimi?" });
  await expect(dialog).toContainText("Payme kabinetida");
  await dialog.getByRole("button", { name: "Qaytarildi deb belgilash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toBeVisible();
  await expect(row).toContainText("Qaytarildi");
  await expect(row).toContainText("Qaytarilgan");
  // A settled refund offers no operation: the row has no menu any more.
  await expect(row.getByRole("button", { name: /Qaytarish amallari/ })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("table tbody tr").filter({ hasText: `№${orderId}` })).toContainText(
    "Qaytarilgan",
  );
  watcher.assertClean();
});

/**
 * The fake Click of a refund that failed while Click still holds the money.
 * `status` is forced: the fake remembers reversals per process, across
 * reseeds, and a cancel whose status check answers "reversed" closes the
 * refund at once.
 */
const STILL_PAID: FakeClickScenario = { refund: "failed", status: "paid" };

/**
 * A failed Click refund (§7 item 18, M2) the spec owns: the seed's two
 * (№10100, №10175) are left to the Click-down spec and to staff, so the spec
 * arranges one — the newest processing Click order gets the `STILL_PAID`
 * fake Click scenario through the backend shell (`e2e/backend-shell.ts`,
 * needs `E2E_BACKEND_DIR`) and is cancelled from the UI; the fake Click
 * rejects the refund at once. Answers the payments row of that order.
 */
async function failedClickRefund(page: Page) {
  test.skip(
    !BACKEND_DIR,
    "E2E_BACKEND_DIR is not set: no way to make the fake Click fail a refund",
  );
  const ids = await listedOrderIds(page, "/admin/orders?status=processing&period=all", "Click");
  test.skip(ids.length === 0, "no processing Click order left to cancel");
  const orderId = ids[0]!;
  setFakeClickScenario(orderId, STILL_PAID);
  await cancelOrderThroughUi(page, orderId, `e2e Click qaytarish ${Date.now()}`);

  await page.goto(`/admin/payments?q=${orderId}`);
  await expect(heading(page)).toHaveText("To‘lovlar");
  const row = page.locator("table tbody tr").filter({ hasText: `№${orderId}` });
  await expect(row).toContainText("Qaytarib bo‘lmadi");
  return { orderId, row };
}

/** Server Action POSTs of the page (the `Next-Action` header), counted from now on. */
function countActions(page: Page): () => number {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) count += 1;
  });
  return () => count;
}

test("Yakunlash on a refund Click still holds: Enter twice sends once, the payout waits for its checkbox", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const { orderId, row } = await failedClickRefund(page);

  await row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` }).click();
  await page.getByRole("menuitem", { name: /^Yakunlash/ }).click();
  const close = page.getByRole("alertdialog", { name: "Qaytarishni yakunlaysizmi?" });
  const yakunlash = close.getByRole("button", { name: "Yakunlash" });
  // Enter, Enter on the same button (finding 1): only the close is sent.
  const actions = countActions(page);
  await yakunlash.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");

  const payout = page.getByRole("alertdialog", { name: "Mijozga qo‘lda to‘landimi?" });
  await expect(payout).toContainText("Click to‘lovni qaytarmagan");
  const payoutButton = payout.getByRole("button", { name: "Qo‘lda to‘landi" });
  await expect(payoutButton).toBeDisabled();
  await expect(payout.getByRole("alert")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  expect(actions()).toBe(1);
  await expect(payout).toBeVisible();
  await expect(row).toContainText("Qaytarib bo‘lmadi");

  await payout.getByRole("checkbox", { name: /qo‘lda to‘ladim$/ }).check();
  await expect(payoutButton).toBeEnabled();
  await payoutButton.click();
  await expect(payout).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toBeVisible();
  expect(actions()).toBe(2);
  await expect(row).toContainText("Qaytarildi");

  await page.reload();
  await expect(page.locator("table tbody tr").filter({ hasText: `№${orderId}` })).toContainText(
    "Qaytarildi",
  );
  watcher.assertClean();
});

test("Yakunlash closes a refund Click reversed without a manual payout", async ({ page }) => {
  const watcher = watchPage(page);
  const { orderId, row } = await failedClickRefund(page);
  // Click reversed the payment after the refund failed: its status check answers "reversed".
  setFakeClickScenario(orderId, { refund: "failed", status: "reversed" });

  await row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` }).click();
  await page.getByRole("menuitem", { name: /^Yakunlash/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Qaytarishni yakunlaysizmi?" });
  await dialog.getByRole("button", { name: "Yakunlash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toContainText(
    "Click pulni mijozga qaytardi — qo‘lda to‘lash kerak emas.",
  );
  await expect(row).toContainText("Qaytarildi");
  await expect(row.getByRole("button", { name: /Qaytarish amallari/ })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("table tbody tr").filter({ hasText: `№${orderId}` })).toContainText(
    "Qaytarildi",
  );
  watcher.assertClean();
});

/** The newest processing Click order, its Click payment id removed (needs `E2E_BACKEND_DIR`). */
async function clickOrderWithoutPaydoc(page: Page): Promise<number> {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: no way to remove a payment's Click id");
  const ids = await listedOrderIds(page, "/admin/orders?status=processing&period=all", "Click");
  test.skip(ids.length === 0, "no processing Click order left to cancel");
  const orderId = ids[0]!;
  dropClickPaydoc(orderId);
  return orderId;
}

test("a manual Click refund says why on the board and is marked paid by hand (M3 manual_reason)", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const orderId = await clickOrderWithoutPaydoc(page);
  // Without Click's payment id the refund is manual from the start (`no_paydoc`).
  await cancelOrderThroughUi(page, orderId, `e2e Click qo‘lda ${Date.now()}`);

  await page.goto(`/admin/payments?q=${orderId}`);
  await expect(heading(page)).toHaveText("To‘lovlar");
  const row = page.locator("table tbody tr").filter({ hasText: `№${orderId}` });
  await expect(row).toContainText("Mijozga qo‘lda to‘lang, so‘ng «Qaytarildi» deb belgilang");
  await expect(row).toContainText("Click to‘lov raqami yo‘q · qo‘lda to‘lanadi");
  await expect(row).not.toContainText("Payme");

  await row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` }).click();
  await page.getByRole("menuitem", { name: /^Qaytarildi deb belgilash/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Qaytarish bajarildimi?" });
  await expect(dialog).toContainText("qo‘lda to‘langanini tekshirdingizmi?");
  await dialog.getByRole("button", { name: "Qaytarildi deb belgilash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toBeVisible();
  await expect(row).toContainText("Qaytarildi");

  await page.reload();
  await expect(page.locator("table tbody tr").filter({ hasText: `№${orderId}` })).toContainText(
    "Qaytarilgan",
  );
  watcher.assertClean();
});

test("Yakunlash on a failed refund without a Click payment id leads to the payout with its own message", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const { orderId, row } = await failedClickRefund(page);
  // The payment loses Click's id after the refund failed: Click cannot be asked any more.
  dropClickPaydoc(orderId);

  await row.getByRole("button", { name: `Qaytarish amallari: №${orderId}` }).click();
  await page.getByRole("menuitem", { name: /^Yakunlash/ }).click();
  const close = page.getByRole("alertdialog", { name: "Qaytarishni yakunlaysizmi?" });
  await close.getByRole("button", { name: "Yakunlash" }).click();

  const payout = page.getByRole("alertdialog", { name: "Mijozga qo‘lda to‘landimi?" });
  await expect(payout.getByRole("alert")).toContainText("Bu to‘lovda Click to‘lov raqami yo‘q");
  await expect(payout).not.toContainText("Click to‘lovni qaytarmagan");
  await expect(payout.getByRole("alert")).toBeFocused();
  const payoutButton = payout.getByRole("button", { name: "Qo‘lda to‘landi" });
  await expect(payoutButton).toBeDisabled();
  await payout.getByRole("checkbox", { name: /qo‘lda to‘ladim$/ }).check();
  await payoutButton.click();
  await expect(payout).toBeHidden();
  await expect(toast(page, "Qaytarish yakunlandi")).toBeVisible();
  await expect(row).toContainText("Qaytarildi");
  watcher.assertClean();
});

test("Yakunlash while Click does not answer keeps the dialog open (the seed's №10175)", async ({
  page,
}) => {
  const watcher = watchPage(page);
  await page.goto("/admin/payments?q=10175");
  await expect(heading(page)).toHaveText("To‘lovlar");
  const row = page.locator("table tbody tr").filter({ hasText: "№10175" });
  await expect(row.or(page.getByText("To‘lov topilmadi"))).toBeVisible();
  // textContent: the badge's innerText is upper-cased by CSS.
  const failed =
    (await row.count()) > 0 && ((await row.textContent()) ?? "").includes("Qaytarib bo‘lmadi");
  test.skip(!failed, "the seed's failed Click refund of №10175 is not there (reseed the backend)");

  await row.getByRole("button", { name: "Qaytarish amallari: №10175" }).click();
  await page.getByRole("menuitem", { name: /^Yakunlash/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Qaytarishni yakunlaysizmi?" });
  await dialog.getByRole("button", { name: "Yakunlash" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Click javob bermadi");
  await expect(dialog.getByRole("button", { name: "Yakunlash" })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(row).toContainText("Qaytarib bo‘lmadi");
  watcher.assertClean();
});
